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
} from './statsTypes';
import { useGame } from '../controller/GameContext';
import { RULES } from '../engine/rules';

interface StatsContextValue {
  stats: GameStats;
  lifetime: LifetimeStats;
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
  const lastRoundId = useRef<number>(-1);

  useEffect(() => {
    AsyncStorage.getItem(LIFETIME_STATS_KEY)
      .then(raw => { if (raw) setLifetime(JSON.parse(raw) as LifetimeStats); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (state.phase !== 'round-over') return;
    if (state.roundId === lastRoundId.current) return;
    lastRoundId.current = state.roundId;

    const player = state.players[0];
    let wins = 0, losses = 0, pushes = 0, blackjacks = 0;

    for (const hand of player.hands) {
      switch (hand.result) {
        case 'blackjack': wins++; blackjacks++; break;
        case 'win':       wins++;               break;
        case 'lose':      losses++;             break;
        case 'push':      pushes++;             break;
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
        totalHands:      prev.totalHands      + player.hands.length,
        totalWins:       prev.totalWins       + wins,
        totalLosses:     prev.totalLosses     + losses,
        totalPushes:     prev.totalPushes     + pushes,
        totalBlackjacks: prev.totalBlackjacks + blackjacks,
      };
      AsyncStorage.setItem(LIFETIME_STATS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [state.phase, state.roundId]);

  const resetStats = useCallback(() => setStats(makeInitialStats()), []);

  const resetLifetime = useCallback(() => {
    setLifetime(INITIAL_LIFETIME_STATS);
    AsyncStorage.removeItem(LIFETIME_STATS_KEY).catch(() => {});
  }, []);

  return (
    <StatsContext.Provider value={{ stats, lifetime, resetStats, resetLifetime }}>
      {children}
    </StatsContext.Provider>
  );
};

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be inside <StatsProvider>');
  return ctx;
}
