import {
  Card,
  DealerState,
  GameAction,
  GamePhase,
  GameState,
  Hand,
  HandResult,
  PlayerState,
} from './types';
import { createShoe, drawCard } from './deck';
import { canSplit, handTotal, isBlackjack } from './handValue';
import { RULES, dealerShouldHit } from './rules';

// ---------------------------------------------------------------------------
// The game reducer: the ENTIRE rule set as one pure function.
//
//   gameReducer(state, action) -> nextState
//
// No randomness escapes except via the injectable shoe RNG, no I/O, no React.
// Phase 1 runs it on-device; Phase 2 runs this same file on the Node server as
// the authoritative game loop. That is the whole point of the architecture.
// ---------------------------------------------------------------------------

let handIdCounter = 0;
function newHandId(): string {
  handIdCounter += 1;
  return `h${handIdCounter}`;
}

export function createInitialState(player: {
  id: string;
  name: string;
}): GameState {
  return {
    shoe: createShoe(),
    dealer: { cards: [] },
    players: [
      {
        id: player.id,
        name: player.name,
        bankroll: RULES.startingBankroll,
        hands: [],
        activeHandIndex: 0,
        pendingBet: 0,
      },
    ],
    activePlayerIndex: 0,
    phase: 'betting',
    roundId: 0,
    message: 'Place your bet to begin.',
  };
}

// --- small immutable helpers ----------------------------------------------

/** Apply `fn` to the active player's currently active hand, immutably. */
function updateActiveHand(state: GameState, fn: (hand: Hand) => Hand): GameState {
  const players = state.players.map((player, pIdx): PlayerState => {
    if (pIdx !== state.activePlayerIndex) return player;
    const hands = player.hands.map((hand, hIdx) =>
      hIdx === player.activeHandIndex ? fn(hand) : hand,
    );
    return { ...player, hands };
  });
  return { ...state, players };
}

function revealDealer(dealer: DealerState): DealerState {
  return { cards: dealer.cards.map((c) => ({ ...c, faceUp: true })) };
}

/**
 * Move play to the next still-active hand. Scans the current player's
 * remaining hands first (for splits), then later players. When none remain,
 * reveals the dealer and hands control to the dealer's turn.
 */
function advanceAfterHand(state: GameState): GameState {
  for (let pIdx = state.activePlayerIndex; pIdx < state.players.length; pIdx += 1) {
    const player = state.players[pIdx];
    const start = pIdx === state.activePlayerIndex ? player.activeHandIndex + 1 : 0;
    for (let hIdx = start; hIdx < player.hands.length; hIdx += 1) {
      if (player.hands[hIdx].status === 'active') {
        const players = state.players.map((p, idx) =>
          idx === pIdx ? { ...p, activeHandIndex: hIdx } : p,
        );
        return {
          ...state,
          players,
          activePlayerIndex: pIdx,
          phase: 'player-turn',
          message: 'Your move.',
        };
      }
    }
  }

  // No active hands anywhere — the dealer takes over.
  return {
    ...state,
    dealer: revealDealer(state.dealer),
    phase: 'dealer-turn',
    message: "Dealer's turn.",
  };
}

/** Compute results, pay out bankrolls, and end the round. */
function settle(state: GameState): GameState {
  const dealerTotal = handTotal(state.dealer.cards);
  const dealerBust = dealerTotal > 21;
  const dealerNatural = isBlackjack(state.dealer.cards);

  const players = state.players.map((player): PlayerState => {
    let bankroll = player.bankroll;

    const hands = player.hands.map((hand): Hand => {
      const total = handTotal(hand.cards);
      let result: HandResult;

      if (hand.status === 'busted') {
        result = 'lose'; // stake already removed at bet time
      } else if (hand.status === 'blackjack') {
        if (dealerNatural) {
          result = 'push';
          bankroll += hand.bet; // stake returned
        } else {
          result = 'blackjack';
          bankroll += hand.bet + hand.bet * RULES.blackjackPayout; // 3:2
        }
      } else {
        // A standing (or doubled, or never-acted) hand vs the dealer total.
        if (dealerNatural) {
          result = 'lose';
        } else if (dealerBust || total > dealerTotal) {
          result = 'win';
          bankroll += hand.bet * 2; // stake + even money
        } else if (total === dealerTotal) {
          result = 'push';
          bankroll += hand.bet; // stake returned
        } else {
          result = 'lose';
        }
      }

      return { ...hand, result, status: 'done' };
    });

    return { ...player, hands, bankroll };
  });

  return {
    ...state,
    players,
    phase: 'round-over',
    message: dealerBust
      ? `Dealer busts with ${dealerTotal}.`
      : `Dealer stands on ${dealerTotal}.`,
  };
}

