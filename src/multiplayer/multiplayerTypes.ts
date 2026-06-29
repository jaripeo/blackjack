import { Card } from '../engine/types';

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

export interface MPDealer {
  cards: Card[];
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
  dealer: MPDealer;
  activePlayerIndex: number;
  phase: MPPhase;
  roundId: number;
  message: string;
}
