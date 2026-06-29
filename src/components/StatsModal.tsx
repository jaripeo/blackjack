import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useGame } from '../controller/GameContext';
import { useStats } from '../stats/StatsContext';
import { theme } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function pct(n: number, of: number): string {
  return of === 0 ? '—' : `${((n / of) * 100).toFixed(1)}%`;
}

function signed(n: number): string {
  if (n === 0) return '$0';
  return n > 0 ? `+$${n.toLocaleString()}` : `-$${Math.abs(n).toLocaleString()}`;
}

const Row: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <View style={row.wrap}>
    <Text style={row.label}>{label}</Text>
    <Text style={[row.value, accent ? { color: accent } : null]}>{value}</Text>
  </View>
);

export const StatsModal: React.FC<Props> = ({ visible, onClose }) => {
  const { state } = useGame();
  const { stats, lifetime, resetStats, resetLifetime } = useStats();

  const currentBankroll = state.players[0].bankroll;
  const net = currentBankroll - stats.sessionStartBankroll;
  const sessionDecisive = stats.wins + stats.losses + stats.pushes;
  const lifetimeDecisive = lifetime.totalWins + lifetime.totalLosses + lifetime.totalPushes;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <View style={s.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
          >
            {/* ── ALL TIME ─────────────────────────────── */}
            <Text style={s.sectionTitle}>All Time</Text>

            <Row label="Hands Played" value={String(lifetime.totalHands)} />
            <Row
              label="Wins"
              value={`${lifetime.totalWins}  (${pct(lifetime.totalWins, lifetimeDecisive)})`}
              accent={theme.colors.success}
            />
            <Row
              label="Losses"
              value={`${lifetime.totalLosses}  (${pct(lifetime.totalLosses, lifetimeDecisive)})`}
              accent={theme.colors.danger}
            />
            <Row
              label="Pushes"
              value={`${lifetime.totalPushes}  (${pct(lifetime.totalPushes, lifetimeDecisive)})`}
              accent={theme.colors.push}
            />
            <Row
              label="Natural Blackjacks"
              value={String(lifetime.totalBlackjacks)}
              accent={theme.colors.gold}
            />

            <Pressable
              onPress={() => resetLifetime()}
              style={s.resetAllTimeBtn}
            >
              <Text style={s.resetAllTimeText}>Reset all-time stats</Text>
            </Pressable>

            <View style={s.divider} />

            {/* ── THIS SESSION ─────────────────────────── */}
            <Text style={s.sectionTitle}>This Session</Text>

            <Row label="Hands Played" value={String(stats.handsPlayed)} />
            <Row
              label="Wins"
              value={`${stats.wins}  (${pct(stats.wins, sessionDecisive)})`}
              accent={theme.colors.success}
            />
            <Row
              label="Losses"
              value={`${stats.losses}  (${pct(stats.losses, sessionDecisive)})`}
              accent={theme.colors.danger}
            />
            <Row
              label="Pushes"
              value={`${stats.pushes}  (${pct(stats.pushes, sessionDecisive)})`}
              accent={theme.colors.push}
            />
            <Row
              label="Natural Blackjacks"
              value={String(stats.blackjacks)}
              accent={theme.colors.gold}
            />

            <View style={s.divider} />

            <Row
              label="Starting Bankroll"
              value={`$${stats.sessionStartBankroll.toLocaleString()}`}
            />
            <Row
              label="Current Bankroll"
              value={`$${currentBankroll.toLocaleString()}`}
            />
            <Row
              label="Peak Bankroll"
              value={`$${stats.peakBankroll.toLocaleString()}`}
              accent={theme.colors.gold}
            />
            <Row
              label="Net"
              value={signed(net)}
              accent={net >= 0 ? theme.colors.success : theme.colors.danger}
            />
          </ScrollView>

          <View style={s.actions}>
            <Pressable
              style={s.resetBtn}
              onPress={() => {
                resetStats();
                onClose();
              }}
            >
              <Text style={s.resetText}>Reset Session</Text>
            </Pressable>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  label: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  value: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
});

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.feltDark,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(5),
    paddingTop: theme.spacing(2),
    maxHeight: '82%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing(0.5),
  },
  scroll: { paddingBottom: theme.spacing(1) },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: theme.spacing(1.5),
  },
  resetAllTimeBtn: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  resetAllTimeText: {
    color: theme.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(3),
  },
  resetBtn: {
    flex: 1,
    paddingVertical: theme.spacing(1.75),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    alignItems: 'center',
  },
  resetText: { color: theme.colors.danger, fontWeight: '700', fontSize: 14 },
  closeBtn: {
    flex: 2,
    paddingVertical: theme.spacing(1.75),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
  },
  closeText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 16 },
});
