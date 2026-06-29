import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { LandingPage }   from './screens/LandingPage';
import { WaitingRoom }   from './screens/WaitingRoom';
import { BettingPhase }  from './screens/BettingPhase';
import { GameTable }     from './screens/GameTable';

interface MPParams {
  mode: 'host' | 'join';
  joinCode?: string;
  playerName: string;
}

export const App: React.FC = () => {
  const [params, setParams] = useState<MPParams | null>(null);
  const didConnect = useRef(false);

  const {
    gameState, myId, status, error,
    createRoom, joinRoom,
    startGame, placeBet, clearBet, lockBet,
    playerAction, nextRound, leaveRoom,
  } = useMultiplayerGame();

  // Connect to server when params are set
  useEffect(() => {
    if (!params || didConnect.current) return;
    didConnect.current = true;
    if (params.mode === 'host') {
      createRoom(params.playerName);
    } else {
      joinRoom(params.joinCode ?? '', params.playerName);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = () => {
    leaveRoom();
    didConnect.current = false;
    setParams(null);
  };

  // ── Landing ───────────────────────────────────────────────────────────────
  if (!params) {
    return (
      <LandingPage
        onHost={name => setParams({ mode: 'host', playerName: name })}
        onJoin={(code, name) => setParams({ mode: 'join', joinCode: code, playerName: name })}
      />
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error' || status === 'disconnected') {
    return (
      <div className="center-page">
        <div className="error-icon">!</div>
        <div className="error-msg">
          {status === 'disconnected' ? 'Disconnected from server.' : (error ?? 'Connection failed.')}
        </div>
        <button className="btn-back" onClick={handleLeave}>Go Back</button>
      </div>
    );
  }

  // ── Connecting / no state yet ─────────────────────────────────────────────
  if (!gameState || status === 'connecting' || status === 'idle') {
    return (
      <div className="center-page">
        <div className="spinner" />
        <div className="spinner-label">Connecting…</div>
      </div>
    );
  }

  // ── Game screens ──────────────────────────────────────────────────────────
  const isHost   = myId === gameState.hostId;
  const myPlayer = gameState.players.find(p => p.id === myId);

  switch (gameState.phase) {
    case 'waiting':
      return (
        <WaitingRoom
          gs={gameState}
          isHost={isHost}
          onStart={startGame}
          onLeave={handleLeave}
        />
      );

    case 'betting':
      return (
        <BettingPhase
          gs={gameState}
          myPlayer={myPlayer}
          onPlace={placeBet}
          onClear={clearBet}
          onLock={lockBet}
          onLeave={handleLeave}
        />
      );

    case 'player-turn':
    case 'dealer-turn':
    case 'round-over':
      return (
        <GameTable
          gs={gameState}
          myId={myId}
          onAction={playerAction}
          onNextRound={nextRound}
          onLeave={handleLeave}
        />
      );
  }
};
