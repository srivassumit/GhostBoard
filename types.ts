
export interface Player {
  id: string;
  type: 'player' | 'ball';
  team: 'home' | 'away' | 'neutral';
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label: string;
}

export interface SimulationResult {
  analysis: string;
  verdict: 'Success' | 'Failure' | 'Inconclusive';
  butterflyEffect: string;
  originalWinProbability: number;
  newWinProbability: number;
}

export interface AppState {
  image: string | null;
  videoSrc: string | null;
  players: Player[];
  originalPlayers: Player[];
  isAnalyzing: boolean;
  isSimulating: boolean;
  simulationResult: SimulationResult | null;
}
