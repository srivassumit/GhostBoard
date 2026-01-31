
import React, { useRef, useEffect, useState } from 'react';
import { Player } from '../types';

interface SimulationPlayerProps {
  image: string | null;
  initialPlayers: Player[];
  sequence: { step: number; updates: { id: string; x: number; y: number }[] }[];
  verdict: string;
}

export const SimulationPlayer: React.FC<SimulationPlayerProps> = ({ 
  image, 
  initialPlayers, 
  sequence,
  verdict
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const animationRef = useRef<number | null>(null);

  // Deep clone to track current state
  const currentPlayers = useRef<Player[]>(JSON.parse(JSON.stringify(initialPlayers)));

  // Color config based on verdict
  const accentColor = verdict === 'Goal Likely' ? '#10b981' : verdict === 'Defense Likely' ? '#f43f5e' : '#3b82f6';

  const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Background
    ctx.fillStyle = '#18181b'; // Zinc-900
    ctx.fillRect(0, 0, width, height);

    // If we have the original image, use it as a faint background
    if (image) {
        // This is tricky inside a canvas loop without pre-loading, 
        // usually we just use the dark mode tactical view for clarity in animation
    }

    // Grid
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, width: number, height: number) => {
    const x = (p.x / 100) * width;
    const y = (p.y / 100) * height;

    ctx.shadowBlur = 10;
    
    if (p.type === 'ball') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'goal_net') {
      ctx.strokeStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 20, y - 10, 40, 20);
      
      // Net pattern
      ctx.fillStyle = accentColor + '33'; // low opacity
      ctx.fillRect(x - 20, y - 10, 40, 20);
    } else {
      // Players
      const color = p.team === 'home' ? '#10b981' : p.team === 'away' ? '#3b82f6' : '#71717a';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, x, y + 20);
    }
    ctx.shadowBlur = 0;
  };

  const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Logic to update positions based on progress
    // Total sequence length is sequence.length steps
    // Progress 0-100 needs to map to Step Index and Inter-step interpolation
    
    const totalSteps = sequence.length;
    if (totalSteps === 0) return;

    // Calculate which step we are in
    // If progress is 50%, and we have 6 steps. 
    // Scaled progress = 0.5 * 6 = 3.0. 
    // We are at step 3 (exact).
    // If progress is 0, we are at initialPlayers.
    
    const scaledProgress = (progress / 100) * totalSteps;
    const currentStepIndex = Math.floor(scaledProgress);
    const nextStepIndex = Math.min(currentStepIndex + 1, totalSteps);
    const stepT = scaledProgress - currentStepIndex; // 0 to 1 interpolation factor

    // Determine Start and End positions for this specific frame
    // We need to construct the full state of players for Current Step and Next Step
    
    // Helper to get state at a specific step index
    const getStateAtStep = (index: number) => {
      let state = JSON.parse(JSON.stringify(initialPlayers)) as Player[];
      
      // Apply updates cumulatively up to this index
      for (let i = 0; i < index; i++) {
        if (sequence[i]) {
          sequence[i].updates.forEach(update => {
             const p = state.find(pl => pl.id === update.id);
             if (p) {
               p.x = update.x;
               p.y = update.y;
             }
          });
        }
      }
      return state;
    };

    const startState = getStateAtStep(currentStepIndex);
    const endState = getStateAtStep(nextStepIndex);

    // Render
    drawField(ctx, canvas.width, canvas.height);

    startState.forEach(pStart => {
      const pEnd = endState.find(p => p.id === pStart.id) || pStart;
      
      // Interpolate
      const currentP = {
        ...pStart,
        x: lerp(pStart.x, pEnd.x, stepT),
        y: lerp(pStart.y, pEnd.y, stepT)
      };

      drawPlayer(ctx, currentP, canvas.width, canvas.height);
    });

    // Loop logic
    if (isPlaying) {
      if (progress < 100) {
        setProgress(prev => Math.min(prev + 0.5, 100)); // Speed of animation
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        // Initial Draw
        const ctx = canvas.getContext('2d');
        if (ctx) {
             drawField(ctx, canvas.width, canvas.height);
             // Trigger one frame of animation to draw dots at current progress
             animate();
        }
    }
    if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, progress, image, initialPlayers]);

  const togglePlay = () => {
    if (progress >= 100) setProgress(0);
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden cyber-border shadow-2xl">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={450} 
          className="w-full h-full object-contain"
        />
        
        {/* Overlay Badge */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[10px] font-orbitron text-white">
           PREDICTION REPLAY
        </div>

        {/* Verdict Overlay if done */}
        {progress >= 100 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
                <div className="text-3xl font-black font-orbitron text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" style={{ color: accentColor }}>
                    {verdict.toUpperCase()}
                </div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? (
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
          ) : (
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        
        <div className="flex-1">
           <input 
             type="range" 
             min="0" 
             max="100" 
             value={progress} 
             onChange={(e) => {
               setIsPlaying(false);
               setProgress(Number(e.target.value));
             }}
             className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
           />
           <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>NOW</span>
              <span>PREDICTED OUTCOME (+3s)</span>
           </div>
        </div>
      </div>
    </div>
  );
};