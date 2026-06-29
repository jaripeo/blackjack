import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GameStats, INITIAL_STATS } from './statsTypes';
import { useGame } from '../controller/GameContext';
import { RULES } from '../engine/rules';

interface StatsContextValue {
  stats: GameStats;
  resetStats: () => void;
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
  // Track the last roundId we've already accounted for so we don't double-count
  // if the component re-renders while phase is still 'round-over'.
  const lastRoundId = useRef<number>(-1);

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
  }, [state.phase, state.roundId]);

  const resetStats = useCallback(() => setStats(makeInitialStats()), []);

  return (
    <StatsContext.Provider value={{ stats, resetStats }}>
      {children}
    </StatsContext.Provider>
  );
};

export function useStats(): StatsContextValue {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be inside <StatsProvider>');
  return ctx;
}
