import { Card } from './types';
import { evaluateHand } from './handValue';

// ---------------------------------------------------------------------------
// House rules. Centralised so a Phase 2 server can ship the same constants and
// stay authoritative — the client never needs its own copy of the rule logic.
// ---------------------------------------------------------------------------

export const RULES = {
  /** Number of 52-card decks combined into the shoe. */
  numDecks: 6,
  /** Deal depth at which the cut card sits (0.75 = reshuffle near 75% used). */
  penetration: 0.75,
  /** Blackjack pays 3:2. */
  blackjackPayout: 1.5,
  /** false = dealer stands on all 17s (S17). true = dealer hits soft 17 (H17). */
  dealerHitsSoft17: false,
  startingBankroll: 1000,
  minBet: 5,
} as const;

/** Whether the dealer must draw another card given the current house rules. */
export function dealerShouldHit(cards: Card[]): boolean {
  const { total, isSoft } = evaluateHand(cards);
  if (total < 17) return true;
  if (total === 17 && isSoft && RULES.dealerHitsSoft17) return true;
  return false;
}
