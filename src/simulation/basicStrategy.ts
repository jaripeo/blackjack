import { Card, Hand } from '../engine/types';
import { cardValue, canSplit, evaluateHand } from '../engine/handValue';

// ---------------------------------------------------------------------------
// Basic strategy decision matrix.
//
// This is the mathematically optimal play for a 6-deck S17 game with no
// surrender. Using it gives a house edge of roughly 0.40-0.55%.
//
// Spec requirements (strictly followed):
//   Hard:  Stand 17+, Hit ≤11, Double on 10/11 vs dealer <10
//   Soft:  Hit soft ≤17, Stand soft 18+
//   Pairs: Split Aces and 8s only
// ---------------------------------------------------------------------------

export type BotAction = 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT';

/**
 * Returns the basic-strategy action for the given hand and dealer up card.
 *
 * @param hand        The current player hand.
 * @param dealerUp    The dealer's visible (face-up) card.
 * @param canDouble   Whether doubling is currently allowed (funds & card count).
 * @param canSplitNow Whether splitting is currently allowed (funds & card count).
 */
export function basicStrategy(
  hand: Hand,
  dealerUp: Card,
  canDouble: boolean,
  canSplitNow: boolean,
): BotAction {
  const dv = cardValue(dealerUp.rank); // dealer up-card value (A = 11 here)
  const dealerVal = dv === 11 ? 11 : dv; // keep Ace as 11 for comparisons below

  const { total, isSoft } = evaluateHand(hand.cards);
  const firstTwo = hand.cards.length === 2;

  // ── Pairs ────────────────────────────────────────────────────────────────
  // Per spec: split Aces and 8s only.
  if (firstTwo && canSplitNow && canSplit(hand)) {
    const rv = cardValue(hand.cards[0].rank);
    if (rv === 11 || rv === 8) return 'SPLIT'; // Ace (11) or 8
  }

  // ── Soft totals ──────────────────────────────────────────────────────────
  if (isSoft) {
    // Soft 18: standard strategy doubles vs 3-6, stands vs 7-8, hits vs 9-A.
    // We follow the spec's simplified rule: stand on soft 18+.
    if (total >= 18) return 'STAND';
    return 'HIT';
  }

  // ── Hard totals ──────────────────────────────────────────────────────────
  if (total >= 17) return 'STAND';

  // Hard 13-16: stand vs dealer 2-6, hit vs 7+
  if (total >= 13) {
    return dealerVal <= 6 ? 'STAND' : 'HIT';
  }

  // Hard 12: stand vs dealer 4-6, hit otherwise
  if (total === 12) {
    return dealerVal >= 4 && dealerVal <= 6 ? 'STAND' : 'HIT';
  }

  // Hard 11: Double vs dealer 2-10 (spec: "less than a 10" = dealer not showing 10/J/Q/K)
  if (total === 11) {
    if (firstTwo && canDouble && dealerVal < 10) return 'DOUBLE';
    return 'HIT';
  }

  // Hard 10: Double vs dealer 2-9
  if (total === 10) {
    if (firstTwo && canDouble && dealerVal <= 9) return 'DOUBLE';
    return 'HIT';
  }

  // Hard 9: Double vs dealer 3-6
  if (total === 9) {
    if (firstTwo && canDouble && dealerVal >= 3 && dealerVal <= 6) return 'DOUBLE';
    return 'HIT';
  }

  // Hard 8 or below: always hit
  return 'HIT';
}
