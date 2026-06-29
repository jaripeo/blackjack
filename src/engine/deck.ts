import { Card, Rank, Shoe, Suit } from './types';
import { RULES } from './rules';

// ---------------------------------------------------------------------------
// Shoe construction & dealing.
//
// Casino-accurate model:
//   • A shoe is N decks combined (default 6 = 312 cards).
//   • Shuffled once via Fisher-Yates.
//   • Cards are dealt sequentially from a cursor — never replaced.
//   • A cut card sits at `penetration` depth; crossing it flags the shoe for
//     a reshuffle, which happens BETWEEN rounds (never mid-round).
//
// `rng` is injectable so a Phase 2 server can deal deterministically from a
// seed (and prove fairness / replay rounds) instead of relying on Math.random.
// ---------------------------------------------------------------------------

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

export function createSingleDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: true });
    }
  }
  return deck;
}

export function createUnshuffledShoe(numDecks: number = RULES.numDecks): Card[] {
  let cards: Card[] = [];
  for (let i = 0; i < numDecks; i += 1) {
    cards = cards.concat(createSingleDeck());
  }
  return cards;
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function fisherYatesShuffle<T>(
  input: T[],
  rng: () => number = Math.random,
): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Build and shuffle a fresh shoe with the cut card placed at `penetration`. */
export function createShoe(
  numDecks: number = RULES.numDecks,
  rng: () => number = Math.random,
): Shoe {
  const cards = fisherYatesShuffle(createUnshuffledShoe(numDecks), rng);
  const cutCardIndex = Math.floor(cards.length * RULES.penetration);
  return { cards, cursor: 0, cutCardIndex, needsReshuffle: false };
}

export interface DrawResult {
  card: Card;
  shoe: Shoe;
}

/**
 * Draw the next card without replacement. Returns the card plus a NEW shoe
 * (immutable update) with an advanced cursor. Crossing the cut card flips
 * `needsReshuffle`; the reducer honours that flag before the next deal.
 */
export function drawCard(shoe: Shoe, faceUp: boolean = true): DrawResult {
  // Defensive guard: a correctly placed cut card means we never reach here,
  // but if the shoe is exhausted mid-round we transparently start a new one.
  const source = shoe.cursor >= shoe.cards.length ? createShoe() : shoe;

  const drawn = source.cards[source.cursor];
  const card: Card = { ...drawn, faceUp };
  const cursor = source.cursor + 1;
  const needsReshuffle = source.needsReshuffle || cursor >= source.cutCardIndex;

  return {
    card,
    shoe: { ...source, cursor, needsReshuffle },
  };
}
