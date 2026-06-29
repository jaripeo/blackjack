import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  ALL_PRESETS,
  detectPresetName,
  StrategyConfig,
} from '../simulation/strategyConfig';
import { theme } from '../theme/theme';

interface Props {
  visible: boolean;
  config: StrategyConfig;
  onChange: (next: StrategyConfig) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Small building-block components
// ---------------------------------------------------------------------------

const ToggleRow: React.FC<{
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, sub, value, onChange }) => (
  <View style={r.toggleRow}>
    <View style={r.toggleLabels}>
      <Text style={r.toggleLabel}>{label}</Text>
      {sub ? <Text style={r.toggleSub}>{sub}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: 'rgba(255,255,255,0.1)', true: theme.colors.gold }}
      thumbColor="#fff"
      ios_backgroundColor="rgba(255,255,255,0.1)"
    />
  </View>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <Text style={r.sectionHeader}>{label}</Text>
);

const Divider: React.FC = () => <View style={r.divider} />;

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

export const StrategyEditor: React.FC<Props> = ({
  visible,
  config,
  onChange,
  onClose,
}) => {
  // Draft: edit a local copy, commit on Done.
  const [draft, setDraft] = useState<StrategyConfig>(config);

  // Re-sync draft when the modal opens with a fresh config from outside.
  const [lastVisible, setLastVisible] = useState(false);
  if (visible && !lastVisible) {
    setLastVisible(true);
    setDraft(config);
  }
  if (!visible && lastVisible) setLastVisible(false);

  function patch(partial: Partial<StrategyConfig>) {
    setDraft(prev => {
      const next = { ...prev, ...partial };
      next.name = detectPresetName(next);
      return next;
    });
  }

  function applyPreset(preset: StrategyConfig) {
    setDraft({ ...preset });
  }

  const STAND_VALUES = [12, 13, 14, 15, 16, 17] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={r.backdrop}>
        <View style={r.sheet}>
          <View style={r.handle} />
          <View style={r.titleRow}>
            <Text style={r.title}>Strategy Config</Text>
            <Text style={r.presetBadge}>{draft.name}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={r.scroll}
          >
            {/* ── Presets ──────────────────────────────────────────────── */}
            <SectionHeader label="PRESETS" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={r.presetRow}
            >
              {ALL_PRESETS.map(p => {
                const active = draft.name === p.name;
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => applyPreset(p)}
                    style={({ pressed }) => [
                      r.presetChip,
                      active && r.presetChipActive,
                      pressed && r.pressed,
                    ]}
                  >
                    <Text style={[r.presetChipText, active && r.presetChipTextActive]}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Divider />

            {/* ── Hard totals ──────────────────────────────────────────── */}
            <SectionHeader label="HARD TOTALS" />

            <Text style={r.fieldLabel}>Stand on hard:</Text>
            <View style={r.chipRow}>
              {STAND_VALUES.map(v => {
                const active = draft.hardStandAt === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => patch({ hardStandAt: v })}
                    style={({ pressed }) => [
                      r.numChip,
                      active && r.numChipActive,
                      pressed && r.pressed,
                    ]}
                  >
                    <Text style={[r.numChipText, active && r.numChipTextActive]}>
                      {v}+
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ToggleRow
              label="Dealer-aware for 12–16"
              sub="Stand vs bust cards, hit vs strong cards"
              value={draft.dealerAwareBelow}
              onChange={v => patch({ dealerAwareBelow: v })}
            />

            <Divider />

            {/* ── Doubles ──────────────────────────────────────────────── */}
            <SectionHeader label="DOUBLES" />
            <ToggleRow
              label="Double on 11"
              sub="vs dealer < 10"
              value={draft.doubleOn11}
              onChange={v => patch({ doubleOn11: v })}
            />
            <ToggleRow
              label="Double on 10"
              sub="vs dealer ≤ 9"
              value={draft.doubleOn10}
              onChange={v => patch({ doubleOn10: v })}
            />
            <ToggleRow
              label="Double on 9"
              sub="vs dealer 3–6"
              value={draft.doubleOn9}
              onChange={v => patch({ doubleOn9: v })}
            />
            <ToggleRow
              label="Double on soft hands"
              sub="Soft 13–18 vs dealer 5–6"
              value={draft.doubleOnSoft}
              onChange={v => patch({ doubleOnSoft: v })}
            />

            <Divider />

            {/* ── Pairs ────────────────────────────────────────────────── */}
            <SectionHeader label="PAIRS" />
            <ToggleRow
              label="Split Aces"
              value={draft.splitAces}
              onChange={v => patch({ splitAces: v })}
            />
            <ToggleRow
              label="Split 8s"
              value={draft.splitEights}
              onChange={v => patch({ splitEights: v })}
            />
            <ToggleRow
              label="Split 9s"
              sub="vs dealer 2–6, 8–9"
              value={draft.splitNines}
              onChange={v => patch({ splitNines: v })}
            />
            <ToggleRow
              label="Split 7s"
              sub="vs dealer 2–7"
              value={draft.splitSevens}
              onChange={v => patch({ splitSevens: v })}
            />
            <ToggleRow
              label="Split 6s"
              sub="vs dealer 2–6"
              value={draft.splitSixes}
              onChange={v => patch({ splitSixes: v })}
            />
            <ToggleRow
              label="Split 2s / 3s"
              sub="vs dealer 2–7"
              value={draft.splitTwosThrees}
              onChange={v => patch({ splitTwosThrees: v })}
            />
          </ScrollView>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [r.doneBtn, pressed && r.pressed]}
            onPress={() => {
              onChange(draft);
              onClose();
            }}
          >
            <Text style={r.doneText}>Apply Strategy</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const r = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.feltDark,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(2.5),
    paddingBottom: theme.spacing(4),
    paddingTop: theme.spacing(2),
    maxHeight: '90%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: theme.spacing(2),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  presetBadge: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  scroll: { paddingBottom: theme.spacing(1) },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: theme.spacing(1.5),
  },

  // Presets
  presetRow: { flexDirection: 'row', gap: theme.spacing(1), paddingVertical: 4 },
  presetChip: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: theme.colors.gold,
  },
  presetChipText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  presetChipTextActive: { color: theme.colors.gold },

  // Stand-at chips
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: theme.spacing(1),
  },
  chipRow: { flexDirection: 'row', gap: theme.spacing(1), marginBottom: theme.spacing(1.5) },
  numChip: {
    flex: 1,
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  numChipActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  numChipText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 14 },
  numChipTextActive: { color: theme.colors.feltDark },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(1.25),
  },
  toggleLabels: { flex: 1, marginRight: theme.spacing(2) },
  toggleLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },

  // Done button
  doneBtn: {
    backgroundColor: theme.colors.gold,
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    marginTop: theme.spacing(2.5),
  },
  doneText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 17, letterSpacing: 1 },
  pressed: { opacity: 0.8 },
});
