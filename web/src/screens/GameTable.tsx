import React from 'react';
import { MPGameState, handTotal } from '../types';
import { HandView } from '../components/HandView';

interface Props {
  gs: MPGameState;
  myId: string | null;
  onAction: (a: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') => void;
  onNextRound: () => void;
  onLeave: () => void;
}

export const GameTable: React.FC<Props> = ({
  gs, myId, onAction, onNextRound, onLeave,
}) => {
  const activePlayer = gs.players[gs.activePlayerIndex];
  const isMyTurn     = gs.phase === 'player-turn' && activePlayer?.id === myId;
  const myPlayer     = gs.players.find(p => p.id === myId);
  const myHand       = myPlayer?.hands[myPlayer.activeHandIndex ?? 0];

  const dealerRevealed = gs.phase === 'dealer-turn' || gs.phase === 'round-over';
  const visibleCards   = gs.dealer.cards.filter(c => c.faceUp);
  const dealerTotal    = visibleCards.length
    ? handTotal(visibleCards)
    : null;
  const fullTotal = dealerRevealed && gs.dealer.cards.length
    ? handTotal(gs.dealer.cards)
    : null;
  const shownTotal = fullTotal ?? dealerTotal;

  const showDouble = isMyTurn
    && (myHand?.cards.length ?? 0) === 2
    && (myPlayer?.bankroll ?? 0) >= (myHand?.bet ?? Infinity);
  const showSplit  = isMyTurn
    && (myHand?.cards.length ?? 0) === 2
    && myHand!.cards[0].rank === myHand!.cards[1].rank
    && (myPlayer?.bankroll ?? 0) >= (myHand?.bet ?? Infinity);

  return (
    <div className="full-page">
      {/* Header */}
      <div className="top-bar">
        <button className="btn-leave" onClick={onLeave}>← Leave</button>
        <span className="room-code-badge">{gs.roomCode}</span>
        <span className="bankroll-label">${myPlayer?.bankroll.toLocaleString() ?? 0}</span>
      </div>

      {/* Scrollable table */}
      <div className="table-scroll">
        <div className="table-section">
          <div className="section-label">
            DEALER{shownTotal !== null ? `  ${shownTotal}` : ''}
          </div>
          <HandView cards={gs.dealer.cards} total={shownTotal} />
        </div>

        <div className="msg-bar">{gs.message}</div>

        {gs.players.map((p, pi) => {
          const isActive = gs.phase === 'player-turn' && pi === gs.activePlayerIndex;
          return (
            <div key={p.id} className={`player-area${isActive ? ' active' : ''}`}>
              <div className="player-area-header">
                <span className={`player-name${p.id === myId ? ' me' : ''}`}>
                  {p.name}{p.id === myId ? ' (You)' : ''}{isActive ? '  ▶' : ''}
                </span>
                <span className="player-bank">${p.bankroll.toLocaleString()}</span>
              </div>

              {p.hands.length === 0
                ? <span className="sitting-out">Sitting out</span>
                : p.hands.map((hand, hi) => (
                    <HandView
                      key={hand.id}
                      cards={hand.cards}
                      total={handTotal(hand.cards)}
                      bet={hand.bet}
                      result={hand.result}
                      active={isActive && p.activeHandIndex === hi}
                    />
                  ))
              }
            </div>
          );
        })}
      </div>

      {/* Footer — actions */}
      <div className="table-footer">
        {gs.phase === 'round-over' ? (
          <button className="btn-primary" onClick={onNextRound}>Next Round</button>
        ) : isMyTurn ? (
          <div className="action-row">
            <button className="btn-action gold"  onClick={() => onAction('HIT')}>Hit</button>
            <button className="btn-action muted" onClick={() => onAction('STAND')}>Stand</button>
            {showDouble && (
              <button className="btn-action muted" onClick={() => onAction('DOUBLE')}>Double</button>
            )}
            {showSplit && (
              <button className="btn-action muted" onClick={() => onAction('SPLIT')}>Split</button>
            )}
          </div>
        ) : gs.phase === 'player-turn' ? (
          <div className="wait-banner">
            Waiting for {activePlayer?.name ?? 'other player'}…
          </div>
        ) : null}
      </div>
    </div>
  );
};
