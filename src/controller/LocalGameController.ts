import { GameController, StateListener } from './GameController';
import { GameAction, GameState } from '../engine/types';
import { createInitialState, gameReducer } from '../engine/gameReducer';

// ---------------------------------------------------------------------------
// LocalGameController — Phase 1 implementation.
//
// Holds the authoritative GameState locally, dispatches actions through the
// pure reducer, and notifies subscribers. It also plays the role the server
// will play in Phase 2: automatically stepping the dealer's turn (with a small
// delay so cards reveal one at a time for a natural feel).
// ---------------------------------------------------------------------------

export interface LocalGameOptions {
  playerId: string;
  playerName: string;
  /** Delay between dealer steps, in ms. */
  dealerStepDelay?: number;
}

export class LocalGameController implements GameController {
  private state: GameState;
  private listeners = new Set<StateListener>();
  private readonly playerId: string;
  private readonly dealerStepDelay: number;
  private dealerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: LocalGameOptions) {
    this.playerId = opts.playerId;
    this.dealerStepDelay = opts.dealerStepDelay ?? 750;
    this.state = createInitialState({ id: opts.playerId, name: opts.playerName });
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // emit current state immediately
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- intents -------------------------------------------------------------
  placeBet(amount: number): void {
    this.dispatch({ type: 'PLACE_BET', playerId: this.playerId, amount });
  }
  clearBet(): void {
    this.dispatch({ type: 'CLEAR_BET', playerId: this.playerId });
  }
  deal(): void {
    this.dispatch({ type: 'DEAL' });
  }
  hit(): void {
    this.dispatch({ type: 'HIT', playerId: this.playerId });
  }
  stand(): void {
    this.dispatch({ type: 'STAND', playerId: this.playerId });
  }
  double(): void {
    this.dispatch({ type: 'DOUBLE', playerId: this.playerId });
  }
  split(): void {
    this.dispatch({ type: 'SPLIT', playerId: this.playerId });
  }
  nextRound(): void {
    this.dispatch({ type: 'NEXT_ROUND' });
  }

  dispose(): void {
    if (this.dealerTimer) clearTimeout(this.dealerTimer);
    this.dealerTimer = null;
    this.listeners.clear();
  }

  // --- internals -----------------------------------------------------------
  private dispatch(action: GameAction): void {
    this.setState(gameReducer(this.state, action));
  }

  private setState(next: GameState): void {
    if (next === this.state) return; // reducer no-op — skip notifications
    this.state = next;
    this.listeners.forEach((l) => l(next));

    // Locally drive the dealer. Each step schedules the next while we remain
    // in the dealer's turn; the reducer transitions to 'round-over' when done.
    if (this.state.phase === 'dealer-turn') {
      this.scheduleDealerStep();
    }
  }

  private scheduleDealerStep(): void {
    if (this.dealerTimer) clearTimeout(this.dealerTimer);
    this.dealerTimer = setTimeout(() => {
      this.dealerTimer = null;
      this.dispatch({ type: 'DEALER_STEP' });
    }, this.dealerStepDelay);
  }
}
