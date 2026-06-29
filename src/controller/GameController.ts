import { GameState } from '../engine/types';

// ---------------------------------------------------------------------------
// GameController — the ONE seam between the UI and the game.
//
// The UI only ever:
//   1. reads state via subscribe()
//   2. expresses intent via the action methods (placeBet, hit, stand, ...)
//
// Phase 1:  LocalGameController runs the reducer in-process.
// Phase 2:  SocketGameController implements this SAME interface, turning each
//           method into a socket.emit() and pushing server state through the
//           same subscribe() callback. The screens and components never change.
//
// Sketch of the Phase 2 implementation:
//
//   class SocketGameController implements GameController {
//     constructor(private socket: Socket, roomCode: string) {
//       socket.on('state', (s: GameState) => this.emit(s));
//     }
//     placeBet(amount: number) { this.socket.emit('placeBet', { amount }); }
//     hit()                    { this.socket.emit('hit'); }
//     // ...etc — the server feeds these through the exact same gameReducer.
//   }
// ---------------------------------------------------------------------------

export type StateListener = (state: GameState) => void;

export interface GameController {
  /** Current snapshot (for initial render). */
  getState(): GameState;

  /** Subscribe to state changes. Fires immediately with the current state.
   *  Returns an unsubscribe function. */
  subscribe(listener: StateListener): () => void;

  // --- Player intents (become socket.emit() calls in Phase 2) --------------
  placeBet(amount: number): void;
  clearBet(): void;
  deal(): void;
  hit(): void;
  stand(): void;
  double(): void;
  split(): void;
  nextRound(): void;

  /** Release timers / listeners (and, in Phase 2, disconnect the socket). */
  dispose(): void;
}
