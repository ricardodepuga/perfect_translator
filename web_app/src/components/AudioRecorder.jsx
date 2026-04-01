import React, { useRef, useEffect, useState, useCallback } from 'react';

const SILENCE_THRESHOLD = 0.02;     // Increased to 0.02 to ensure fan noise is ignored
const SILENCE_DURATION_MS = 600;    // Cut in half to slice segments instantly after speech stops
const MIN_SPEECH_DURATION_MS = 400; // Increased to drop millisecond clicks
const MAX_SPEECH_DURATION_MS = 6000; // Force slice every 6 seconds inside continuous monologues

const AudioRecorder = ({ onAudioData, isActive, selectedDeviceId, useRealtime }) => {
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const speechStartTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // State for the visual meter
  const onAudioDataRef = useRef(onAudioData);

  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try { 
          if (mediaRecorderRef.current.disconnect) {
             mediaRecorderRef.current.disconnect(); 
          } else if (mediaRecorderRef.current.state !== 'inactive') {
             mediaRecorderRef.current.stop();
          }
      } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    isSpeakingRef.current = false;
    chunksRef.current = [];
    setSpeaking(false);
    setListening(false);
    setMicLevel(0);
  }, []);

  const startContinuousCapture = useCallback(async () => {
    stopStream();

    try {
      const constraints = {
        audio: {
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (useRealtime) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(audioContext.destination);

        analyserRef.current = analyser;

        let lastTTSEndTime = 0;

        processor.onaudioprocess = (e) => {
          // Anti-Echo Loop: Do not stream audio back to OpenAI if the browser is currently reading TTS translations
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            lastTTSEndTime = Date.now();
            return;
          }
          // Give 500ms for physical room echo to dissipate
          if (Date.now() - lastTTSEndTime < 500) {
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array
          const int16Buffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Safe convert Int16Array to Base64 to avoid Call Stack Size limits
          const uint8Buffer = new Uint8Array(int16Buffer.buffer);
          let binary = '';
          for (let i = 0; i < uint8Buffer.byteLength; i++) {
            binary += String.fromCharCode(uint8Buffer[i]);
          }
          
          const base64Audio = btoa(binary);
          if (onAudioDataRef.current) {
            onAudioDataRef.current(base64Audio);
          }
        };
        
        mediaRecorderRef.current = processor; // Store processor reference for cleanup
      } else {
        // Standard mode: Use MediaRecorder with chunks
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        analyserRef.current = analyser;

        const startNewRecorder = () => {
          if (!streamRef.current || !streamRef.current.active) return;

          chunksRef.current = [];
          try {
            const recorder = new MediaRecorder(stream, {
              mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'
            });

            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                chunksRef.current.push(e.data);
              }
            };

            recorder.onstop = () => {
              const duration = speechStartTimeRef.current
                ? Date.now() - speechStartTimeRef.current
                : 0;

              if (chunksRef.current.length > 0 && duration >= MIN_SPEECH_DURATION_MS) {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                if (onAudioDataRef.current) {
                  onAudioDataRef.current(blob); // Passes Blob to handleAudioData
                }
              }

              chunksRef.current = [];
              speechStartTimeRef.current = null;

              if (streamRef.current && streamRef.current.active) {
                setTimeout(() => startNewRecorder(), 50);
              }
            };

            recorder.start(200);
            mediaRecorderRef.current = recorder;
          } catch (err) {
            console.error('Error creating MediaRecorder:', err);
          }
        };

        startNewRecorder();
      }

      setListening(true);

      // Volume monitoring using setInterval (more reliable than rAF for background tabs)
      const dataArray = new Float32Array(analyserRef.current.fftSize);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Update visual meter state
        const normalizedLevel = Math.min(100, Math.max(0, (rms * 1000))); 
        setMicLevel(normalizedLevel);

        if (rms > SILENCE_THRESHOLD) {
          // Speech detected
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            speechStartTimeRef.current = Date.now();
            setSpeaking(true);
          } else if (!useRealtime && speechStartTimeRef.current && (Date.now() - speechStartTimeRef.current >= MAX_SPEECH_DURATION_MS)) {
            // Only force stop in Standard Mode (MediaRecorder) to slice big segments. UseRealtime streams constantly.
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
               mediaRecorderRef.current.stop();
            }
            isSpeakingRef.current = false;
            setSpeaking(false);
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingRef.current && !silenceTimerRef.current) {
          // Silence after speech
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            isSpeakingRef.current = false;
            setSpeaking(false);
            
            if (!useRealtime) {
              // Standard Mode: Stop MediaRecorder to dispatch Blob
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }
          }, SILENCE_DURATION_MS);
        }
      }, 80); // check every 80ms

    } catch (err) {
      console.error('Error starting continuous capture:', err);
      setListening(false);
    }
  }, [selectedDeviceId, stopStream, useRealtime]);

  // Start/stop based on isActive or mode shift
  useEffect(() => {
    if (isActive) {
      startContinuousCapture();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isActive, useRealtime, startContinuousCapture, stopStream]);

  // Restart when device or mode changes while active
  useEffect(() => {
    if (isActive && listening) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startContinuousCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, useRealtime, startContinuousCapture]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <div className="flex items-center justify-center gap-3">
        <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${speaking
            ? 'bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
            : 'bg-gray-700/30'
          }`}>
          {speaking && (
            <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          )}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
            className={`w-4 h-4 transition-colors duration-300 ${speaking ? 'text-blue-400' : 'text-gray-500'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 1.5a3 3 0 013 3v4.5a3 3 0 01-6 0v-4.5a3 3 0 013-3z" />
          </svg>
        </div>
        <span className={`text-xs transition-colors duration-300 ${speaking ? 'text-blue-400' : 'text-gray-600'}`}>
          {speaking ? 'A ouvir...' : (listening ? 'Microfone ativo' : 'A iniciar...')}
        </span>
      </div>

      {/* Visual Volume / Decibel Meter */}
      {listening && (
        <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden flex items-center mt-1">
          <div 
            className={`h-full transition-all duration-75 ${speaking ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-green-500'}`}
            style={{ width: `${micLevel}%` }} 
          />
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
