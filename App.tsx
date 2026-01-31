
import React, { useState, useRef } from 'react';
import { analyzeSportsFrame, simulatePlay } from './backend/main';
import { AppState } from './types';
import { TacticalBoard } from './components/TacticalBoard';
import { WinProbabilityGauge } from './components/WinProbabilityGauge';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    image: null,
    videoSrc: null,
    players: [],
    originalPlayers: [],
    isAnalyzing: false,
    isSimulating: false,
    simulationResult: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const processImage = async (base64: string) => {
    setState(prev => ({ 
      ...prev, 
      image: base64, 
      isAnalyzing: true, 
      players: [], 
      originalPlayers: [],
      simulationResult: null 
    }));

    try {
      const detectedPlayers = await analyzeSportsFrame(base64);
      setState(prev => ({
        ...prev,
        players: detectedPlayers,
        originalPlayers: JSON.parse(JSON.stringify(detectedPlayers)),
        isAnalyzing: false
      }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      alert("Failed to analyze image. Check console.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        videoSrc: videoUrl,
        image: null,
        players: [],
        simulationResult: null
      }));
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg');
    processImage(base64);
  };

  const handlePlayerMove = (id: string, x: number, y: number) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, x, y } : p)
    }));
  };

  const handleSimulate = async () => {
    if (state.players.length === 0) return;

    setState(prev => ({ ...prev, isSimulating: true }));
    try {
      const result = await simulatePlay(state.originalPlayers, state.players);
      setState(prev => ({ ...prev, simulationResult: result, isSimulating: false }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isSimulating: false }));
      alert("Simulation failed.");
    }
  };

  const resetBoard = () => {
    setState(prev => ({
      ...prev,
      players: JSON.parse(JSON.stringify(prev.originalPlayers)),
      simulationResult: null
    }));
  };

  const backToVideo = () => {
    setState(prev => ({
      ...prev,
      image: null,
      players: [],
      simulationResult: null
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-slate-200">
      {/* Header */}
      <header className="h-16 border-b border-emerald-500/20 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            <span className="text-black font-black text-xl">G</span>
          </div>
          <h1 className="font-orbitron font-black text-xl tracking-tighter neon-text">
            GHOST<span className="text-emerald-400">BOARD</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
          <span className="px-2 py-1 border border-zinc-800 rounded">v1.0.42_PROTOTYPE</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Left Side: Interaction Zone */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
          {!state.image && !state.videoSrc ? (
            <div className="flex-1 flex flex-col items-center justify-center cyber-border rounded-2xl bg-zinc-900/30 p-12 text-center">
              <div className="w-20 h-20 mb-6 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-dashed border-emerald-500/50">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-orbitron font-bold mb-2">INITIALIZE TACTICAL FEED</h2>
              <p className="text-slate-500 mb-8 max-w-sm">Upload a video clip or screenshot of a sports play to start your counterfactual simulation.</p>
              <label className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold rounded-full cursor-pointer transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                SELECT MEDIA
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
              </label>
            </div>
          ) : !state.image && state.videoSrc ? (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron text-lg font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-emerald-500"></span>
                  VIDEO ANALYSIS
                </h3>
                <label className="px-4 py-1.5 text-xs font-bold border border-zinc-700 rounded hover:bg-zinc-800 transition-colors cursor-pointer">
                  CHANGE SOURCE
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                </label>
              </div>
              
              <div className="relative flex-1 bg-black rounded-lg border border-zinc-800 overflow-hidden flex flex-col">
                <video 
                  ref={videoRef}
                  src={state.videoSrc} 
                  controls 
                  className="w-full h-full object-contain"
                />
                
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
                   <button 
                    onClick={captureFrame}
                    className="px-8 py-4 bg-emerald-500/90 hover:bg-emerald-400 backdrop-blur-sm text-black font-orbitron font-black text-lg rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-3 transition-all hover:scale-105"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    ANALYZE THIS FRAME
                  </button>
                </div>
              </div>
              
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs text-slate-400">
                <strong className="text-emerald-500">INSTRUCTIONS:</strong> Pause the video at the critical moment you want to simulate, then click "Analyze This Frame".
              </div>
            </div>
          ) : (
            <>
              {/* Tactical Board View */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron text-lg font-bold flex items-center gap-2">
                    <span className="w-1 h-5 bg-emerald-500"></span>
                    TACTICAL OVERLAY
                  </h3>
                  <div className="flex gap-2">
                    {state.videoSrc && (
                      <button 
                        onClick={backToVideo}
                        className="px-4 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30 rounded transition-colors flex items-center gap-2"
                      >
                        ← BACK TO VIDEO
                      </button>
                    )}
                    <button 
                      onClick={resetBoard}
                      className="px-4 py-1.5 text-xs font-bold border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                    >
                      RESET POSITIONS
                    </button>
                    <label className="px-4 py-1.5 text-xs font-bold border border-zinc-700 rounded hover:bg-zinc-800 transition-colors cursor-pointer">
                      NEW FILE
                      <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
                
                {state.image && (
                  <TacticalBoard 
                    image={state.image} 
                    players={state.players} 
                    onPlayerMove={handlePlayerMove}
                    disabled={state.isAnalyzing || state.isSimulating}
                  />
                )}
              </div>

              {state.isAnalyzing && (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
                  <div>
                    <h4 className="font-bold text-emerald-400">DETECTING ENTITIES</h4>
                    <p className="text-sm text-slate-400">Gemini is mapping coordinates for players and ball...</p>
                  </div>
                </div>
              )}

              {state.players.length > 0 && !state.isAnalyzing && (
                <div className="bg-zinc-900/50 p-4 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold">INSTRUCTIONS</h4>
                      <p className="text-xs text-slate-400">Drag player nodes to adjust their positions.</p>
                    </div>
                    <button 
                      onClick={handleSimulate}
                      disabled={state.isSimulating}
                      className="px-8 py-3 bg-white hover:bg-slate-200 text-black font-orbitron font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {state.isSimulating ? 'SIMULATING...' : 'RUN SIMULATION'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {state.players.map(p => (
                      <div key={p.id} className="text-[10px] p-2 bg-zinc-800/50 border border-zinc-700 rounded flex flex-col">
                        <span className="opacity-50">{p.id}</span>
                        <span className="font-bold truncate">{p.label}</span>
                        <span className="text-emerald-500">{Math.round(p.x)},{Math.round(p.y)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Side: Analysis Results */}
        <aside className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="cyber-border rounded-2xl bg-zinc-900/30 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 font-orbitron text-sm font-bold tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              ANALYSIS_OUTPUT
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!state.simulationResult && !state.isSimulating ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale">
                  <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm font-orbitron">AWAITING SIMULATION DATA</p>
                </div>
              ) : state.isSimulating ? (
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-zinc-800 rounded animate-pulse"></div>
                  <div className="h-4 bg-zinc-800 rounded animate-pulse w-5/6"></div>
                  <div className="h-32 bg-zinc-800 rounded animate-pulse w-full"></div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {state.simulationResult && (
                    <WinProbabilityGauge 
                      original={state.simulationResult.originalWinProbability}
                      current={state.simulationResult.newWinProbability}
                    />
                  )}

                  <section>
                    <label className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest block mb-2">Verdict</label>
                    <div className={`text-3xl font-orbitron font-black ${
                      state.simulationResult?.verdict === 'Success' ? 'text-emerald-500' :
                      state.simulationResult?.verdict === 'Failure' ? 'text-rose-500' : 'text-amber-500'
                    }`}>
                      {state.simulationResult?.verdict}
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest block mb-2">Tactical Breakdown</label>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {state.simulationResult?.analysis}
                    </p>
                  </section>

                  <section className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">The Butterfly Effect</label>
                    <p className="text-sm italic text-emerald-100/70">
                      &ldquo;{state.simulationResult?.butterflyEffect}&rdquo;
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-300 leading-tight">
            <strong>PRO TIP:</strong> Moving defenders closer to the central axis typically reduces the likelihood of successful penetrating through-balls but increases vulnerability to wing-play overlaps.
          </div>
        </aside>
      </main>

      <footer className="h-8 flex items-center justify-center px-8 border-t border-white/5 bg-black/50 text-[10px] font-bold text-slate-600 tracking-tighter">
        GEMINI 3 SUPERHACK // BUILT FOR COUNTERFACTUAL ANALYSIS // 2024
      </footer>
    </div>
  );
};

export default App;
