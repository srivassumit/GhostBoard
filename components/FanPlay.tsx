import React, { useState, useEffect } from 'react';
import { analyzeSportsMoment } from '../services/fanPlayService';
import { AnalysisState, SportType, PersonaType } from '../types';

const PERSONAS: { id: PersonaType; label: string; icon: string; desc: string }[] = [
  { id: 'beginner', label: 'Beginner', icon: '🐣', desc: 'No idea what is going on' },
  { id: 'new_fan', label: 'New Fan', icon: '🧢', desc: 'Knows a little bit' },
  { id: 'hardcore', label: 'Hardcore', icon: '🔥', desc: 'Knows the ins and outs' },
];

const AnalysisCard = ({ title, content, icon, color }: { title: string, content: string, icon: string, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    green: 'border-green-500/20 bg-green-500/5 text-green-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
  };
  return (
    <div className={`p-8 rounded-[2rem] border ${colors[color]} backdrop-blur-sm transition-all duration-500`}>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-2xl">{icon}</span>
        <h4 className="text-xl font-black text-slate-100">{title}</h4>
      </div>
      <p className="text-slate-300 text-lg leading-relaxed font-medium">{content}</p>
    </div>
  );
};

export const FanPlay: React.FC = () => {
  const [sport, setSport] = useState<SportType>('Tennis');
  const [persona, setPersona] = useState<PersonaType>('beginner');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lastSource, setLastSource] = useState<string | null>(null);

  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    error: null,
    result: null,
  });

  useEffect(() => {
    const currentSource = url || (file ? file.name : null);
    if (state.result && currentSource === lastSource) {
      handleAnalysis();
    }
  }, [persona]);

  const handleAnalysis = async () => {
    const currentSource = url || (file ? file.name : null);
    if (!currentSource) {
      setState(prev => ({ ...prev, error: 'Please provide a link or upload a file.' }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const result = await analyzeSportsMoment(sport, persona, url || file!, !!url);

      setState({ isAnalyzing: false, error: null, result });
      setLastSource(currentSource);
    } catch (err: any) {
      setState({ isAnalyzing: false, error: err.message, result: null });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 text-slate-100 selection:bg-green-500/30">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-green-500/10 rounded-3xl mb-6 border border-green-500/20">
            <span className="text-3xl">🎾</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-blue-500">
            FANPLAY
          </h1>
          <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto">
            Accurate, real-time sports analysis powered by Google Search.
          </p>
        </header>

        {/* Input Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl mb-12">
          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">Choose your sport</label>
            <div className="flex flex-wrap gap-2">
              {(['Tennis', 'American Football', 'Basketball', 'Soccer'] as SportType[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setSport(s); setLastSource(null); }}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${sport === s ? 'bg-green-600 text-white shadow-lg shadow-green-600/40 ring-2 ring-green-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4 flex justify-between">
              <span>Your Explanation Mode</span>
              {state.isAnalyzing && state.result && <span className="text-green-500 animate-pulse text-[10px]">UPDATING ANALYSIS...</span>}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  disabled={state.isAnalyzing}
                  className={`p-4 rounded-3xl border-2 text-left transition-all ${persona === p.id
                    ? 'border-green-500 bg-green-500/10 ring-4 ring-green-500/5'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700 opacity-60'
                    }`}
                >
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className={`font-bold text-sm ${persona === p.id ? 'text-green-400' : 'text-slate-200'}`}>{p.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <input
              type="text"
              placeholder="Paste the YouTube link (e.g. Nadal vs Federer 2008)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-200 transition-all font-medium"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFile(null); }}
            />
            <div className="flex items-center gap-4 text-slate-700">
              <div className="h-px flex-1 bg-slate-800"></div>
              <span className="text-[10px] font-black tracking-widest">OR</span>
              <div className="h-px flex-1 bg-slate-800"></div>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUrl(''); } }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-slate-800 file:text-slate-300 cursor-pointer"
            />
          </div>

          <button
            onClick={handleAnalysis}
            disabled={state.isAnalyzing}
            className="w-full mt-10 py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {state.isAnalyzing ? 'Searching Replay Library...' : 'Deep Analysis'}
          </button>
        </div>

        {/* Results Section */}
        {state.result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
            {/* Grounding Header */}
            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] -mr-32 -mt-32"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-black text-green-500 uppercase tracking-[0.3em]">Verified Match Detail</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[9px] font-black rounded-full border border-green-500/30">GROUNDED</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white">{state.result.identifiedGame}</h2>

                {state.result.sources && (
                  <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block w-full mb-1">Citations:</span>
                    {state.result.sources.slice(0, 3).map((src, i) => (
                      <a key={i} href={src.url} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-800 text-blue-400 hover:text-blue-300 px-3 py-1 rounded-full border border-slate-700 transition-colors truncate max-w-[200px]">
                        🔗 {src.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Field Manual */}
            <div className="bg-slate-900/40 rounded-[2rem] p-8 border border-slate-800">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">📒 {sport} Essentials</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {state.result.basicRules.map((rule, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                    <span className="text-green-500 font-black text-sm">{idx + 1}</span>
                    <p className="text-slate-300 text-sm font-medium">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Analysis */}
            <div className="grid gap-6">
              <AnalysisCard title="Moment Breakdown" content={state.result.whatHappened} icon="⚡" color="blue" />
              <AnalysisCard title="Significance" content={state.result.whyReacted} icon="🔥" color="green" />
              <AnalysisCard title="Match Forecast" content={state.result.nextSteps} icon="🔭" color="purple" />
            </div>
          </div>
        )}

        {state.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 font-bold text-center">
            ⚠️ {state.error}
          </div>
        )}
      </div>
    </div>
  );
};
