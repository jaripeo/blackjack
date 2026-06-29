import { GameState } from '../engine/types';
import { createInitialState, gameReducer } from '../engine/gameReducer';
import { applyStrategy, PRESET_BASIC, StrategyConfig } from './strategyConfig';

// ---------------------------------------------------------------------------
// Simulation engine.
//
// Runs the exact same shoe logic and gameReducer as the live game — the only
// difference is the player decisions come from applyStrategy() instead of a
// human, and the dealer's steps are resolved synchronously (no setTimeout).
//
// A large synthetic bankroll prevents bankruptcy mid-run so we never need a
// rebuy; the net result is simply (ending bankroll − starting bankroll).
// ---------------------------------------------------------------------------

const SIM_BANKROLL = 2_000_000;

export interface SimulationResult {
  handsPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  reshuffles: number;
  betAmount: number;
  strategyName: string;
  net: number;
  peakNet: number;
  troughNet: number;
}

export interface SimProgress {
  handsCompleted: number;
  total: number;
  runningNet: number;
}

// ---------------------------------------------------------------------------
// Single-round helpers
// ---------------------------------------------------------------------------

function playRound(
  state: GameState,
  betAmount: number,
  config: StrategyConfig,
): GameState {
  state = gameReducer(state, { type: 'PLACE_BET', playerId: 'sim', amount: betAmount });
  state = gameReducer(state, { type: 'DEAL' });

  let guard = 0;
  while (state.phase === 'player-turn' && guard < 200) {
    guard++;
    const player = state.players[0];
    const hand = player.hands[player.activeHandIndex];
    if (!hand) break;

    const dealerUp = state.dealer.cards.find(c => c.faceUp);
    if (!dealerUp) break;

    const canDouble   = hand.cards.length === 2 && player.bankroll >= hand.bet;
    const canSplitNow = hand.cards.length === 2 && player.bankroll >= hand.bet;

    const action = applyStrategy(config, hand, dealerUp, canDouble, canSplitNow);
    state = gameReducer(state, { type: action, playerId: 'sim' });
  }

  let dGuard = 0;
  while (state.phase === 'dealer-turn' && dGuard < 25) {
    dGuard++;
    state = gameReducer(state, { type: 'DEALER_STEP' });
  }

  return state;
}

function tallyRound(
  state: GameState,
  acc: Omit<SimulationResult, 'handsPlayed' | 'betAmount' | 'strategyName'>,
): void {
  for (const hand of state.players[0].hands) {
    switch (hand.result) {
      case 'blackjack': acc.wins++; acc.blackjacks++; break;
      case 'win':       acc.wins++;                   break;
      case 'lose':      acc.losses++;                 break;
      case 'push':      acc.pushes++;                 break;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run `numHands` asynchronously, yielding every `chunkSize` hands so the UI
 * can update a progress bar without freezing.
 *
 * @param config   Strategy to use (defaults to Basic Strategy if omitted).
 */
export function runSimulationAsync(
  numHands: number,
  betAmount: number,
  onProgress: (p: SimProgress) => void,
  signal?: { cancelled: boolean },
  config: StrategyConfig = PRESET_BASIC,
  chunkSize = 500,
): Promise<SimulationResult> {
  return new Promise(resolve => {
    let state = createInitialState({ id: 'sim', name: 'Bot' });
    state = {
      ...state,
      players: [{ ...state.players[0], bankroll: SIM_BANKROLL }],
    };

    const acc = {
      wins: 0, losses: 0, pushes: 0, blackjacks: 0, reshuffles: 0,
      net: 0, peakNet: 0, troughNet: 0,
    };
    let lastNeedsReshuffle = false;
    let handsCompleted = 0;

    function tick() {
      if (signal?.cancelled) {
        resolve({
          ...acc,
          handsPlayed: handsCompleted,
          betAmount,
          strategyName: config.name,
          net: state.players[0].bankroll - SIM_BANKROLL,
        });
        return;
      }

      const end = Math.min(handsCompleted + chunkSize, numHands);

      for (let i = handsCompleted; i < end; i++) {
        state = playRound(state, betAmount, config);

        if (lastNeedsReshuffle && !state.shoe.needsReshuffle) acc.reshuffles++;
        lastNeedsReshuffle = state.shoe.needsReshuffle;

        tallyRound(state, acc);

        const runningNet = state.players[0].bankroll - SIM_BANKROLL;
        if (runningNet > acc.peakNet) acc.peakNet = runningNet;
        if (runningNet < acc.troughNet) acc.troughNet = runningNet;

        state = gameReducer(state, { type: 'NEXT_ROUND' });
      }

      handsCompleted = end;
      const runningNet = state.players[0].bankroll - SIM_BANKROLL;
      onProgress({ handsCompleted, total: numHands, runningNet });

      if (handsCompleted < numHands) {
        setTimeout(tick, 0);
      } else {
        resolve({
          ...acc,
          handsPlayed: numHands,
          betAmount,
          strategyName: config.name,
          net: runningNet,
        });
      }
    }

    setTimeout(tick, 16);
  });
}
