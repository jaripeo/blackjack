export interface Card {
  rank: string;
  suit: string;
  faceUp: boolean;
}

export type HandResult = 'win' | 'lose' | 'push' | 'blackjack';
export type HandStatus = 'active' | 'stood' | 'busted' | 'blackjack' | 'done';

export interface MPHand {
  id: string;
  cards: Card[];
  bet: number;
  status: HandStatus;
  isDoubled: boolean;
  fromSplitAces: boolean;
  result?: HandResult;
}

export interface MPPlayer {
  id: string;
  name: string;
  bankroll: number;
  hands: MPHand[];
  pendingBet: number;
  activeHandIndex: number;
  betLocked: boolean;
  isConnected: boolean;
}

export type MPPhase =
  | 'waiting'
  | 'betting'
  | 'player-turn'
  | 'dealer-turn'
  | 'round-over';

export interface MPGameState {
  roomCode: string;
  hostId: string;
  players: MPPlayer[];
  dealer: { cards: Card[] };
  activePlayerIndex: number;
  phase: MPPhase;
  roundId: number;
  message: string;
}

// ── Hand evaluation ───────────────────────────────────────────────────────────

export function evaluateHand(cards: Card[]): { total: number; isSoft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (!c.faceUp) continue;
    if (c.rank === 'A') { total += 11; aces++; }
    else if (['K', 'Q', 'J', '10'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank, 10);
  }
  let highAces = aces;
  while (total > 21 && highAces > 0) { total -= 10; highAces--; }
  return { total, isSoft: highAces > 0 };
}

export function handTotal(cards: Card[]): number {
  return evaluateHand(cards).total;
}
