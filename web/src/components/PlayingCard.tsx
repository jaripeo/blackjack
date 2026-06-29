import React from 'react';
import { Card } from '../types';

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};
const RED = new Set(['hearts', 'diamonds']);

export const PlayingCard: React.FC<{ card: Card }> = ({ card }) => {
  if (!card.faceUp) {
    return (
      <div className="card card-back">
        <span className="card-back-inner">♠</span>
      </div>
    );
  }

  const suit = SUIT_SYMBOL[card.suit] ?? card.suit;
  const colorClass = RED.has(card.suit) ? 'card-red' : 'card-black';

  return (
    <div className={`card card-face ${colorClass}`}>
      <span className="card-corner">{card.rank}</span>
      <span className="card-center">{suit}</span>
      <span className="card-corner card-corner-bottom">{card.rank}</span>
    </div>
  );
};
