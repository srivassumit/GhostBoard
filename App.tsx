
import React, { useState, useRef } from 'react';
import { analyzeSportsFrame, simulatePlay } from './backend/main';
import { AppState } from './types';
import { TacticalBoard } from './components/TacticalBoard';
import { WinProbabilityGauge } from './components/WinProbabilityGauge';

// Fix for "Cannot find name 'ImageCapture'" error
declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  grabFrame(): Promise<ImageBitmap>;
}

const App: React.FC = () => {
  // Set default to 'fanplay'
  const [activeTab, setActiveTab] = useState<'fanplay' | 'ghostplay'>('fanplay');

  // --- GhostPlay State ---
  const [state, setState] = useState<AppState>({
    image: null,
    videoSrc: null,
    youtubeId: null,
    players: [],
    originalPlayers: [],
    detectedSport: null,
    isAnalyzing: false,
    isSimulating: false,
    simulationResult: null,
  });

  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Determine if we should show the sidebar (only when we have an image to work with)
  const showSidebar = !!state.image;
  // Determine if we are in pure video mode (no image captured yet)
  const isVideoMode = !state.image && (!!state.videoSrc || !!state.youtubeId);

  // --- GhostPlay Logic ---

  const processImage = async (base64: string) => {
    setState(prev => ({ 
      ...prev, 
      image: base64, 
      isAnalyzing: true, 
      players: [], 
      originalPlayers: [],
      detectedSport: null,
      simulationResult: null 
    }));

    try {
      // Backend now returns an object { players, sport }
      const { players, sport } = await analyzeSportsFrame(base64);
      setState(prev => ({
        ...prev,
        players: players,
        originalPlayers: JSON.parse(JSON.stringify(players)),
        detectedSport: sport,
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
        youtubeId: null,
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

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlSubmit = () => {
    const id = extractYoutubeId(urlInput);
    if (id) {
      setState(prev => ({
        ...prev,
        videoSrc: null,
        youtubeId: id,
        image: null,
        players: [],
        simulationResult: null
      }));
    } else {
      alert("Invalid YouTube URL");
    }
  };

  const captureFrame = async () => {
    if (state.youtubeId && videoContainerRef.current) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser", 
          } as any, 
          audio: false,
          selfBrowserSurface: "include", 
          preferCurrentTab: true, 
        } as any);

        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        let bitmap: ImageBitmap | null = null;
        
        try {
           bitmap = await imageCapture.grabFrame();
        } catch (e) {
           const video = document.createElement('video');
           video.srcObject = stream;
           video.muted = true;
           await video.play();
           await new Promise(r => setTimeout(r, 100));
           const cvs = document.createElement('canvas');
           cvs.width = video.videoWidth;
           cvs.height = video.videoHeight;
           cvs.getContext('2d')?.drawImage(video, 0, 0);
           bitmap = await createImageBitmap(cvs);
           video.remove();
        }

        track.stop(); 

        if (bitmap) {
          const rect = videoContainerRef.current.getBoundingClientRect();
          const captureWidth = bitmap.width;
          const captureHeight = bitmap.height;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          const scaleX = captureWidth / viewportWidth;
          const scaleY = captureHeight / viewportHeight;

          const cropX = Math.max(0, rect.left * scaleX);
          const cropY = Math.max(0, rect.top * scaleY);
          const cropWidth = Math.min(captureWidth - cropX, rect.width * scaleX);
          const cropHeight = Math.min(captureHeight - cropY, rect.height * scaleY);

          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(
              bitmap, 
              cropX, cropY, cropWidth, cropHeight, 
              0, 0, canvas.width, canvas.height
            );
            
            const base64 = canvas.toDataURL('image/jpeg');
            processImage(base64);
          }
        }
      } catch (e) {
        console.error("Screen capture cancelled or failed", e);
      }
      return;
    }

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
      const result = await simulatePlay(state.originalPlayers, state.players, state.detectedSport || 'Sports');
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
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0c] text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-none border-b border-emerald-500/20 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <span className="text-black font-black text-xl">P</span>
            </div>
            <h1 className="font-orbitron font-black text-xl tracking-tighter neon-text">
              PLAY<span className="text-emerald-400">LENS</span>
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800 ml-4">
            <button
              onClick={() => setActiveTab('fanplay')}
              className={`px-4 py-1.5 text-xs font-bold font-orbitron rounded transition-all ${
                activeTab === 'fanplay'
                  ? 'bg-blue-500 text-black shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              FANPLAY
            </button>
            <button
              onClick={() => setActiveTab('ghostplay')}
              className={`px-4 py-1.5 text-xs font-bold font-orbitron rounded transition-all ${
                activeTab === 'ghostplay'
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              GHOSTPLAY
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
          <span className="px-2 py-1 border border-zinc-800 rounded">v2.0_BETA</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            ONLINE
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* === TAB 1: GHOSTPLAY (Existing Functionality) === */}
        {/* If in video mode, remove padding and gap to allow full-screen effect */}
        <div className={activeTab === 'ghostplay' ? `w-full h-full flex flex-col lg:flex-row ${isVideoMode ? 'p-0 gap-0' : 'p-6 gap-6'}` : "hidden"}>
            {/* Left Side: Interaction Zone */}
            <div className={`flex-1 flex flex-col ${isVideoMode ? 'h-full' : 'gap-6 overflow-y-auto'} ${showSidebar ? 'pr-2' : ''}`}>
              {!state.image && !state.videoSrc && !state.youtubeId ? (
                <div className="flex-1 flex flex-col items-center justify-center cyber-border rounded-2xl bg-zinc-900/30 p-12 text-center">
                  <div className="w-20 h-20 mb-6 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-dashed border-emerald-500/50">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-orbitron font-bold mb-6">INITIALIZE GHOSTPLAY</h2>
                  
                  <div className="w-full max-w-md bg-black/40 rounded-lg p-1 flex gap-1 mb-6 border border-zinc-800">
                    <button 
                      onClick={() => setInputMode('upload')}
                      className={`flex-1 py-2 text-xs font-bold rounded font-orbitron transition-all ${inputMode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      UPLOAD MEDIA
                    </button>
                    <button 
                      onClick={() => setInputMode('url')}
                      className={`flex-1 py-2 text-xs font-bold rounded font-orbitron transition-all ${inputMode === 'url' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      YOUTUBE URL
                    </button>
                  </div>

                  {inputMode === 'upload' ? (
                    <>
                      <p className="text-slate-500 mb-8 max-w-sm">Upload a video clip or screenshot of a sports play to start your counterfactual simulation.</p>
                      <label className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold rounded-full cursor-pointer transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        SELECT FILE
                        <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                      </label>
                    </>
                  ) : (
                    <div className="w-full max-w-md flex flex-col gap-4">
                      <input 
                        type="text" 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-mono"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <button 
                        onClick={handleUrlSubmit}
                        disabled={!urlInput}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-orbitron font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      >
                        LOAD VIDEO
                      </button>
                    </div>
                  )}
                </div>
              ) : isVideoMode ? (
                // --- VIDEO MODE (Full Screen with Overlays) ---
                <div 
                  ref={videoContainerRef}
                  className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
                >
                  {/* Top Bar Overlay */}
                  <div className="absolute top-0 left-0 w-full p-6 flex items-start justify-between z-30 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
                    <h3 className="font-orbitron text-lg font-bold flex items-center gap-2 text-white drop-shadow-md">
                      <span className="w-1 h-5 bg-emerald-500 box-shadow-glow"></span>
                      VIDEO ANALYSIS
                    </h3>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, videoSrc: null, youtubeId: null }))}
                      className="pointer-events-auto px-4 py-2 text-xs font-bold bg-black/50 hover:bg-zinc-800 text-white border border-zinc-600 rounded backdrop-blur-md transition-all shadow-lg"
                    >
                      CHANGE SOURCE
                    </button>
                  </div>

                  {/* Video Player */}
                  {state.youtubeId ? (
                    <iframe 
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube-nocookie.com/embed/${state.youtubeId}?rel=0&modestbranding=1&controls=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video 
                      ref={videoRef}
                      src={state.videoSrc!} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  )}
                  
                  {/* Bottom Controls Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-8 pb-12 flex flex-col items-center justify-end z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
                     <button 
                        onClick={captureFrame}
                        className="pointer-events-auto mb-4 px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-black text-xl rounded-full shadow-[0_0_40px_rgba(16,185,129,0.6)] flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap border-2 border-white/20"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {state.youtubeId ? 'CAPTURE SCREEN' : 'ANALYZE THIS FRAME'}
                      </button>

                      <div className="text-xs text-slate-300 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                        <strong className="text-emerald-400">INSTRUCTIONS:</strong> 
                        {state.youtubeId 
                          ? " Pause video, click Capture, then select 'This Tab' to crop & analyze."
                          : " Pause at critical moment, then click Analyze."
                        }
                      </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tactical Board View */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h3 className="font-orbitron text-lg font-bold flex items-center gap-2">
                          <span className="w-1 h-5 bg-emerald-500"></span>
                          TACTICAL OVERLAY
                        </h3>
                        {state.detectedSport && (
                           <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                              {state.detectedSport}
                           </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(state.videoSrc || state.youtubeId) && (
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
                        <button 
                          onClick={() => setState(prev => ({ ...prev, image: null, videoSrc: null, youtubeId: null }))}
                          className="px-4 py-1.5 text-xs font-bold border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                        >
                          NEW SESSION
                        </button>
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
                        <h4 className="font-bold text-emerald-400">DETECTING ENTITIES & SPORT CONTEXT</h4>
                        <p className="text-sm text-slate-400">Gemini is identifying players and the sport being played...</p>
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
            {showSidebar && (
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
                            state.simulationResult?.verdict === 'Goal Likely' ? 'text-emerald-500' :
                            state.simulationResult?.verdict === 'Defense Likely' ? 'text-rose-500' : 
                            state.simulationResult?.verdict === 'No Immediate Threat' ? 'text-blue-400' : 'text-amber-500'
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
                        
                        {/* Source Grounding */}
                        {state.simulationResult?.groundingUrls && state.simulationResult.groundingUrls.length > 0 && (
                          <section className="pt-4 border-t border-white/10">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Sources</label>
                            <div className="flex flex-col gap-1">
                              {state.simulationResult.groundingUrls.map((url, idx) => (
                                <a 
                                  key={idx} 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-blue-400 hover:text-blue-300 truncate hover:underline"
                                >
                                  {new URL(url).hostname}
                                </a>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-300 leading-tight">
                  <strong>PRO TIP:</strong> Moving defenders closer to the central axis typically reduces the likelihood of successful penetrating through-balls but increases vulnerability to wing-play overlaps.
                </div>
              </aside>
            )}
        </div>

        {/* === TAB 2: FANPLAY (Placeholder) === */}
        <div className={activeTab === 'fanplay' ? "w-full h-full flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300" : "hidden"}>
             <div className="w-24 h-24 mb-6 rounded-full bg-zinc-900 border border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <h2 className="text-3xl font-orbitron font-bold text-white mb-2 tracking-tight">FANPLAY</h2>
             <p className="text-slate-500 font-mono text-sm max-w-md text-center">
               The ultimate fan engagement platform. <br/>
               Coming soon to PlayLens.
             </p>
        </div>
      </main>

      <footer className="h-8 flex-none border-t border-white/5 bg-black/50 flex items-center justify-center px-8 text-[10px] font-bold text-slate-600 tracking-tighter">
        PLAYLENS // TACTICAL INTELLIGENCE SUITE // 2024
      </footer>
    </div>
  );
};

export default App;
