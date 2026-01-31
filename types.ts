
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
}
