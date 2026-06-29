import React, { useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { runSimulationAsync, SimulationResult, SimProgress } from '../simulation/simulator';
import { PRESET_BASIC, StrategyConfig } from '../simulation/strategyConfig';
import { StrategyEditor } from '../components/StrategyEditor';
import { theme } from '../theme/theme';

const HAND_OPTIONS = [100, 1_000, 10_000] as const;
const BET_OPTIONS  = [5, 25, 100]         as const;
type HandCount = typeof HAND_OPTIONS[number];
type BetAmount = typeof BET_OPTIONS[number];

function pct(n: number, of: number): string {
  return of === 0 ? '—' : `${((n / of) * 100).toFixed(2)}%`;
}

function signed(n: number): string {
  const abs = Math.abs(n).toLocaleString();
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

// ---------------------------------------------------------------------------
// Strategy summary — compact description of the active config
// ---------------------------------------------------------------------------

const StrategySummary: React.FC<{ config: StrategyConfig; onEdit: () => void }> = ({
  config,
  onEdit,
}) => {
  const splits = [
    config.splitAces       && 'AA',
    config.splitEights     && '88',
    config.splitNines      && '99',
    config.splitSevens     && '77',
    config.splitSixes      && '66',
    config.splitTwosThrees && '22/33',
  ].filter(Boolean).join(', ') || 'None';

  const doubles = [
    config.doubleOn11   && '11',
    config.doubleOn10   && '10',
    config.doubleOn9    && '9',
    config.doubleOnSoft && 'Soft',
  ].filter(Boolean).join(', ') || 'None';

  return (
    <View style={ss.wrap}>
      <View style={ss.header}>
        <View>
          <Text style={ss.name}>{config.name}</Text>
          <Text style={ss.sub}>Active strategy</Text>
        </View>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [ss.editBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={ss.editText}>Edit ›</Text>
        </Pressable>
      </View>

      <View style={ss.rows}>
        <SummaryRow
          label="Stand"
          value={
            config.dealerAwareBelow
              ? `${config.hardStandAt}+ (dealer-aware 12–${config.hardStandAt - 1})`
              : `${config.hardStandAt}+ (always)`
          }
        />
        <SummaryRow label="Doubles" value={doubles} />
        <SummaryRow label="Splits"  value={splits} />
      </View>
    </View>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={ss.row}>
    <Text style={ss.rowLabel}>{label}</Text>
    <Text style={ss.rowValue} numberOfLines={1}>{value}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export const SimulationScreen: React.FC = () => {
  const [hands, setHands]         = useState<HandCount>(1_000);
  const [bet, setBet]             = useState<BetAmount>(25);
  const [config, setConfig]       = useState<StrategyConfig>(PRESET_BASIC);
  const [editorOpen, setEditorOpen] = useState(false);
  const [running, setRunning]     = useState(false);
  const [progress, setProgress]   = useState<SimProgress | null>(null);
  const [result, setResult]       = useState<SimulationResult | null>(null);
  const cancelRef                 = useRef({ cancelled: false });

  const handleRun = async () => {
    cancelRef.current = { cancelled: false };
    setRunning(true);
    setResult(null);
    setProgress({ handsCompleted: 0, total: hands, runningNet: 0 });

    const res = await runSimulationAsync(
      hands,
      bet,
      p => setProgress(p),
      cancelRef.current,
      config,
    );

    setRunning(false);
    setResult(res);
    setProgress(null);
  };

  const handleCancel = () => { cancelRef.current.cancelled = true; };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.handsCompleted / progress.total) * 100)
      : 0;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Text style={s.title}>Strategy Simulator</Text>
        <Text style={s.subtitle}>
          Runs your custom strategy on the casino-accurate 6-deck shoe.
        </Text>

        {/* ── Strategy summary & editor ────────────────────────────────── */}
        <StrategySummary config={config} onEdit={() => setEditorOpen(true)} />

        {/* ── Hand count ───────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>HANDS TO SIMULATE</Text>
        <View style={s.pills}>
          {HAND_OPTIONS.map(h => (
            <Pressable
              key={h}
              onPress={() => { setHands(h); setResult(null); }}
              style={({ pressed }) => [
                s.pill,
                hands === h && s.pillActive,
                pressed && s.pressed,
              ]}
            >
              <Text style={[s.pillText, hands === h && s.pillTextActive]}>
                {h.toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Bet amount ───────────────────────────────────────────────── */}
        <Text style={s.sectionLabel}>BET PER HAND</Text>
        <View style={s.pills}>
          {BET_OPTIONS.map(b => (
            <Pressable
              key={b}
              onPress={() => { setBet(b); setResult(null); }}
              style={({ pressed }) => [
                s.pill,
                bet === b && s.pillActive,
                pressed && s.pressed,
              ]}
            >
              <Text style={[s.pillText, bet === b && s.pillTextActive]}>${b}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Run / Cancel ─────────────────────────────────────────────── */}
        {!running ? (
          <Pressable
            style={({ pressed }) => [s.runBtn, pressed && s.pressed]}
            onPress={handleRun}
          >
            <Text style={s.runText}>
              Run {hands.toLocaleString()} Hands
            </Text>
          </Pressable>
        ) : (
          <>
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                {progress?.handsCompleted.toLocaleString() ?? 0} / {hands.toLocaleString()}  ({progressPct}%)
              </Text>
              {progress && (
                <Text style={[
                  s.progressNet,
                  { color: progress.runningNet >= 0 ? theme.colors.success : theme.colors.danger },
                ]}>
                  Running net: {signed(progress.runningNet)}
                </Text>
              )}
            </View>
            <Pressable style={s.cancelBtn} onPress={handleCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && <SimResult result={result} />}
      </ScrollView>

      {/* ── Strategy editor modal ────────────────────────────────────── */}
      <StrategyEditor
        visible={editorOpen}
        config={config}
        onChange={next => {
          setConfig(next);
          setResult(null); // old results are for a different strategy
        }}
        onClose={() => setEditorOpen(false)}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------

const SimResult: React.FC<{ result: SimulationResult }> = ({ result }) => {
  const {
    handsPlayed, wins, losses, pushes, blackjacks,
    reshuffles, betAmount, strategyName, net, peakNet, troughNet,
  } = result;

  const totalWager   = handsPlayed * betAmount;
  const houseEdge    = totalWager > 0 ? (-net / totalWager) * 100 : 0;
  const totalResolved = wins + losses + pushes;

  return (
    <View style={res.card}>
      <Text style={res.title}>Results — {strategyName}</Text>
      <Text style={res.sub}>{handsPlayed.toLocaleString()} hands · ${betAmount}/hand</Text>

      <View style={res.rateRow}>
        <RateBox label="Win"  value={pct(wins,   totalResolved)} color={theme.colors.success} />
        <RateBox label="Loss" value={pct(losses, totalResolved)} color={theme.colors.danger} />
        <RateBox label="Push" value={pct(pushes, totalResolved)} color={theme.colors.push} />
      </View>

      <View style={res.divider} />

      <ResultRow label="Wins"        value={wins.toLocaleString()}      accent={theme.colors.success} />
      <ResultRow label="Losses"      value={losses.toLocaleString()}    accent={theme.colors.danger} />
      <ResultRow label="Pushes"      value={pushes.toLocaleString()}    accent={theme.colors.push} />
      <ResultRow label="Blackjacks"  value={blackjacks.toLocaleString()} accent={theme.colors.gold} />
      <ResultRow label="Reshuffles"  value={reshuffles.toLocaleString()} />

      <View style={res.divider} />

      <ResultRow label="Total wagered"    value={`$${totalWager.toLocaleString()}`} />
      <ResultRow
        label="Net profit / loss"
        value={signed(net)}
        accent={net >= 0 ? theme.colors.success : theme.colors.danger}
        bold
      />
      <ResultRow label="Best run"    value={signed(peakNet)}   accent={theme.colors.success} />
      <ResultRow label="Worst run"   value={signed(troughNet)} accent={theme.colors.danger} />
      <ResultRow
        label="Est. house edge"
        value={`${houseEdge.toFixed(3)}%`}
        accent={houseEdge > 0.6 ? theme.colors.danger : theme.colors.success}
      />
    </View>
  );
};

const RateBox: React.FC<{ label: string; value: string; color: string }> = ({
  label, value, color,
}) => (
  <View style={[res.rateBox, { borderColor: color }]}>
    <Text style={[res.rateValue, { color }]}>{value}</Text>
    <Text style={res.rateLabel}>{label}</Text>
  </View>
);

const ResultRow: React.FC<{
  label: string; value: string; accent?: string; bold?: boolean;
}> = ({ label, value, accent, bold }) => (
  <View style={res.row}>
    <Text style={res.rowLabel}>{label}</Text>
    <Text style={[res.rowValue, accent ? { color: accent } : null, bold ? { fontSize: 17 } : null]}>
      {value}
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ss = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  sub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },
  editBtn: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(0.75),
  },
  editText: { color: theme.colors.gold, fontWeight: '800', fontSize: 14 },
  rows: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  rowValue: { color: theme.colors.text, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.felt },
  scroll: { padding: theme.spacing(2.5), paddingBottom: theme.spacing(4), gap: theme.spacing(2) },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    color: theme.colors.textMuted, fontSize: 11, fontWeight: '800',
    letterSpacing: 2, marginBottom: -theme.spacing(1), marginTop: theme.spacing(0.5),
  },
  pills: { flexDirection: 'row', gap: theme.spacing(1.25) },
  pill: {
    flex: 1, paddingVertical: theme.spacing(1.5), borderRadius: theme.radius.md,
    backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center',
  },
  pillActive: { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold },
  pillText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 15 },
  pillTextActive: { color: theme.colors.feltDark },
  runBtn: {
    backgroundColor: theme.colors.gold, paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill, alignItems: 'center', marginTop: theme.spacing(1),
  },
  runText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  progressWrap: { gap: theme.spacing(1) },
  progressTrack: {
    height: 10, borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: theme.radius.pill },
  progressLabel: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  progressNet: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  cancelBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: theme.spacing(1.5), borderRadius: theme.radius.pill, alignItems: 'center',
  },
  cancelText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});

const res = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: theme.radius.lg,
    padding: theme.spacing(2.5), marginTop: theme.spacing(1), gap: 2,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 2 },
  sub: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing(2) },
  rateRow: { flexDirection: 'row', gap: theme.spacing(1.25), marginBottom: theme.spacing(2) },
  rateBox: {
    flex: 1, borderWidth: 2, borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1.5), alignItems: 'center', gap: 2,
  },
  rateValue: { fontSize: 20, fontWeight: '900' },
  rateLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: theme.spacing(1.5) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  rowValue: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
});
