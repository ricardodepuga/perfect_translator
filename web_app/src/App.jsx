import React, { useState, useEffect, useRef } from 'react';
import AudioRecorder from './components/AudioRecorder';
import TranslationView from './components/TranslationView';
import SettingsModal from './components/SettingsModal';
import { LANGUAGES, DEFAULT_VISIBLE_LANGUAGES } from './constants/languages';

function App() {
  const [history, setHistory] = useState([
    {
      original: { text: "Olá, mundo", lang: "pt" },
      pivot: { text: "Hello, world", lang: "en" },
      final: { text: "こんにちは、世界", lang: "ja" }
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState('audio');

  const wsRef = useRef(null);
  const realtimeOriginalRef = useRef('');
  const realtimeTranslationRef = useRef('');
  const [activeRealtime, setActiveRealtime] = useState(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [usePivot, setUsePivot] = useState(true);
  const [visibleLanguages, setVisibleLanguages] = useState(DEFAULT_VISIBLE_LANGUAGES);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showPivotText, setShowPivotText] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(() => localStorage.getItem('autoPlayVoice') !== 'false');
  const [audioDeviceId, setAudioDeviceId] = useState('');
  const [useRealtime, setUseRealtime] = useState(() => localStorage.getItem('useRealtime') === 'true');

  const [openAIKey, setOpenAIKey] = useState(() => localStorage.getItem('openAIKey') || '');
  const [openAIModel, setOpenAIModel] = useState(() => localStorage.getItem('openAIModel') || 'gpt-4o');

  // Sync to local storage and Backend Python
  useEffect(() => {
    localStorage.setItem('openAIKey', openAIKey);
    localStorage.setItem('openAIModel', openAIModel);
    localStorage.setItem('useRealtime', useRealtime ? 'true' : 'false');
    localStorage.setItem('autoPlayVoice', autoPlayVoice ? 'true' : 'false');

    // Sync via POST request to local Python sidecar
    fetch('http://127.0.0.1:8000/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openai_api_key: openAIKey,
        openai_model: openAIModel
      })
    }).catch(e => console.log("Backend might not be up yet: ", e));
  }, [openAIKey, openAIModel, autoPlayVoice, useRealtime]);

  // Audio Control
  const [isListening, setIsListening] = useState(false);
  const [backendError, setBackendError] = useState(null);

  const [sourceLang, setSourceLang] = useState('pt');
  const [targetLang, setTargetLang] = useState('ja');

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const addToHistory = (newItem) => {
    setHistory(prev => [newItem, ...prev].slice(0, 3));
  };

  const speakText = (text, lang) => {
    if (!('speechSynthesis' in window) || !autoPlayVoice || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  // Start WebSocket when isListening changes (only if useRealtime is true)
  useEffect(() => {
    if (isListening && useRealtime) {
      const wsUrl = `ws://127.0.0.1:8000/ws/realtime?source_lang=${sourceLang}&target_lang=${targetLang}&use_pivot=${usePivot}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        setBackendError(null);
      };
      
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            if ((msg.type === "response.audio_transcript.delta" || msg.type === "response.text.delta") && msg.delta) {
              realtimeTranslationRef.current += msg.delta;
              setActiveRealtime({
                original: { text: realtimeOriginalRef.current || "(Ouvindo...)", lang: sourceLang },
                pivot: null,
                final: { text: realtimeTranslationRef.current, lang: targetLang }
              });
            } else if (msg.type === "conversation.item.input_audio_transcription.delta") {
              realtimeOriginalRef.current += (msg.delta || "");
              setActiveRealtime({
                original: { text: realtimeOriginalRef.current || "(Ouvindo...)", lang: sourceLang },
                pivot: null,
                final: { text: realtimeTranslationRef.current, lang: targetLang }
              });
            } else if (msg.type === "conversation.item.input_audio_transcription.completed") {
              const finalTranscript = msg.transcript || realtimeOriginalRef.current;
              realtimeOriginalRef.current = finalTranscript;
              setActiveRealtime({
                original: { text: finalTranscript, lang: sourceLang },
                pivot: null,
                final: { text: realtimeTranslationRef.current, lang: targetLang }
              });
            } else if (msg.type === "input_audio_buffer.speech_started") {
               // User interrupted or started speaking. Close previous interaction.
               // Sela o texto se houver dados úteis no rascunho anterior
               if (realtimeOriginalRef.current || realtimeTranslationRef.current) {
                 setHistory(prev => {
                   const block = {
                     original: { text: realtimeOriginalRef.current, lang: sourceLang },
                     pivot: null,
                     final: { text: realtimeTranslationRef.current, lang: targetLang }
                   };
                   return [block, ...prev].slice(0, 4);
                 });
               }
               realtimeOriginalRef.current = '';
               realtimeTranslationRef.current = '';
               setActiveRealtime({
                 original: { text: "(Ouvindo...)", lang: sourceLang },
                 pivot: null,
                 final: { text: "", lang: targetLang }
               });
            } else if (msg.type === "response.done") {
               if (autoPlayVoice && realtimeTranslationRef.current && window.speechSynthesis) {
                 speakText(realtimeTranslationRef.current, targetLang);
               }
            } else if (msg.type === "error") {
            console.error("OpenAI Error:", msg.error);
            setBackendError(msg.error?.message || "Erro OpenAI Realtime");
          }
        } catch(e) {
          console.error("Erro ao processar mensagem ws:", e);
        }
      };
      
      ws.onerror = () => setBackendError("WebSocket connection failed");
      ws.onclose = () => console.log("WebSocket closed");
      
      wsRef.current = ws;
      
      return () => {
        ws.close();
        wsRef.current = null;
      };
    }
  }, [isListening, sourceLang, targetLang, useRealtime, autoPlayVoice, usePivot, speakText]);

  const handleAudioData = async (data) => {
    const isBlob = typeof data === 'object' && typeof data?.size === 'number';

    if (!isBlob) {
      // Data is a Base64 string chunk or "COMMIT"
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (data === "COMMIT") {
          wsRef.current.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
          wsRef.current.send(JSON.stringify({ type: "response.create" }));
        } else {
          wsRef.current.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: data
          }));
        }
      }
    } else {
      // Data is a Blob (WebM file)
      const formData = new FormData();
      formData.append('file', data, 'audio.webm');
      formData.append('language', sourceLang);

      try {
        setBackendError(null);
        // 1. Transcribe
        const transcribeRes = await fetch('http://127.0.0.1:8000/transcribe', {
          method: 'POST',
          body: formData
        });

        if (!transcribeRes.ok) {
          let errMessage = `Erro na transcrição: ${transcribeRes.status}`;
          try {
            const errData = await transcribeRes.json();
            if (errData && errData.detail) errMessage = errData.detail;
          } catch (e) {
            console.error(e);
          }
          throw new Error(errMessage);
        }

        const transcribeData = await transcribeRes.json();
        const text = transcribeData.text?.trim() || "";
        const lowerText = text.toLowerCase().replace(/[.\-?!,]/g, "");

        const hallucinationKeywords = [
          "e aí", "e ai", "tchau", "obrigado", "unknown",
          "silêncio", "amém", "amem", "deixe seu like", "inscreva", "canal",
          "subscreva", "vídeo", "legendas", "próxima", "ative o sininho", "ótimo", "otimo"
        ];

        const words = lowerText.split(" ").filter(w => w.trim().length > 0);
        const isHallucination = words.length > 0 && words.every(word =>
          hallucinationKeywords.some(hk => hk.includes(word) || word.includes(hk))
        );

        if (!text || isHallucination || text === "(UNKNOWN)") {
          return;
        }

        // 2. Translate
        const translateRes = await fetch('http://127.0.0.1:8000/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: transcribeData.text,
            source_lang: transcribeData.language || sourceLang,
            target_lang: targetLang,
            use_pivot: usePivot
          })
        });

        if (!translateRes.ok) {
          throw new Error(`Erro na tradução: ${translateRes.status}`);
        }

        const translateData = await translateRes.json();
        addToHistory(translateData);
        if (autoPlayVoice && translateData?.final?.text) {
          speakText(translateData.final.text, targetLang);
        }

      } catch (err) {
        console.error(err);
        setBackendError(err.message || "Falha ao comunicar com o sistema local.");
        setTimeout(() => setBackendError(null), 6000);
      }
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setBackendError(null);
      const translateRes = await fetch('http://127.0.0.1:8000/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.trim(),
          source_lang: sourceLang,
          target_lang: targetLang,
          use_pivot: usePivot
        })
      });

      if (!translateRes.ok) {
        throw new Error(`Erro na tradução: ${translateRes.status}`);
      }

      const translateData = await translateRes.json();
      addToHistory(translateData);
      setInputText('');
      if (autoPlayVoice && translateData?.final?.text) {
        speakText(translateData.final.text, targetLang);
      }
    } catch (err) {
      console.error(err);
      setBackendError(err.message || "Falha do sistema local.");
      setTimeout(() => setBackendError(null), 6000);
    }
  };

  const handleToggleListening = () => {
    setIsListening(prev => {
      const next = !prev;
      // If we are turning off the microphone, commit any floating realtime text!
      if (!next && (realtimeOriginalRef.current || realtimeTranslationRef.current)) {
        setHistory(prevHist => {
          const block = {
            original: { text: realtimeOriginalRef.current, lang: sourceLang },
            pivot: null,
            final: { text: realtimeTranslationRef.current, lang: targetLang }
          };
          return [block, ...prevHist].slice(0, 4);
        });
        realtimeOriginalRef.current = '';
        realtimeTranslationRef.current = '';
        setActiveRealtime(null);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center font-sans p-6 overflow-hidden">

      {/* Header / Controls */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm z-10">
        <h1 className="text-xl font-bold tracking-tighter">PERFECT TRANSLATOR</h1>

        <div className="flex gap-4 items-center">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="bg-gray-800 border-none rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.filter(l => visibleLanguages.includes(l.code)).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} {lang.flag}
              </option>
            ))}
          </select>

          <button 
            onClick={handleSwapLanguages} 
            className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-90 flex items-center justify-center shadow-lg"
            title="Permutar Línguas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-gray-800 border-none rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {LANGUAGES.filter(l => visibleLanguages.includes(l.code)).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} {lang.flag}
              </option>
            ))}
          </select>

          <button
            onClick={() => setMode(mode === 'audio' ? 'text' : 'audio')}
            className="text-xs uppercase tracking-wide bg-gray-700 px-3 h-8 rounded hover:bg-gray-600 flex items-center"
          >
            {mode === 'audio' ? 'Text Mode' : 'Voice Mode'}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        usePivot={usePivot}
        setUsePivot={setUsePivot}
        visibleLanguages={visibleLanguages}
        setVisibleLanguages={setVisibleLanguages}
        showOriginal={showOriginal}
        setShowOriginal={setShowOriginal}
        showPivotText={showPivotText}
        setShowPivotText={setShowPivotText}
        audioDeviceId={audioDeviceId}
        setAudioDeviceId={setAudioDeviceId}
        openAIKey={openAIKey} setOpenAIKey={setOpenAIKey}
        openAIModel={openAIModel} setOpenAIModel={setOpenAIModel}
        useRealtime={useRealtime} setUseRealtime={setUseRealtime}
        autoPlayVoice={autoPlayVoice} setAutoPlayVoice={setAutoPlayVoice}
      />

      {/* Main Content: History List */}
      <div className="w-full flex-grow flex flex-col items-center justify-start space-y-6 px-4 pb-48 pt-32 overflow-y-auto">
        
        {/* Floating Active Realtime Block */}
        {activeRealtime && isListening && (
          <div className="transition-all duration-300 w-full flex justify-center border-b-2 border-green-500/20 pb-4 shadow-[0_4px_30px_rgba(34,197,94,0.1)] rounded-xl opacity-100 scale-100 z-20 bg-gray-900/50">
            <TranslationView
              original={activeRealtime.original}
              pivot={activeRealtime.pivot}
              final={activeRealtime.final}
              showOriginal={showOriginal}
              showPivotText={showPivotText && usePivot}
            />
          </div>
        )}

        {/* Stable History List */}
        {history.map((item, index) => (
          <div
            key={index}
            className={`transition-all duration-700 w-full flex justify-center border-b border-gray-800 pb-4
                ${index === 0 && !activeRealtime ? 'opacity-100 scale-100 z-10' : ''}
                ${(index === 0 && activeRealtime) || index === 1 ? 'opacity-60 scale-95 blur-[0.5px] grayscale-[0.3] z-0' : ''}
                ${(index === 1 && activeRealtime) || index === 2 ? 'opacity-30 scale-90 blur-[1px] grayscale-[0.7] z-0' : 'opacity-30 scale-90 blur-[1px] grayscale-[0.7] z-0'}
              `}
          >
            <TranslationView
              key={`${index}-${showOriginal}-${showPivotText}`}
              original={item.original}
              pivot={item.pivot}
              final={item.final}
              showOriginal={showOriginal}
              showPivotText={showPivotText && usePivot}
            />
          </div>
        ))}
      </div>

      {/* Input Area — only shown when showOriginal is enabled */}
      {showOriginal && (
        <div className="fixed bottom-0 w-full p-8 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent">
          <div className="max-w-xl mx-auto">
            {mode === 'audio' ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <button
                  onClick={handleToggleListening}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg ${isListening
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 shadow-red-500/20'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
                    }`}
                >
                  {isListening ? (
                    <>
                      <div className="w-4 h-4 rounded bg-red-400"></div>
                      Parar Gravação
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.85V21a.75.75 0 01-1.5 0v-1.25a6.751 6.751 0 01-6-6.85v-1.5a.75.75 0 01.75-.75z" />
                      </svg>
                      Iniciar Microfone
                    </>
                  )}
                </button>
                {backendError && (
                  <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                    ⚠️ {backendError}
                  </div>
                )}
                <div className="h-8">
                  <AudioRecorder onAudioData={handleAudioData} isActive={isListening} selectedDeviceId={audioDeviceId} useRealtime={useRealtime} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type here..."
                  className="flex-grow bg-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-600 px-6 rounded-lg font-bold hover:bg-blue-500">
                  Translate
                </button>
              </form>
            )}
            {mode !== 'audio' && (
              <p className="text-center text-gray-500 text-xs mt-4">
                Press Enter to translate
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
