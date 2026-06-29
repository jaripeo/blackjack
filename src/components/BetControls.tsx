import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../controller/GameContext';
import { RULES } from '../engine/rules';
import { theme } from '../theme/theme';

const CHIPS = [5, 25, 100] as const;

function chipColor(value: number): string {
  if (value === 5) return theme.colors.chip5;
  if (value === 25) return theme.colors.chip25;
  return theme.colors.chip100;
}

export const BetControls: React.FC = () => {
  const { state, controller } = useGame();
  const player = state.players[0];
  const canDeal = player.pendingBet >= RULES.minBet;

  return (
    <View style={styles.wrap}>
      <View style={styles.betRow}>
        <Text style={styles.betLabel}>BET</Text>
        <Text style={styles.betValue}>${player.pendingBet}</Text>
      </View>

      <View style={styles.chips}>
        {CHIPS.map((value) => {
          const disabled = player.pendingBet + value > player.bankroll;
          return (
            <Pressable
              key={value}
              disabled={disabled}
              onPress={() => controller.placeBet(value)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: chipColor(value) },
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.pressed,
              ]}
            >
              <Text style={styles.chipText}>{value}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => controller.clearBet()}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: theme.colors.chipClear },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.chipText}>C</Text>
        </Pressable>
      </View>

      <Pressable
        disabled={!canDeal}
        onPress={() => controller.deal()}
        style={({ pressed }) => [
          styles.deal,
          !canDeal && styles.dealDisabled,
          pressed && canDeal && styles.pressed,
        ]}
      >
        <Text style={styles.dealText}>DEAL</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: theme.spacing(1.5) },
  betRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing(1) },
  betLabel: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 12,
  },
  betValue: { color: theme.colors.gold, fontWeight: '900', fontSize: 24 },
  chips: { flexDirection: 'row', gap: theme.spacing(1.25) },
  chip: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
    borderStyle: 'dashed',
  },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  deal: {
    backgroundColor: theme.colors.gold,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(8),
    borderRadius: theme.radius.pill,
  },
  dealDisabled: { opacity: 0.4 },
  dealText: {
    color: theme.colors.feltDark,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
