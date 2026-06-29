import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameStats,
  LifetimeStats,
  INITIAL_STATS,
  INITIAL_LIFETIME_STATS,
  LIFETIME_STATS_KEY,
  ROUND_HISTORY_KEY,
} from './statsTypes';
import { useGame } from '../controller/GameContext';
import { RULES } from '../engine/rules';

const MAX_HISTORY = 500;

interface StatsContextValue {
  stats: GameStats;
  lifetime: LifetimeStats;
  roundHistory: number[];
  resetStats: () => void;
  resetLifetime: () => void;
}

const StatsContext = createContext<StatsContextValue | null>(null);

function makeInitialStats(): GameStats {
  return {
    ...INITIAL_STATS,
    peakBankroll: RULES.startingBankroll,
    sessionStartBankroll: RULES.startingBankroll,
  };
}

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state } = useGame();
  const [stats, setStats] = useState<GameStats>(makeInitialStats);
  const [lifetime, setLifetime] = useState<LifetimeStats>(INITIAL_LIFETIME_STATS);
  const [roundHistory, setRoundHistory] = useState<number[]>([]);
  const lastRoundId = useRef<number>(-1);

  useEffect(() => {
    AsyncStorage.getItem(LIFETIME_STATS_KEY)
      .then(raw => { if (raw) setLifetime({ ...INITIAL_LIFETIME_STATS, ...JSON.parse(raw) }); })
      .catch(() => {});
    AsyncStorage.getItem(ROUND_HISTORY_KEY)
      .then(raw => { if (raw) setRoundHistory(JSON.parse(raw) as number[]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state.phase !== 'round-over') return;
    if (state.roundId === lastRoundId.current) return;
    lastRoundId.current = state.roundId;

    const player = state.players[0];
    let wins = 0, losses = 0, pushes = 0, blackjacks = 0;
    let amountWon = 0, amountLost = 0, amountWagered = 0;

    for (const hand of player.hands) {
      switch (hand.result) {
        case 'blackjack':
          wins++; blackjacks++;
          amountWon += Math.floor(hand.bet * RULES.blackjackPayout);
          amountWagered += hand.bet;
          break;
        case 'win':
          wins++;
          amountWon += hand.bet;
          amountWagered += hand.bet;
          break;
        case 'lose':
          losses++;
          amountLost += hand.bet;
          amountWagered += hand.bet;
          break;
        case 'push':
          pushes++;
          amountWagered += hand.bet;
          break;
      }
    }

    setStats(prev => ({
      ...prev,
      handsPlayed: prev.handsPlayed + player.hands.length,
      wins:        prev.wins    + wins,
      losses:      prev.losses  + losses,
      pushes:      prev.pushes  + pushes,
      blackjacks:  prev.blackjacks + blackjacks,
      peakBankroll: Math.max(prev.peakBankroll, player.bankroll),
    }));

    setLifetime(prev => {
      const next: LifetimeStats = {
        totalHands:         prev.totalHands         + player.hands.length,
        totalWins:          prev.totalWins          + wins,
        totalLosses:        prev.totalLosses        + losses,
        totalPushes:        prev.totalPushes        + pushes,
        totalBlackjacks:    prev.totalBlackjacks    + blackjacks,
        totalAmountWon:     prev.totalAmountWon     + amountWon,
        totalAmountLost:    prev.totalAmountLost    + amountLost,
        totalAmountWagered: prev.totalAmountWagered + amountWagered,
      };
      AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

    const netChange = amountWon - amountLost;
    setRoundHistory(prev => {
      const next = [...prev, netChange].slice(-MAX_HISTORY);
      AsyncStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [state.phase, state.roundId]);

  const resetStats = useCallback(() => setStats(makeInitialStats()), []);

  const resetLifetime = useCallback(() => {
    setLifetime(INITIAL_LIFETIME_STATS);
    setRoundHistory([]);
    AsyncStorage.removeItem(LIFETIME_STATS_KEY).catch(() => {});
    AsyncStorage.removeItem(ROUND_HISTORY_KEY).catch(() => {});
  }, []);

  return (
    <StatsContext.Provider value={{ stats, lifetime, roundHistory, resetStats, resetLifetime }}>
      {children}
    </StatsContext.Provider>
  );
};

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be inside <StatsProvider>');
  return ctx;
}
