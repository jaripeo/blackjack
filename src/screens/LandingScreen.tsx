import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  onPlaySolo: () => void;
  onHostMultiplayer: (playerName: string) => void;
  onJoinMultiplayer: (roomCode: string, playerName: string) => void;
}

export const LandingScreen: React.FC<Props> = ({
  onPlaySolo,
  onHostMultiplayer,
  onJoinMultiplayer,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode,   setRoomCode]   = useState('');

  const name    = playerName.trim();
  const canHost = name.length > 0;
  const canJoin = name.length > 0 && roomCode.length === 4;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.hero}>
        <Text style={s.suits}>♠  ♥  ♦  ♣</Text>
        <Text style={s.title}>BLACKJACK</Text>
        <Text style={s.subtitle}>6-Deck Casino Shoe</Text>
      </View>

      <View style={s.menu}>
        {/* ── Solo ──────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [s.button, s.primary, pressed && s.pressed]}
          onPress={onPlaySolo}
        >
          <Text style={s.primaryText}>Play Solo</Text>
          <Text style={s.hint}>Practice heads-up against the dealer</Text>
        </Pressable>

        {/* ── Multiplayer ───────────────────────────────────── */}
        <View style={s.mpCard}>
          <Text style={s.mpTitle}>Multiplayer</Text>

          {/* Name input (shared by host & join) */}
          <TextInput
            style={s.nameInput}
            value={playerName}
            onChangeText={t => setPlayerName(t.slice(0, 20))}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.35)"
            returnKeyType="done"
            autoCapitalize="words"
          />

          {/* Host row */}
          <Pressable
            style={({ pressed }) => [s.button, s.hostBtn, !canHost && s.disabled, pressed && canHost && s.pressed]}
            onPress={() => canHost && onHostMultiplayer(name)}
            disabled={!canHost}
          >
            <Text style={s.hostText}>Host a Game</Text>
          </Pressable>

          {/* Join row */}
          <View style={s.joinRow}>
            <TextInput
              style={s.codeInput}
              value={roomCode}
              onChangeText={t => setRoomCode(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="0000"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
            <Pressable
              style={({ pressed }) => [s.joinBtn, !canJoin && s.disabled, pressed && canJoin && s.pressed]}
              onPress={() => canJoin && onJoinMultiplayer(roomCode, name)}
              disabled={!canJoin}
            >
              <Text style={s.joinText}>Join</Text>
            </Pressable>
          </View>

          <Text style={s.mpHint}>Enter a name, then host or join a room.</Text>
        </View>
      </View>

      <Text style={s.footer}>Phase 3 · Real-Time Multiplayer</Text>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.felt,
    paddingHorizontal: theme.spacing(3),
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(4),
  },
  hero: { alignItems: 'center', marginTop: theme.spacing(4) },
  suits: { color: theme.colors.gold, fontSize: 28, letterSpacing: 4, marginBottom: theme.spacing(2) },
  title: { color: theme.colors.text, fontSize: 46, fontWeight: '900', letterSpacing: 4 },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, marginTop: theme.spacing(1), letterSpacing: 1 },

  menu: { gap: theme.spacing(2.5) },

  button: { borderRadius: theme.radius.lg, paddingVertical: theme.spacing(2.25), alignItems: 'center' },
  primary: { backgroundColor: theme.colors.gold },
  primaryText: { color: theme.colors.feltDark, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  hint: { color: theme.colors.feltDark, fontSize: 13, opacity: 0.7, marginTop: 2 },

  mpCard: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2.5),
    gap: theme.spacing(1.5),
  },
  mpTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },

  nameInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
  },

  hostBtn: { backgroundColor: theme.colors.feltLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  hostText: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },

  joinRow: { flexDirection: 'row', gap: theme.spacing(1.25) },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    paddingVertical: theme.spacing(1.5),
  },
  joinBtn: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2.5),
    justifyContent: 'center',
  },
  joinText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 17 },

  mpHint: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },

  disabled: { opacity: 0.4 },
  pressed:  { opacity: 0.85, transform: [{ scale: 0.99 }] },

  footer: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 12, letterSpacing: 1 },
});
