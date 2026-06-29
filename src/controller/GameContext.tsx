import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GameController } from './GameController';
import { LocalGameController } from './LocalGameController';
import { GameState } from '../engine/types';

// ---------------------------------------------------------------------------
// React binding for the GameController.
//
// This is the only file that decides WHICH controller backs the app. To go
// multiplayer in Phase 2, construct a SocketGameController here instead — the
// context value (`state` + `controller`) and every consumer stay identical.
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  controller: GameController;
}

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Create the controller once. Swap this line in Phase 2:
  //   new SocketGameController(socket, roomCode)
  const controllerRef = useRef<GameController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new LocalGameController({
      playerId: 'local',
      playerName: 'You',
    });
  }
  const controller = controllerRef.current;

  const [state, setState] = useState<GameState>(() => controller.getState());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);

  const value = useMemo<GameContextValue>(
    () => ({ state, controller }),
    [state, controller],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

/** Access the current game state and the controller's intent methods. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a <GameProvider>.');
  }
  return ctx;
}
