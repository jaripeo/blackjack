import React from 'react';
import { MPGameState } from '../types';

interface Props {
  gs: MPGameState;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export const WaitingRoom: React.FC<Props> = ({ gs, isHost, onStart, onLeave }) => (
  <div className="full-page">
    <div className="top-bar">
      <button className="btn-leave" onClick={onLeave}>← Leave</button>
      <span className="top-bar-title">Waiting Room</span>
      <div style={{ width: 64 }} />
    </div>

    <div className="wr-body">
      <div className="code-card">
        <div className="section-label">ROOM CODE</div>
        <div className="code-value">{gs.roomCode}</div>
        <div className="code-sub">Share this with friends to join</div>
      </div>

      <div className="section-label" style={{ marginBottom: 8 }}>
        PLAYERS ({gs.players.length})
      </div>
      <div className="player-list">
        {gs.players.map((p, i) => (
          <div key={p.id} className="player-row">
            <span className="player-row-name">
              {p.name}{i === 0 ? ' (Host)' : ''}
            </span>
            <span className={p.isConnected ? 'dot green' : 'dot red'}>●</span>
          </div>
        ))}
      </div>

      <div className="msg-line">{gs.message}</div>
    </div>

    <div className="bottom-bar">
      {isHost ? (
        <button className="btn-primary" onClick={onStart}>
          Start Game
        </button>
      ) : (
        <div className="wait-banner">Waiting for the host to start…</div>
      )}
    </div>
  </div>
);
