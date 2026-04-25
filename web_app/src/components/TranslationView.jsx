import React from 'react';

const TranslationView = ({ original, pivot, final, showOriginal = true, showPivotText = true, isLatest = false }) => {
    return (
        <div className="flex flex-row items-center justify-center space-x-4 w-full max-w-7xl mx-auto">

            {/* Original */}
            {showOriginal && original && (
                <>
                    <div className="flex-1 text-center transition-all duration-500">
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-1">({original.lang})</h3>
                        <p className={`${isLatest ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'} text-white font-light`}>{original.text}</p>
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
                        <p className={`${isLatest ? 'text-xl md:text-2xl' : 'text-md md:text-lg'} text-gray-300 font-light italic`}>"{pivot.text}"</p>
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
                    <p className={`${isLatest ? 'text-5xl md:text-7xl font-extrabold' : 'text-3xl md:text-4xl font-bold'} text-blue-100 tracking-tight leading-tight glow-text`}>
                        {final.text}
                    </p>
                </div>
            )}

        </div>
    );
};

export default TranslationView;
