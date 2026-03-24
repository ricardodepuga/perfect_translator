import React from 'react';

const TranslationView = ({ original, pivot, final, showOriginal = true, showPivotText = true }) => {
    return (
        <div className="flex flex-row items-center justify-center space-x-4 w-full max-w-6xl mx-auto">

            {/* Original */}
            {showOriginal && original && (
                <>
                    <div className="flex-1 text-center transition-all duration-500">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">({original.lang})</h3>
                        <p className="text-xl md:text-2xl text-white font-light">{original.text}</p>
                    </div>
                    {/* Arrow if pivot or final follows */}
                    {((showPivotText && pivot) || final) && (
                        <div className="text-gray-600 text-2xl">→</div>
                    )}
                </>
            )}

            {/* Pivot */}
            {showPivotText && pivot && (
                <>
                    <div className="flex-1 text-center transition-all duration-500 opacity-80">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">({pivot.lang})</h3>
                        <p className="text-lg md:text-xl text-gray-300 font-light italic">"{pivot.text}"</p>
                    </div>
                    {/* Arrow if final follows */}
                    {final && (
                        <div className="text-gray-600 text-2xl">→</div>
                    )}
                </>
            )}

            {/* Final */}
            {final && (
                <div className="flex-1 text-center transition-all duration-500">
                    <h3 className="text-blue-400 text-xs uppercase tracking-widest mb-1">({final.lang})</h3>
                    <p className="text-3xl md:text-5xl text-blue-100 font-bold tracking-tight leading-tight glow-text">
                        {final.text}
                    </p>
                </div>
            )}

        </div>
    );
};

export default TranslationView;
