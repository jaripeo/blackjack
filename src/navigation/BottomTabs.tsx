import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

export type AppScreen = 'game' | 'simulation';

interface Props {
  current: AppScreen;
  onChange: (s: AppScreen) => void;
  onExit: () => void;
}

interface TabDef {
  screen: AppScreen;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { screen: 'game',       label: 'Play',     icon: '♠' },
  { screen: 'simulation', label: 'Simulate', icon: '◈' },
];

export const BottomTabs: React.FC<Props> = ({ current, onChange, onExit }) => (
  <View style={s.bar}>
    {/* Exit sits to the far left, visually separated */}
    <Pressable
      style={({ pressed }) => [s.exit, pressed && s.pressed]}
      onPress={onExit}
      hitSlop={8}
    >
      <Text style={s.exitIcon}>✕</Text>
      <Text style={s.exitLabel}>Exit</Text>
    </Pressable>

    <View style={s.divider} />

    {TABS.map(t => {
      const active = t.screen === current;
      return (
        <Pressable
          key={t.screen}
          style={({ pressed }) => [s.tab, active && s.tabActive, pressed && s.pressed]}
          onPress={() => onChange(t.screen)}
        >
          <Text style={[s.icon, active && s.iconActive]}>{t.icon}</Text>
          <Text style={[s.label, active && s.labelActive]}>{t.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.feltDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 20, // safe area buffer
    paddingTop: 8,
    paddingHorizontal: theme.spacing(1),
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  tabActive: { backgroundColor: 'rgba(212,175,55,0.12)' },
  icon: { fontSize: 20, color: theme.colors.textMuted },
  iconActive: { color: theme.colors.gold },
  label: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },
  labelActive: { color: theme.colors.gold },
  exit: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: theme.spacing(1.5), gap: 2 },
  exitIcon: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  exitLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
  pressed: { opacity: 0.7 },
});
