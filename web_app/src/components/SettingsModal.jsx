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
    useRealtime, setUseRealtime,
    autoPlayVoice, setAutoPlayVoice,
    customLogo, setCustomLogo
}) => {

    const logoInputRef = React.useRef(null);

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit to 2MB
        if (file.size > 2 * 1024 * 1024) {
            alert('Logo must be under 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setCustomLogo(ev.target.result);
        };
        reader.readAsDataURL(file);
        // Reset input so re-uploading same file triggers change
        e.target.value = '';
    };

    const handleRemoveLogo = () => {
        setCustomLogo('');
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

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


                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI API & Processing</h3>
                        
                        <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                            <div>
                                <label className="text-white font-medium block mb-1 text-sm">Audio Processing Mode</label>
                                <select 
                                    value={useRealtime ? "realtime" : "standard"} 
                                    onChange={(e) => setUseRealtime(e.target.value === "realtime")} 
                                    className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 border-none outline-none"
                                >
                                    <option value="standard">Standard Mode (Economical, Chunk Recording)</option>
                                    <option value="realtime">Real-time Mode (Higher Cost, Instant Streaming)</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                    <b>Standard Mode</b> consumes ~$0.009/min and splits speech by silence. 
                                    <b>Real-time Mode</b> guarantees instant transcription but consumes ~$0.06/min (7x more expensive).
                                </p>
                            </div>
                            <div className="pt-3 mt-3 border-t border-gray-600">
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
                                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                                style={{ backgroundColor: usePivot ? 'var(--accent)' : '#4b5563', '--tw-ring-color': 'var(--accent)' }}
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
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Visible Sections</h3>
                        <div className="space-y-2">
                            {/* Show Original */}
                            <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-lg border border-gray-700">
                                <div>
                                    <span className="text-white font-medium block">Show Input Language</span>
                                    <span className="text-xs text-gray-400">Toggle text/audio capture and the original text view.</span>
                                </div>
                                <button
                                    onClick={() => setShowOriginal(!showOriginal)}
                                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    style={{ backgroundColor: showOriginal ? 'var(--accent)' : '#4b5563', '--tw-ring-color': 'var(--accent)' }}
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
                                    <span className="text-white font-medium block">Auto-Play Voice</span>
                                    <span className="text-xs text-gray-400">Listen to the final translation out loud in the browser.</span>
                                </div>
                                <button
                                    onClick={() => setAutoPlayVoice(!autoPlayVoice)}
                                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                                    style={{ backgroundColor: autoPlayVoice ? 'var(--accent)' : '#4b5563', '--tw-ring-color': 'var(--accent)' }}
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
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Audio Device</h3>
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
                                    <option value="">System Default</option>
                                    {audioDevices.map((device) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>


                    {/* Branding / Logo Upload */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Branding</h3>
                        <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                            <label className="text-white font-medium block mb-2 text-sm">Custom Logo</label>
                            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                Upload a logo to replace the app title. The colour scheme will adapt to match your brand.
                            </p>
                            
                            {customLogo ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-auto flex items-center bg-gray-800 rounded-lg px-4 py-2">
                                        <img src={customLogo} alt="Logo" className="h-8 max-w-[160px] object-contain" />
                                    </div>
                                    <button
                                        onClick={() => logoInputRef.current?.click()}
                                        className="text-xs text-gray-300 bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Change
                                    </button>
                                    <button
                                        onClick={handleRemoveLogo}
                                        className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => logoInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-lg py-4 flex flex-col items-center gap-2 transition-colors group cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Click to upload logo (PNG, SVG, JPG)</span>
                                </button>
                            )}

                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
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
                                        ? 'border-opacity-50 bg-opacity-20'
                                        : 'bg-gray-700/20 border-gray-700 hover:border-gray-600'
                                        }`}
                                    style={visibleLanguages.includes(lang.code) ? { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 50%, transparent)' } : {}}
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleLanguages.includes(lang.code)}
                                        onChange={() => toggleLanguage(lang.code)}
                                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-2"
                                        style={{ accentColor: 'var(--accent)' }}
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
                        className="w-full text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
                        style={{ backgroundColor: 'var(--accent)', boxShadow: '0 10px 15px -3px var(--accent-glow)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
