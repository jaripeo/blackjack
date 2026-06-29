import React from 'react';
import { MPGameState, MPPlayer } from '../types';

interface Props {
  gs: MPGameState;
  myPlayer: MPPlayer | undefined;
  onPlace: (amount: number) => void;
  onClear: () => void;
  onLock: () => void;
  onLeave: () => void;
}

const CHIPS = [
  { amount: 5,   label: '$5',   cls: 'chip-5'   },
  { amount: 25,  label: '$25',  cls: 'chip-25'  },
  { amount: 100, label: '$100', cls: 'chip-100' },
];

export const BettingPhase: React.FC<Props> = ({
  gs, myPlayer, onPlace, onClear, onLock, onLeave,
}) => {
  const locked  = myPlayer?.betLocked ?? false;
  const bet     = myPlayer?.pendingBet ?? 0;
  const canLock = bet >= 5 && !locked;

  return (
    <div className="full-page">
      <div className="top-bar">
        <button className="btn-leave" onClick={onLeave}>← Leave</button>
        <span className="top-bar-title">Place Your Bet</span>
        <span className="room-code-badge">{gs.roomCode}</span>
      </div>

      <div className="bet-body">
        {/* Who's locked in */}
        <div className="lock-status-row">
          {gs.players.map(p => (
            <div key={p.id} className={`lock-chip${p.betLocked ? ' locked' : ''}`}>
              <div className="lock-chip-name">{p.name}</div>
              <div className={p.betLocked ? 'lock-chip-ok' : 'lock-chip-wait'}>
                {p.betLocked ? `✓ $${p.pendingBet}` : '…'}
              </div>
            </div>
          ))}
        </div>

        {/* Bet amount */}
        <div className="bet-display">
          <div className="section-label">YOUR BET</div>
          <div className="bet-amount">${bet}</div>
          <div className="bet-bankroll">
            Bankroll: ${myPlayer?.bankroll.toLocaleString() ?? 0}
          </div>
        </div>

        {/* Chips + buttons */}
        {!locked ? (
          <>
            <div className="chips-row">
              {CHIPS.map(c => (
                <button
                  key={c.amount}
                  className={`chip ${c.cls}`}
                  onClick={() => onPlace(c.amount)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="bet-actions">
              <button className="btn-clear" onClick={onClear}>Clear</button>
              <button className="btn-lock" onClick={onLock} disabled={!canLock}>
                Lock Bet
              </button>
            </div>
          </>
        ) : (
          <div className="wait-banner">
            <span className="spinner-sm" /> Waiting for other players…
          </div>
        )}

        <div className="msg-line">{gs.message}</div>
      </div>
    </div>
  );
};
