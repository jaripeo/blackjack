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

export interface LifetimeStats {
  totalHands: number;
  totalWins: number;
  totalLosses: number;
  totalPushes: number;
  totalBlackjacks: number;
  totalAmountWon: number;
  totalAmountLost: number;
  totalAmountWagered: number;
}

export const INITIAL_LIFETIME_STATS: LifetimeStats = {
  totalHands: 0,
  totalWins: 0,
  totalLosses: 0,
  totalPushes: 0,
  totalBlackjacks: 0,
  totalAmountWon: 0,
  totalAmountLost: 0,
  totalAmountWagered: 0,
};

export const LIFETIME_STATS_KEY = 'blackjack_lifetime_stats';
