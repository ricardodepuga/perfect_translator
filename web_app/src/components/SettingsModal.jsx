import React, { useState, useEffect } from 'react';
import { LANGUAGES } from '../constants/languages';

const SettingsModal = ({
    isOpen,
    onClose,
    usePivot,
    setUsePivot,
    visibleLanguages,
    setVisibleLanguages,
    showOriginal,
    setShowOriginal,
    audioDeviceId,
    setAudioDeviceId,
    openAIKey, setOpenAIKey,
    openAIModel, setOpenAIModel,
    useRealtime, setUseRealtime,
    autoPlayVoice, setAutoPlayVoice
}) => {

    const toggleLanguage = (code) => {
        const newVisible = new Set(visibleLanguages);
        if (newVisible.has(code)) {
            if (newVisible.size > 1) { // Prevent removing the last language
                newVisible.delete(code);
            }
        } else {
            newVisible.add(code);
        }
        setVisibleLanguages(Array.from(newVisible));
    };

    // Audio device enumeration
    const [audioDevices, setAudioDevices] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchDevices = async () => {
            try {
                // Request permission first so we get device labels
                await navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => stream.getTracks().forEach(t => t.stop()));

                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                setAudioDevices(audioInputs);
            } catch (err) {
                console.error('Error enumerating audio devices:', err);
            }
        };

        fetchDevices();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 flex-1 overflow-y-auto max-h-[80vh] custom-scrollbar">

                    {/* Providers Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI API & Processing</h3>
                        
                        <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                            <div>
                                <label className="text-white font-medium block mb-1 text-sm">Modo de Processamento de Áudio</label>
                                <select 
                                    value={useRealtime ? "realtime" : "standard"} 
                                    onChange={(e) => setUseRealtime(e.target.value === "realtime")} 
                                    className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 border-none outline-none"
                                >
                                    <option value="standard">Modo Standard (Económico, Gravação por Pedaços)</option>
                                    <option value="realtime">Modo Realtime (Maior Custo, Streaming Imediato)</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                    O <b>Modo Standard</b> consome ~0.009$/min e divide a fala por silêncio. 
                                    O <b>Modo Realtime</b> garante transcrição instantânea mas consome ~0.06$/min (7x mais caro).
                                </p>
                            </div>
                            <div className="space-y-3 pt-3 mt-3 border-t border-gray-600">
                                <div>
                                    <label className="text-white font-medium block mb-1 text-sm">OpenAI API Key</label>
                                    <input 
                                        type="password" 
                                        value={openAIKey} 
                                        onChange={(e) => setOpenAIKey(e.target.value)}
                                        placeholder="sk-..." 
                                        className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 border-none outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-white font-medium block mb-1 text-sm">OpenAI Model</label>
                                    <input 
                                        type="text" 
                                        value={openAIModel} 
                                        onChange={(e) => setOpenAIModel(e.target.value)}
                                        placeholder="gpt-4o" 
                                        className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 border-none outline-none font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pivot Setting */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Translation Logic</h3>
                        <div className="flex items-center justify-between bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                            <div>
                                <span className="text-white font-medium block">Use Pivot Language (English)</span>
                                <span className="text-xs text-gray-400">Improves quality for non-English pairs, but slower/more tokens.</span>
                            </div>
                            <button
                                onClick={() => setUsePivot(!usePivot)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${usePivot ? 'bg-blue-600' : 'bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`${usePivot ? 'translate-x-6' : 'translate-x-1'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Display Options */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Secções Visíveis</h3>
                        <div className="space-y-2">
                            {/* Show Original */}
                            <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                                <div>
                                    <span className="text-white font-medium block">Mostrar Língua de Entrada</span>
                                    <span className="text-xs text-gray-400">Esconde a captura de texto/áudio e o texto original.</span>
                                </div>
                                <button
                                    onClick={() => setShowOriginal(!showOriginal)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${showOriginal ? 'bg-blue-600' : 'bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`${showOriginal ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Auto Play Voice */}
                            <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                                <div>
                                    <span className="text-white font-medium block">Leitura Automática de Voz</span>
                                    <span className="text-xs text-gray-400">Ouve a tradução final em voz alta no browser.</span>
                                </div>
                                <button
                                    onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${autoPlayVoice ? 'bg-blue-600' : 'bg-gray-600'
                                        }`}
                                >
                                    <span
                                        className={`${autoPlayVoice ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Audio Device */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dispositivo de Áudio</h3>
                        <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8M12 1a3 3 0 00-3 3v4a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                </svg>
                                <select
                                    value={audioDeviceId}
                                    onChange={(e) => setAudioDeviceId(e.target.value)}
                                    className="flex-grow bg-gray-700 border-none rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Predefinido do sistema</option>
                                    {audioDevices.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microfone ${device.deviceId.slice(0, 8)}...`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Languages Setting */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Visible Languages</h3>
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {LANGUAGES.map((lang) => (
                                <label
                                    key={lang.code}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${visibleLanguages.includes(lang.code)
                                        ? 'bg-blue-900/20 border-blue-500/50'
                                        : 'bg-gray-700/20 border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleLanguages.includes(lang.code)}
                                        onChange={() => toggleLanguage(lang.code)}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2"
                                    />
                                    <span className="ml-3 text-sm text-gray-200 font-medium flex-grow">{lang.name}</span>
                                    <span className="text-lg">{lang.flag}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
