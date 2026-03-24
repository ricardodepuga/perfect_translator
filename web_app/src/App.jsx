import React, { useState } from 'react';
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
  const [mode, setMode] = useState('audio'); // 'audio' or 'text'
  const [inputText, setInputText] = useState('');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [usePivot, setUsePivot] = useState(true);
  const [visibleLanguages, setVisibleLanguages] = useState(DEFAULT_VISIBLE_LANGUAGES);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showPivotText, setShowPivotText] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState('');

  // Audio Control
  const [isListening, setIsListening] = useState(false);

  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('ja');

  const addToHistory = (newItem) => {
    setHistory(prev => [newItem, ...prev].slice(0, 3));
  };

  const handleAudioData = async (blob) => {
    // Send to backend
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    if (sourceLang !== 'auto') formData.append('language', sourceLang);

    try {
      // 1. Transcribe
      const transcribeRes = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData
      });
      const transcribeData = await transcribeRes.json();

      const text = transcribeData.text?.trim() || "";
      if (!text || text === "(UNKNOWN)" || text.toLowerCase() === "unknown") {
          console.log("Empty or unknown audio detected. Ignoring.");
          return;
      }

      // 2. Translate

      // Auto-switch logic:
      // If detected language is same as target, swap target back to source (or default pt)
      let actualTargetLang = targetLang;
      let detectedLang = transcribeData.language;

      if (detectedLang === targetLang) {
        actualTargetLang = (sourceLang !== 'auto') ? sourceLang : 'pt';
      }

      const translateRes = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcribeData.text,
          source_lang: detectedLang,
          target_lang: actualTargetLang,
          use_pivot: usePivot
        })
      });
      const translateData = await translateRes.json();
      addToHistory(translateData);

    } catch (err) {
      console.error(err);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const translateRes = await fetch('http://localhost:8000/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          source_lang: sourceLang,
          target_lang: targetLang,
          use_pivot: usePivot
        })
      });
      const translateData = await translateRes.json();
      addToHistory(translateData);
    } catch (err) {
      console.error(err);
    }
    setInputText('');
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
            <option value="auto">Auto Detect</option>
            {LANGUAGES.filter(l => visibleLanguages.includes(l.code)).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} {lang.flag}
              </option>
            ))}
          </select>

          <span className="text-gray-500">→</span>

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
      />

      {/* Main Content: History List */}
      <div className="w-full flex-grow flex flex-col items-center justify-start space-y-6 px-4 pb-48 pt-32 overflow-y-auto">
        {history.map((item, index) => (
          <div
            key={index}
            className={`transition-all duration-700 w-full flex justify-center border-b border-gray-800 pb-4
                ${index === 0 ? 'opacity-100 scale-100 z-10' : ''}
                ${index === 1 ? 'opacity-60 scale-95 blur-[0.5px] grayscale-[0.3] z-0' : ''}
                ${index === 2 ? 'opacity-30 scale-90 blur-[1px] grayscale-[0.7] z-0' : ''}
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
                  onClick={() => setIsListening(!isListening)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg ${
                    isListening 
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
                <div className="h-8">
                  <AudioRecorder onAudioData={handleAudioData} isActive={isListening} selectedDeviceId={audioDeviceId} />
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
