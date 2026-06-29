import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, HandResult } from '../engine/types';
import { PlayingCard } from './PlayingCard';
import { theme } from '../theme/theme';

const RESULT_LABEL: Record<HandResult, string> = {
  win: 'WIN',
  lose: 'LOSE',
  push: 'PUSH',
  blackjack: 'BLACKJACK',
};

function resultColor(result: HandResult): string {
  switch (result) {
    case 'win':
    case 'blackjack':
      return theme.colors.success;
    case 'push':
      return theme.colors.push;
    case 'lose':
    default:
      return theme.colors.danger;
  }
}

interface Props {
  cards: Card[];
  total?: number | null;
  bet?: number;
  result?: HandResult;
  active?: boolean;
}

export const HandView: React.FC<Props> = ({
  cards,
  total,
  bet,
  result,
  active,
}) => {
  return (
    <View style={[styles.wrap, active && styles.active]}>
      <View style={styles.cardsRow}>
        {cards.length === 0 ? (
          <View style={styles.placeholder} />
        ) : (
          cards.map((card, i) => (
            <View key={i} style={i > 0 ? styles.overlap : undefined}>
              <PlayingCard card={card} />
            </View>
          ))
        )}
      </View>

      <View style={styles.meta}>
        {total != null && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{total}</Text>
          </View>
        )}
        {bet != null && bet > 0 && <Text style={styles.bet}>${bet}</Text>}
        {result && (
          <Text style={[styles.result, { color: resultColor(result) }]}>
            {RESULT_LABEL[result]}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(1),
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  active: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.overlay,
  },
  cardsRow: {
    flexDirection: 'row',
    minHeight: 88,
    alignItems: 'center',
  },
  overlap: { marginLeft: -30 },
  placeholder: {
    width: 62,
    height: 88,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.75),
  },
  totalBadge: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 3,
    minWidth: 34,
    alignItems: 'center',
  },
  totalText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  bet: {
    color: theme.colors.gold,
    fontWeight: '700',
    fontSize: 14,
  },
  result: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});
