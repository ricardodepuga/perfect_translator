import React, { useRef, useEffect, useState, useCallback } from 'react';

const SILENCE_THRESHOLD = 0.008;    // RMS volume below which is considered silence
const SILENCE_DURATION_MS = 1200;   // How long silence must last to trigger a "segment end" (Ajustado para captar uma frase)
const MIN_SPEECH_DURATION_MS = 400; // Minimum speech duration to avoid noise-only segments

const AudioRecorder = ({ onAudioData, isActive, selectedDeviceId }) => {
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
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
  }, []);

  const startContinuousCapture = useCallback(async () => {
    stopStream();

    try {
      const constraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Web Audio API for volume analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start media recorder - always recording
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
              onAudioDataRef.current(blob);
            }

            chunksRef.current = [];
            speechStartTimeRef.current = null;

            // Restart for next segment
            if (streamRef.current && streamRef.current.active) {
              setTimeout(() => startNewRecorder(), 50);
            }
          };

          recorder.start(200); // collect chunks every 200ms
          mediaRecorderRef.current = recorder;
        } catch (err) {
          console.error('Error creating MediaRecorder:', err);
        }
      };

      startNewRecorder();
      setListening(true);

      // Volume monitoring using setInterval (more reliable than rAF for background tabs)
      const dataArray = new Float32Array(analyser.fftSize);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyser.getFloatTimeDomainData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms > SILENCE_THRESHOLD) {
          // Speech detected
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            speechStartTimeRef.current = Date.now();
            setSpeaking(true);
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

            // Stop current recorder to finalize segment
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state === 'recording') {
              recorder.stop();
            }
          }, SILENCE_DURATION_MS);
        }
      }, 80); // check every 80ms

    } catch (err) {
      console.error('Error starting continuous capture:', err);
      setListening(false);
    }
  }, [selectedDeviceId, stopStream]);

  // Start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startContinuousCapture();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isActive]);

  // Restart when device changes while active
  useEffect(() => {
    if (isActive && listening) {
      startContinuousCapture();
    }
  }, [selectedDeviceId]);

  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-2">
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
  );
};

export default AudioRecorder;
