// ---------------------------------------------------------------------------
// Engine types — the single source of truth for the game's shape.
//
// Everything here is plain data (no classes, no React, no I/O). The same
// GameState object can live in React state locally (Phase 1) or be serialized
// over a socket from an authoritative server (Phase 2) without changes.
// ---------------------------------------------------------------------------

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6'
  | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
  /** Dealer's hole card starts face down; everything else is face up. */
  faceUp: boolean;
}

export type HandStatus =
  | 'active'     // currently playable
  | 'stood'     // player stopped (or doubled) without busting — awaits dealer
  | 'busted'    // total > 21
  | 'blackjack' // natural 21 on the first two cards
  | 'done';     // fully resolved after settlement

export type HandResult = 'win' | 'lose' | 'push' | 'blackjack';

export interface Hand {
  id: string;
  cards: Card[];
  bet: number;
  status: HandStatus;
  isDoubled: boolean;
  /** Hands created by splitting Aces receive exactly one card and auto-stand. */
  fromSplitAces: boolean;
  result?: HandResult;
}

export interface PlayerState {
  id: string;
  name: string;
  bankroll: number;
  /** A player can hold multiple hands at once after splitting. */
  hands: Hand[];
  activeHandIndex: number;
  /** Bet staged during the betting phase, committed on DEAL. */
  pendingBet: number;
}

export interface DealerState {
  cards: Card[];
}

export interface Shoe {
  cards: Card[];
  /** Index of the next card to be dealt. */
  cursor: number;
  /** Once `cursor` reaches this index, the shoe is flagged for reshuffle. */
  cutCardIndex: number;
  /** Set true when the cut card is reached; reshuffle happens before next deal. */
  needsReshuffle: boolean;
}

export type GamePhase =
  | 'betting'      // players staging bets
  | 'player-turn'  // active player acting (hit/stand/double/split)
  | 'dealer-turn'  // dealer revealing + drawing to the house rules
  | 'round-over';  // results settled, awaiting next round

export interface GameState {
  shoe: Shoe;
  dealer: DealerState;
  players: PlayerState[];
  activePlayerIndex: number;
  phase: GamePhase;
  roundId: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Actions — the complete vocabulary of state transitions.
//
// In Phase 2 these map 1:1 onto socket events: the client emits the action,
// the server feeds it through this exact reducer, and broadcasts the result.
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'PLACE_BET'; playerId: string; amount: number }
  | { type: 'CLEAR_BET'; playerId: string }
  | { type: 'DEAL' }
  | { type: 'HIT'; playerId: string }
  | { type: 'STAND'; playerId: string }
  | { type: 'DOUBLE'; playerId: string }
  | { type: 'SPLIT'; playerId: string }
  | { type: 'DEALER_STEP' }
  | { type: 'NEXT_ROUND' };