// --- the reducer ------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_BET': {
      if (state.phase !== 'betting') return state;
      const players = state.players.map((p): PlayerState => {
        if (p.id !== action.playerId) return p;
        const next = p.pendingBet + action.amount;
        if (next > p.bankroll) return p; // can't bet more than you hold
        return { ...p, pendingBet: next };
      });
      return { ...state, players };
    }

    case 'CLEAR_BET': {
      if (state.phase !== 'betting') return state;
      const players = state.players.map((p): PlayerState =>
        p.id === action.playerId ? { ...p, pendingBet: 0 } : p,
      );
      return { ...state, players };
    }

    case 'DEAL': {
      if (state.phase !== 'betting') return state;
      if (!state.players.some((p) => p.pendingBet >= RULES.minBet)) return state;

      // Reshuffle here, between rounds, if the cut card was reached last round.
      let shoe = state.shoe.needsReshuffle ? createShoe() : state.shoe;

      // Commit pending bets into a fresh hand for each participating player.
      const players: PlayerState[] = state.players.map((p): PlayerState => {
        if (p.pendingBet < RULES.minBet) {
          return { ...p, hands: [], activeHandIndex: 0 };
        }
        return {
          ...p,
          bankroll: p.bankroll - p.pendingBet,
          pendingBet: 0,
          activeHandIndex: 0,
          hands: [
            {
              id: newHandId(),
              cards: [],
              bet: p.pendingBet,
              status: 'active',
              isDoubled: false,
              fromSplitAces: false,
            },
          ],
        };
      });

      const dealer: DealerState = { cards: [] };
      const dealingIdx = players
        .map((p, i) => (p.hands.length > 0 ? i : -1))
        .filter((i) => i >= 0);

      // Two passes: each player gets a card, then the dealer. The dealer's
      // second card (the hole card) is dealt face down.
      for (let round = 0; round < 2; round += 1) {
        for (const i of dealingIdx) {
          const r = drawCard(shoe, true);
          shoe = r.shoe;
          players[i].hands[0].cards.push(r.card);
        }
        const r = drawCard(shoe, round === 0);
        shoe = r.shoe;
        dealer.cards.push(r.card);
      }

      // Flag player naturals.
      for (const i of dealingIdx) {
        if (isBlackjack(players[i].hands[0].cards)) {
          players[i].hands[0].status = 'blackjack';
        }
      }

      // US "peek" rules: the dealer's natural is resolved immediately, so a
      // player can never double/split into a hidden dealer blackjack.
      const dealerNatural = isBlackjack(dealer.cards);
      const anyActive = players.some((p) =>
        p.hands.some((h) => h.status === 'active'),
      );

      let phase: GamePhase;
      let dealerCards = dealer.cards;
      let message: string;

      if (dealerNatural || !anyActive) {
        dealerCards = revealDealer(dealer).cards;
        phase = 'dealer-turn';
        message = dealerNatural
          ? 'Dealer peeks... Blackjack!'
          : 'Blackjack! Revealing dealer.';
      } else {
        phase = 'player-turn';
        message = 'Your move — Hit, Stand, Double or Split.';
      }

      return {
        ...state,
        shoe,
        dealer: { cards: dealerCards },
        players,
        activePlayerIndex: dealingIdx[0] ?? 0,
        phase,
        message,
      };
    }

    case 'HIT': {
      if (state.phase !== 'player-turn') return state;

      const r = drawCard(state.shoe, true);
      let next = updateActiveHand(state, (h) => ({
        ...h,
        cards: [...h.cards, r.card],
      }));
      next = { ...next, shoe: r.shoe };

      const player = next.players[next.activePlayerIndex];
      const total = handTotal(player.hands[player.activeHandIndex].cards);

      if (total > 21) {
        next = updateActiveHand(next, (h) => ({ ...h, status: 'busted' }));
        next = { ...next, message: 'Bust!' };
        return advanceAfterHand(next);
      }
      if (total === 21) {
        // 21 can't improve — auto-stand and move on.
        next = updateActiveHand(next, (h) => ({ ...h, status: 'stood' }));
        return advanceAfterHand(next);
      }
      return next;
    }

    case 'STAND': {
      if (state.phase !== 'player-turn') return state;
      const next = updateActiveHand(state, (h) => ({ ...h, status: 'stood' }));
      return advanceAfterHand(next);
    }

    case 'DOUBLE': {
      if (state.phase !== 'player-turn') return state;
      const player = state.players[state.activePlayerIndex];
      const hand = player.hands[player.activeHandIndex];
      if (!hand || hand.cards.length !== 2) return state; // only on first two
      if (player.bankroll < hand.bet) return state; // need the extra stake

      const r = drawCard(state.shoe, true);
      let next = updateActiveHand(state, (h) => ({
        ...h,
        cards: [...h.cards, r.card],
        bet: h.bet * 2,
        isDoubled: true,
      }));
      next = {
        ...next,
        shoe: r.shoe,
        players: next.players.map((p, idx) =>
          idx === next.activePlayerIndex
            ? { ...p, bankroll: p.bankroll - hand.bet }
            : p,
        ),
      };

      const after = next.players[next.activePlayerIndex];
      const total = handTotal(after.hands[after.activeHandIndex].cards);
      next = updateActiveHand(next, (h) => ({
        ...h,
        status: total > 21 ? 'busted' : 'stood',
      }));
      next = {
        ...next,
        message: total > 21 ? 'Doubled and bust!' : 'Doubled down.',
      };
      return advanceAfterHand(next);
    }

    case 'SPLIT': {
      if (state.phase !== 'player-turn') return state;
      const player = state.players[state.activePlayerIndex];
      const hand = player.hands[player.activeHandIndex];
      if (!hand || !canSplit(hand)) return state;
      if (player.bankroll < hand.bet) return state; // second hand needs a stake

      const splittingAces = hand.cards[0].rank === 'A';

      let shoe = state.shoe;
      const d1 = drawCard(shoe, true);
      shoe = d1.shoe;
      const d2 = drawCard(shoe, true);
      shoe = d2.shoe;

      // Split Aces receive one card each and stand automatically.
      const handA: Hand = {
        id: newHandId(),
        cards: [hand.cards[0], d1.card],
        bet: hand.bet,
        status: splittingAces ? 'stood' : 'active',
        isDoubled: false,
        fromSplitAces: splittingAces,
      };
      const handB: Hand = {
        id: newHandId(),
        cards: [hand.cards[1], d2.card],
        bet: hand.bet,
        status: splittingAces ? 'stood' : 'active',
        isDoubled: false,
        fromSplitAces: splittingAces,
      };

      const newHands = [...player.hands];
      newHands.splice(player.activeHandIndex, 1, handA, handB);

      const players = state.players.map((p, idx): PlayerState =>
        idx === state.activePlayerIndex
          ? { ...p, hands: newHands, bankroll: p.bankroll - hand.bet }
          : p,
      );

      let next: GameState = { ...state, players, shoe };
      if (splittingAces) {
        // Both hands are locked; advance past them.
        next = advanceAfterHand(next);
      } else {
        next = { ...next, message: 'Split! Playing the first hand.' };
      }
      return next;
    }

    case 'DEALER_STEP': {
      if (state.phase !== 'dealer-turn') return state;

      // 1) Reveal the hole card first if it's still face down.
      if (state.dealer.cards.some((c) => !c.faceUp)) {
        return {
          ...state,
          dealer: revealDealer(state.dealer),
          message: 'Dealer reveals.',
        };
      }

      // 2) The dealer only plays out if at least one live (standing) hand
      //    could still beat or be beaten by the dealer. Busts already lost;
      //    naturals already won (dealer has no natural at this point).
      const dealerMustPlay = state.players.some((p) =>
        p.hands.some((h) => h.status === 'stood'),
      );

      if (dealerMustPlay && dealerShouldHit(state.dealer.cards)) {
        const r = drawCard(state.shoe, true);
        return {
          ...state,
          shoe: r.shoe,
          dealer: { cards: [...state.dealer.cards, r.card] },
          message: 'Dealer hits.',
        };
      }

      // 3) Nothing left to draw — settle the round.
      return settle(state);
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'round-over') return state;
      const players = state.players.map((p): PlayerState => ({
        ...p,
        hands: [],
        activeHandIndex: 0,
        pendingBet: 0,
      }));
      return {
        ...state,
        dealer: { cards: [] },
        players,
        activePlayerIndex: 0,
        phase: 'betting',
        roundId: state.roundId + 1,
        message: state.shoe.needsReshuffle
          ? 'Cut card reached — shuffling a fresh shoe. Place your bet.'
          : 'Place your bet.',
      };
    }

    default:
      return state;
  }
}
