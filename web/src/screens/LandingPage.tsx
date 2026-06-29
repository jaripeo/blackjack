import React, { useState } from 'react';

interface Props {
  onHost: (name: string) => void;
  onJoin: (code: string, name: string) => void;
}

export const LandingPage: React.FC<Props> = ({ onHost, onJoin }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const trimmed  = name.trim();
  const canHost  = trimmed.length > 0;
  const canJoin  = trimmed.length > 0 && code.length === 4;

  return (
    <div className="page">
      <div className="landing-hero">
        <div className="landing-suits">♠ &nbsp; ♥ &nbsp; ♦ &nbsp; ♣</div>
        <div className="landing-title">BLACKJACK</div>
        <div className="landing-subtitle">6-Deck Casino Shoe · Multiplayer</div>
      </div>

      <div className="landing-menu">
        <div className="mp-card">
          <div className="mp-title">Play with Friends</div>

          <input
            className="name-input"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 20))}
            placeholder="Your name"
            maxLength={20}
            autoComplete="off"
          />

          <button
            className="btn-host"
            onClick={() => canHost && onHost(trimmed)}
            disabled={!canHost}
          >
            Host a Game
          </button>

          <div className="divider"><span>or join one</span></div>

          <div className="join-row">
            <input
              className="code-input"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              inputMode="numeric"
            />
            <button
              className="btn-join"
              onClick={() => canJoin && onJoin(code, trimmed)}
              disabled={!canJoin}
            >
              Join
            </button>
          </div>

          <div className="mp-hint">Enter your name first, then host or join.</div>
        </div>
      </div>

      <div className="landing-footer">Free · No download · Works on any device</div>
    </div>
  );
};
