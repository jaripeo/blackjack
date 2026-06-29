import React from 'react';
import { Card, HandResult, handTotal } from '../types';
import { PlayingCard } from './PlayingCard';

interface Props {
  cards: Card[];
  total?: number | null;
  bet?: number;
  result?: HandResult;
  active?: boolean;
}

const RESULT_LABEL: Record<HandResult, string> = {
  win: 'WIN', lose: 'LOSE', push: 'PUSH', blackjack: 'BLACKJACK',
};

export const HandView: React.FC<Props> = ({ cards, total, bet, result, active }) => {
  const visibleCards = cards.filter(c => c.faceUp);
  const displayTotal = total !== undefined && total !== null
    ? total
    : visibleCards.length > 0 ? handTotal(cards) : null;

  return (
    <div className={`hand-wrap${active ? ' hand-active' : ''}`}>
      <div className="hand-cards">
        {cards.length === 0
          ? <span className="hand-empty">—</span>
          : cards.map((c, i) => <PlayingCard key={i} card={c} />)
        }
      </div>
      {(displayTotal || bet !== undefined || result) && (
        <div className="hand-meta">
          {displayTotal !== null && displayTotal > 0 && (
            <span className="hand-total">{displayTotal}</span>
          )}
          {bet !== undefined && <span className="hand-bet">${bet}</span>}
          {result && (
            <span className={`hand-result hand-result-${result}`}>
              {RESULT_LABEL[result]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
