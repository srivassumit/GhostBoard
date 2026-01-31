
export interface Player {
  id: string;
  type: 'player' | 'ball' | 'goal_net';
  team: 'home' | 'away' | 'neutral';
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label: string;
}

export interface SimulationResult {
  analysis: string;
  verdict: 'Goal Likely' | 'Defense Likely' | 'Inconclusive' | 'No Immediate Threat';
  butterflyEffect: string;
  originalWinProbability: number;
  newWinProbability: number;
  groundingUrls?: string[];
  predictionSequence: {
    step: number;
    updates: { id: string; x: number; y: number }[];
  }[];
}

export interface AppState {
  image: string | null;
  videoSrc: string | null;
  youtubeId: string | null;
  players: Player[];
  originalPlayers: Player[];
  detectedSport: string | null;
  isAnalyzing: boolean;
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
  showAnimation: boolean;
}

// --- FanPlay Types ---
export interface GuideResponse {
  identifiedGame: string;
  basicRules: string[];
  whatHappened: string;
  whyReacted: string;
  nextSteps: string;
  sources?: { title: string; url: string }[];
}

export interface AnalysisState {
  isAnalyzing: boolean;
  error: string | null;
  result: GuideResponse | null;
}

export type SportType = 'American Football' | 'Basketball' | 'Soccer' | 'Tennis';

export type PersonaType = 'beginner' | 'new_fan' | 'hardcore';
