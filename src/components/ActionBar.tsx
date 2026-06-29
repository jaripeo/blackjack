import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../controller/GameContext';
import { canSplit } from '../engine/handValue';
import { getActiveHand, getActivePlayer } from '../engine/selectors';
import { theme } from '../theme/theme';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  emphasis?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  disabled,
  emphasis,
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      emphasis && styles.emphasis,
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
    ]}
  >
    <Text style={[styles.label, emphasis && styles.labelEmphasis]}>{label}</Text>
  </Pressable>
);

export const ActionBar: React.FC = () => {
  const { state, controller } = useGame();
  const player = getActivePlayer(state);
  const hand = getActiveHand(state);

  const onFirstTwo = hand?.cards.length === 2;
  const canDouble = !!hand && !!player && onFirstTwo && player.bankroll >= hand.bet;
  const canSplitNow =
    !!hand && !!player && canSplit(hand) && player.bankroll >= hand.bet;

  return (
    <View style={styles.row}>
      <ActionButton label="Hit" emphasis onPress={() => controller.hit()} />
      <ActionButton label="Stand" emphasis onPress={() => controller.stand()} />
      <ActionButton
        label="Double"
        onPress={() => controller.double()}
        disabled={!canDouble}
      />
      <ActionButton
        label="Split"
        onPress={() => controller.split()}
        disabled={!canSplitNow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing(1), justifyContent: 'center' },
  button: {
    flex: 1,
    paddingVertical: theme.spacing(1.75),
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  emphasis: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  label: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
  labelEmphasis: { color: theme.colors.feltDark },
});
