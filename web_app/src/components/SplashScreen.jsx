import React from 'react';

const SplashScreen = ({ isVisible }) => {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
      }`}
      style={{ backgroundColor: '#030712' }}
    >
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="splash-orb splash-orb-1" />
        <div className="splash-orb splash-orb-2" />
        <div className="splash-orb splash-orb-3" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Animated icon */}
        <div className="splash-icon-ring">
          <div className="splash-icon-ring-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              className="w-10 h-10 text-blue-400 splash-icon-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364V3M3 11.25h4.5m0 0V9.75m0 1.5v1.5m6-1.5h4.5m0 0V9.75m0 1.5v1.5" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-black tracking-[-0.05em] text-white splash-title">
            PERFECT
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent"> TRANSLATOR</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium tracking-widest uppercase splash-subtitle">
            Real-time AI Translation
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="splash-loader">
            <div className="splash-loader-bar" />
          </div>
          <p className="text-xs text-gray-600 font-mono splash-status">
            Initializing translation engine...
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 opacity-30">
        <p className="text-[10px] text-gray-500 tracking-widest uppercase">Powered by OpenAI</p>
      </div>
    </div>
  );
};

export default SplashScreen;
