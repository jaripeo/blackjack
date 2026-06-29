import { Card, GameState, Hand, PlayerState } from './types';
import { handTotal } from './handValue';

// ---------------------------------------------------------------------------
// Read-only views derived from GameState. The UI uses these instead of
// reaching into the state shape directly, so the components stay decoupled
// from how state is stored or transported.
// ---------------------------------------------------------------------------

export function getPlayer(
  state: GameState,
  playerId: string,
): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

export function getActivePlayer(state: GameState): PlayerState | undefined {
  return state.players[state.activePlayerIndex];
}

export function getActiveHand(state: GameState): Hand | undefined {
  const player = getActivePlayer(state);
  return player?.hands[player.activeHandIndex];
}

/** Total of only the dealer's face-up cards (used while the hole is hidden). */
export function visibleDealerTotal(cards: Card[]): number {
  return handTotal(cards.filter((c) => c.faceUp));
}

export function cardsRemaining(state: GameState): number {
  return state.shoe.cards.length - state.shoe.cursor;
}

/** How deep into the shoe we are, as a percentage of the cut-card depth. */
export function penetrationPct(state: GameState): number {
  if (state.shoe.cutCardIndex === 0) return 0;
  return Math.min(100, Math.round((state.shoe.cursor / state.shoe.cutCardIndex) * 100));
}
