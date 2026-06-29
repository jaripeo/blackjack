export interface GameStats {
  handsPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  peakBankroll: number;
  sessionStartBankroll: number;
}

export const INITIAL_STATS: GameStats = {
  handsPlayed: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  peakBankroll: 1000,
  sessionStartBankroll: 1000,
};
