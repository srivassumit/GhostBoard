
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player } from '../types';

interface TacticalBoardProps {
  image: string;
  players: Player[];
  onPlayerMove: (playerId: string, x: number, y: number) => void;
  disabled?: boolean;
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({ 
  image, 
  players, 
  onPlayerMove,
  disabled = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !containerRef.current || disabled) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain to 0-100
    const constrainedX = Math.max(0, Math.min(100, x));
    const constrainedY = Math.max(0, Math.min(100, y));

    onPlayerMove(draggingId, constrainedX, constrainedY);
  }, [draggingId, onPlayerMove, disabled]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-zinc-900 overflow-hidden cyber-border rounded-lg group cursor-crosshair select-none"
    >
      {/* Background Image */}
      <img 
        src={image} 
        alt="Tactical Frame" 
        className="absolute inset-0 w-full h-full object-contain opacity-60 transition-opacity group-hover:opacity-80"
      />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #00ff80 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }} />

      {/* Players */}
      {players.map((p) => (
        <div
          key={p.id}
          onMouseDown={(e) => handleMouseDown(p.id, e)}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow ${
            disabled ? 'pointer-events-none' : ''
          }`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            zIndex: p.type === 'ball' ? 50 : 40
          }}
        >
          <div className={`
            flex flex-col items-center justify-center
            ${draggingId === p.id ? 'scale-125' : 'scale-100'}
            transition-transform duration-150
          `}>
            {/* The Dot */}
            <div className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-lg
              ${p.type === 'ball' ? 'bg-white text-black border-zinc-400' : 
                p.team === 'home' ? 'bg-emerald-500 border-emerald-300' : 
                p.team === 'away' ? 'bg-blue-500 border-blue-300' : 
                'bg-zinc-500 border-zinc-300'}
              ${draggingId === p.id ? 'ring-4 ring-white/50' : ''}
            `}>
              {p.label[0]}
            </div>
            
            {/* Label */}
            <span className="mt-1 px-1.5 py-0.5 bg-black/80 border border-white/20 rounded text-[9px] text-white whitespace-nowrap font-orbitron">
              {p.label}
            </span>
          </div>
        </div>
      ))}

      {/* Dragging Feedback */}
      {draggingId && (
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-400 text-xs font-bold animate-pulse">
          REWRITING HISTORY...
        </div>
      )}
    </div>
  );
};
