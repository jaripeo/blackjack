import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useGame } from '../controller/GameContext';
import { HandView } from '../components/HandView';
import { BetControls } from '../components/BetControls';
import { ActionBar } from '../components/ActionBar';
import { StatsModal } from '../components/StatsModal';
import { handTotal } from '../engine/handValue';
import { cardsRemaining, visibleDealerTotal } from '../engine/selectors';
import { theme } from '../theme/theme';

export const GameScreen: React.FC = () => {
  const { state, controller } = useGame();
  const player = state.players[0];
  const [statsOpen, setStatsOpen] = useState(false);

  const dealerRevealed =
    state.phase === 'dealer-turn' || state.phase === 'round-over';
  const dealerTotal = state.dealer.cards.length
    ? dealerRevealed
      ? handTotal(state.dealer.cards)
      : visibleDealerTotal(state.dealer.cards)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => setStatsOpen(true)} hitSlop={12} style={styles.statsBtn}>
          <Text style={styles.statsIcon}>◈</Text>
          <Text style={styles.statsLabel}>Stats</Text>
        </Pressable>

        <Text style={styles.bankroll}>${player.bankroll.toLocaleString()}</Text>

        <Text style={styles.shoe}>Shoe {cardsRemaining(state)}</Text>
      </View>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.table}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.area}>
          <Text style={styles.areaLabel}>DEALER</Text>
          <HandView cards={state.dealer.cards} total={dealerTotal} />
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.message}>{state.message}</Text>
        </View>

        <View style={styles.area}>
          <Text style={styles.areaLabel}>{player.name.toUpperCase()}</Text>
          {player.hands.length === 0 ? (
            <HandView cards={[]} />
          ) : (
            player.hands.map((hand, i) => (
              <HandView
                key={hand.id}
                cards={hand.cards}
                total={handTotal(hand.cards)}
                bet={hand.bet}
                result={hand.result}
                active={
                  state.phase === 'player-turn' &&
                  state.activePlayerIndex === 0 &&
                  player.activeHandIndex === i
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Controls ───────────────────────────────────────────────── */}
      <View style={styles.controls}>
        {state.phase === 'betting' && <BetControls />}
        {state.phase === 'player-turn' && <ActionBar />}
        {state.phase === 'dealer-turn' && (
          <Text style={styles.waiting}>Dealer is playing…</Text>
        )}
        {state.phase === 'round-over' && (
          <Pressable
            style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            onPress={() => controller.nextRound()}
          >
            <Text style={styles.nextText}>New Round</Text>
          </Pressable>
        )}
      </View>

      <StatsModal visible={statsOpen} onClose={() => setStatsOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.felt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    backgroundColor: theme.colors.feltDark,
  },
  statsBtn: { alignItems: 'center', gap: 1 },
  statsIcon: { color: theme.colors.textMuted, fontSize: 18 },
  statsLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  bankroll: { color: theme.colors.gold, fontSize: 18, fontWeight: '900' },
  shoe: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  table: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(2),
  },
  area: { alignItems: 'center', gap: theme.spacing(1) },
  areaLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  messageBox: { alignItems: 'center', paddingVertical: theme.spacing(1.5) },
  message: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: theme.spacing(3),
  },
  controls: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
    backgroundColor: theme.colors.feltDark,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    minHeight: 150,
    justifyContent: 'center',
  },
  waiting: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  next: {
    backgroundColor: theme.colors.gold,
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    alignItems: 'center',
  },
  nextText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
