import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/controller/GameContext';
import { StatsProvider } from './src/stats/StatsContext';
import { LandingScreen } from './src/screens/LandingScreen';
import { GameScreen } from './src/screens/GameScreen';
import { SimulationScreen } from './src/screens/SimulationScreen';
import { MultiplayerGameScreen } from './src/screens/MultiplayerGameScreen';
import { BottomTabs, AppScreen } from './src/navigation/BottomTabs';

// ---------------------------------------------------------------------------
// Screen union.
//
//   landing
//     ├── game / simulation   (solo, with BottomTabs)
//     └── mp-game             (multiplayer, full-screen, no tabs)
// ---------------------------------------------------------------------------

type SoloScreen = 'game' | 'simulation';

type Screen =
  | 'landing'
  | SoloScreen
  | 'mp-game';

interface MPParams {
  mode: 'host' | 'join';
  joinCode?: string;
  playerName: string;
}

export default function App() {
  const [screen, setScreen]   = useState<Screen>('landing');
  const [mpParams, setMpParams] = useState<MPParams | null>(null);

  function goMultiplayer(params: MPParams) {
    setMpParams(params);
    setScreen('mp-game');
  }

  return (
    // GameProvider + StatsProvider only wrap the solo game paths.
    // MultiplayerGameScreen manages its own state via useMultiplayerGame(),
    // so it sits outside these providers — the Phase 2 simulator is unaffected.
    <GameProvider>
      <StatsProvider>
        <StatusBar style="light" />

        {screen === 'landing' && (
          <LandingScreen
            onPlaySolo={() => setScreen('game')}
            onHostMultiplayer={name => goMultiplayer({ mode: 'host', playerName: name })}
            onJoinMultiplayer={(code, name) =>
              goMultiplayer({ mode: 'join', joinCode: code, playerName: name })
            }
          />
        )}

        {(screen === 'game' || screen === 'simulation') && (
          <View style={s.shell}>
            {screen === 'game'       && <GameScreen />}
            {screen === 'simulation' && <SimulationScreen />}
            <BottomTabs
              current={screen as AppScreen}
              onChange={next => setScreen(next)}
              onExit={() => setScreen('landing')}
            />
          </View>
        )}

        {screen === 'mp-game' && mpParams && (
          <MultiplayerGameScreen
            mode={mpParams.mode}
            joinCode={mpParams.joinCode}
            playerName={mpParams.playerName}
            onLeave={() => setScreen('landing')}
          />
        )}
      </StatsProvider>
    </GameProvider>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1 },
});
