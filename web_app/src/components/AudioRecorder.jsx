import React, { useRef, useEffect, useState, useCallback } from 'react';

const SILENCE_THRESHOLD = 0.02;     // Increased to 0.02 to ensure fan noise is ignored
const SILENCE_DURATION_MS = 600;    // Cut in half to slice segments instantly after speech stops
const MIN_SPEECH_DURATION_MS = 150; // Reduced to 150ms to allow short words like "ok"
const MAX_SPEECH_DURATION_MS = 5000; // Force slice every 5 seconds inside continuous monologues

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
  const noiseFloorRef = useRef(0.015); // Starting baseline
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0); 
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
    noiseFloorRef.current = 0.015; // Reset noise floor
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
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            lastTTSEndTime = Date.now();
            return;
          }
          if (Date.now() - lastTTSEndTime < 500) {
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);
          const int16Buffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

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
        
        mediaRecorderRef.current = processor; 
      } else {
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
                  onAudioDataRef.current(blob); 
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

      const dataArray = new Float32Array(analyserRef.current.fftSize);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getFloatTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Adaptive noise floor logic:
        // Adjust the background noise profile slowly when we are NOT currently in the middle of speaking
        if (!isSpeakingRef.current) {
          // Weighted moving average to gently follow ambient noise
          noiseFloorRef.current = (noiseFloorRef.current * 0.95) + (rms * 0.05);
          // Never drop below an absolute floor to prevent pin-drop triggering
          noiseFloorRef.current = Math.max(0.005, noiseFloorRef.current);
        }

        // Dynamic threshold is 2.5x the ambient noise, but never less than 0.015
        const dynamicSilenceThreshold = Math.max(0.015, noiseFloorRef.current * 2.5);

        const normalizedLevel = Math.min(100, Math.max(0, (rms * 1000))); 
        setMicLevel(normalizedLevel);

        if (rms > dynamicSilenceThreshold) {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            speechStartTimeRef.current = Date.now();
            setSpeaking(true);
          } else if (!useRealtime && speechStartTimeRef.current && (Date.now() - speechStartTimeRef.current >= MAX_SPEECH_DURATION_MS)) {
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
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            isSpeakingRef.current = false;
            setSpeaking(false);
            
            if (!useRealtime) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
              }
            }
          }, SILENCE_DURATION_MS);
        }
      }, 80); 

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
          {speaking ? 'Listening...' : (listening ? 'Microphone active' : 'Starting...')}
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
