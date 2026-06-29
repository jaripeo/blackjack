import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Suit } from '../engine/types';
import { theme } from '../theme/theme';

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

interface Props {
  card: Card;
  size?: 'sm' | 'md';
}

export const PlayingCard: React.FC<Props> = ({ card, size = 'md' }) => {
  const dims = size === 'sm' ? styles.sm : styles.md;

  if (!card.faceUp) {
    return (
      <View style={[styles.card, dims, styles.back]}>
        <View style={styles.backInner} />
      </View>
    );
  }

  const color = RED_SUITS.includes(card.suit)
    ? theme.colors.cardRed
    : theme.colors.cardBlack;
  const symbol = SUIT_SYMBOL[card.suit];

  return (
    <View style={[styles.card, dims]}>
      <Text style={[styles.cornerTop, { color }]}>
        {card.rank}
        {symbol}
      </Text>
      <Text style={[styles.pip, { color }]}>{symbol}</Text>
      <Text style={[styles.cornerBottom, { color }]}>
        {card.rank}
        {symbol}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardWhite,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  md: { width: 62, height: 88 },
  sm: { width: 46, height: 66 },
  cornerTop: {
    position: 'absolute',
    top: 4,
    left: 5,
    fontSize: 13,
    fontWeight: '700',
  },
  cornerBottom: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    fontSize: 13,
    fontWeight: '700',
    transform: [{ rotate: '180deg' }],
  },
  pip: { fontSize: 26, fontWeight: '700' },
  back: {
    backgroundColor: theme.colors.cardBack,
    padding: 5,
  },
  backInner: {
    flex: 1,
    width: '100%',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.cardBackAccent,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
