import { Card, Hand, Rank } from './types';

// ---------------------------------------------------------------------------
// Pure hand-evaluation helpers. No state, fully deterministic, trivially
// unit-testable, and identical whether run on device or on the server.
// ---------------------------------------------------------------------------

/** Base value of a rank, with Aces counted high (11) before soft reduction. */
export function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
  return parseInt(rank, 10);
}

export interface HandValue {
  total: number;
  /** True when at least one Ace is still counted as 11 (a "soft" total). */
  isSoft: boolean;
}

/**
 * Sum the hand counting Aces as 11, then demote Aces to 1 one at a time while
 * the total is over 21. The number of Aces still high tells us if it's soft.
 */
export function evaluateHand(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces += 1;
  }

  let highAces = aces;
  while (total > 21 && highAces > 0) {
    total -= 10;
    highAces -= 1;
  }

  return { total, isSoft: highAces > 0 };
}

export function handTotal(cards: Card[]): number {
  return evaluateHand(cards).total;
}

export function isBust(cards: Card[]): boolean {
  return handTotal(cards) > 21;
}

/** A natural blackjack: exactly two cards totalling 21. */
export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21;
}

/** Any two equal-value cards may be split (e.g. 10 + K is a valid pair). */
export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  return cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank);
}
