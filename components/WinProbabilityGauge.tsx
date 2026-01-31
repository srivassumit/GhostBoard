import React, { useEffect, useState } from 'react';

interface WinProbabilityGaugeProps {
  original: number;
  current: number;
}

export const WinProbabilityGauge: React.FC<WinProbabilityGaugeProps> = ({ original, current }) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    // Small delay to trigger animation after mount
    const timer = setTimeout(() => {
      setAnimatedWidth(current);
    }, 100);
    return () => clearTimeout(timer);
  }, [current]);

  const delta = current - original;
  const isPositive = delta >= 0;
  
  // Determine color based on current value
  const getColor = (val: number) => {
    if (val < 30) return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]';
    if (val < 60) return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]';
  };

  const barColor = getColor(current);
  const isBigJump = delta > 15 && current > 50;

  return (
    <div className="w-full mb-6 p-4 bg-black/20 rounded-xl border border-white/5">
      <div className="flex items-center justify-between mb-3 font-orbitron">
        <div className="text-[10px] font-bold text-slate-400 tracking-widest">
          GOAL/SCORE PROBABILITY
        </div>
        <div className={`text-xs font-black flex items-center gap-2 ${
          isPositive ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta)}% DELTA
        </div>
      </div>

      {/* Main Bar Container */}
      <div className="relative h-6 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
        
        {/* Grid lines inside bar */}
        <div className="absolute inset-0 flex justify-between px-1 opacity-20 z-10 pointer-events-none">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-px h-full bg-white"></div>
          ))}
        </div>

        {/* Ghost bar for original value */}
        <div 
          className="absolute top-0 bottom-0 left-0 bg-white/10 border-r border-white/30 z-0 transition-all duration-500"
          style={{ width: `${original}%` }}
        ></div>

        {/* Animated Current Value Bar */}
        <div 
          className={`absolute top-0 bottom-0 left-0 h-full transition-all duration-1000 ease-out z-20 flex items-center justify-end px-2 ${barColor} ${isBigJump ? 'animate-pulse' : ''}`}
          style={{ width: `${animatedWidth}%` }}
        >
          <span className="text-[10px] font-black text-black font-orbitron leading-none">
            {current}%
          </span>
        </div>
      </div>

      <div className="flex justify-between mt-1 text-[9px] text-zinc-600 font-mono">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};