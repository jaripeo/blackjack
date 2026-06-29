import { Card, Hand } from '../engine/types';
import { cardValue, canSplit, evaluateHand } from '../engine/handValue';

// ---------------------------------------------------------------------------
// Configurable strategy system.
//
// Every decision the bot makes is driven by a plain StrategyConfig object.
// Presets are just pre-filled configs; the user can toggle any field to create
// a custom strategy without touching any source code.
// ---------------------------------------------------------------------------

export interface StrategyConfig {
  name: string; // 'Custom' when the user modifies a preset

  // ── Hard totals ───────────────────────────────────────────────────────
  /** Stand unconditionally on this total or above. */
  hardStandAt: 12 | 13 | 14 | 15 | 16 | 17;
  /** For totals 12 through (hardStandAt − 1), consult the dealer's up-card
   *  before deciding to stand or hit (basic strategy).
   *  When false, simply hit everything below hardStandAt. */
  dealerAwareBelow: boolean;

  // ── Doubles ───────────────────────────────────────────────────────────
  doubleOn11:   boolean; // double hard 11 vs dealer < 10
  doubleOn10:   boolean; // double hard 10 vs dealer ≤ 9
  doubleOn9:    boolean; // double hard 9  vs dealer 3-6
  doubleOnSoft: boolean; // double soft 13-18 vs dealer 5-6

  // ── Pairs ─────────────────────────────────────────────────────────────
  splitAces:       boolean; // always split AA
  splitEights:     boolean; // always split 88
  splitNines:      boolean; // split 99 vs dealer 2-6, 8-9
  splitSevens:     boolean; // split 77 vs dealer 2-7
  splitSixes:      boolean; // split 66 vs dealer 2-6
  splitTwosThrees: boolean; // split 22/33 vs dealer 2-7
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const PRESET_BASIC: StrategyConfig = {
  name: 'Basic Strategy',
  hardStandAt: 17,
  dealerAwareBelow: true,
  doubleOn11: true,  doubleOn10: true,  doubleOn9: true,  doubleOnSoft: false,
  splitAces: true,   splitEights: true,  splitNines: false,
  splitSevens: false, splitSixes: false, splitTwosThrees: false,
};

export const PRESET_NEVER_BUST: StrategyConfig = {
  name: 'Never Bust',
  hardStandAt: 12,
  dealerAwareBelow: false,
  doubleOn11: false, doubleOn10: false, doubleOn9: false, doubleOnSoft: false,
  splitAces: true,   splitEights: false, splitNines: false,
  splitSevens: false, splitSixes: false, splitTwosThrees: false,
};

export const PRESET_MIMIC_DEALER: StrategyConfig = {
  name: 'Mimic Dealer',
  hardStandAt: 17,
  dealerAwareBelow: false,
  doubleOn11: false, doubleOn10: false, doubleOn9: false, doubleOnSoft: false,
  splitAces: false,  splitEights: false, splitNines: false,
  splitSevens: false, splitSixes: false, splitTwosThrees: false,
};

export const PRESET_AGGRESSIVE: StrategyConfig = {
  name: 'Aggressive',
  hardStandAt: 17,
  dealerAwareBelow: true,
  doubleOn11: true,  doubleOn10: true,  doubleOn9: true,  doubleOnSoft: true,
  splitAces: true,   splitEights: true,  splitNines: true,
  splitSevens: true, splitSixes: true,  splitTwosThrees: true,
};

export const ALL_PRESETS: StrategyConfig[] = [
  PRESET_BASIC,
  PRESET_NEVER_BUST,
  PRESET_MIMIC_DEALER,
  PRESET_AGGRESSIVE,
];

/** Returns the matching preset name, or 'Custom'. */
export function detectPresetName(cfg: StrategyConfig): string {
  for (const p of ALL_PRESETS) {
    const { name: _a, ...a } = cfg;
    const { name: _b, ...b } = p;
    if (JSON.stringify(a) === JSON.stringify(b)) return p.name;
  }
  return 'Custom';
}

// ---------------------------------------------------------------------------
// The strategy function — driven entirely by the config object.
// ---------------------------------------------------------------------------

export type BotAction = 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT';

export function applyStrategy(
  config: StrategyConfig,
  hand: Hand,
  dealerUp: Card,
  canDouble: boolean,
  canSplitNow: boolean,
): BotAction {
  const dealerVal = cardValue(dealerUp.rank); // Ace = 11, faces = 10
  const { total, isSoft } = evaluateHand(hand.cards);
  const firstTwo = hand.cards.length === 2;

  // ── Pairs ────────────────────────────────────────────────────────────────
  if (firstTwo && canSplitNow && canSplit(hand)) {
    const rv = cardValue(hand.cards[0].rank);
    if (rv === 11 && config.splitAces) return 'SPLIT';
    if (rv === 8  && config.splitEights) return 'SPLIT';
    // 9-9: split vs 2-6 and 8-9 (not vs 7, 10, A)
    if (rv === 9  && config.splitNines  && dealerVal !== 7 && dealerVal < 10) return 'SPLIT';
    if (rv === 7  && config.splitSevens && dealerVal <= 7) return 'SPLIT';
    if (rv === 6  && config.splitSixes  && dealerVal <= 6) return 'SPLIT';
    if ((rv === 2 || rv === 3) && config.splitTwosThrees && dealerVal <= 7) return 'SPLIT';
    // 4-4, 5-5, 10-10 → fall through (treat as hard totals)
  }

  // ── Soft totals ──────────────────────────────────────────────────────────
  if (isSoft) {
    if (total >= 19) return 'STAND';
    if (total === 18) {
      if (firstTwo && canDouble && config.doubleOnSoft && dealerVal >= 3 && dealerVal <= 6)
        return 'DOUBLE';
      return dealerVal <= 8 ? 'STAND' : 'HIT';
    }
    // Soft 13-17
    if (firstTwo && canDouble && config.doubleOnSoft && dealerVal >= 5 && dealerVal <= 6)
      return 'DOUBLE';
    return 'HIT';
  }

  // ── Hard totals ──────────────────────────────────────────────────────────

  // Unconditional stand floor
  if (total >= config.hardStandAt) return 'STAND';

  // Doubles (9, 10, 11 are always below the minimum stand threshold of 12)
  if (total === 11 && firstTwo && canDouble && config.doubleOn11 && dealerVal < 10)
    return 'DOUBLE';
  if (total === 10 && firstTwo && canDouble && config.doubleOn10 && dealerVal <= 9)
    return 'DOUBLE';
  if (total === 9  && firstTwo && canDouble && config.doubleOn9  && dealerVal >= 3 && dealerVal <= 6)
    return 'DOUBLE';

  // Dealer-aware standing for 12 through (hardStandAt − 1)
  if (config.dealerAwareBelow && total >= 12) {
    if (total === 12) return (dealerVal >= 4 && dealerVal <= 6) ? 'STAND' : 'HIT';
    return dealerVal <= 6 ? 'STAND' : 'HIT'; // 13+
  }

  return 'HIT';
}
