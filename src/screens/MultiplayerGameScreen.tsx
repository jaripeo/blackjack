import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMultiplayerGame } from '../multiplayer/useMultiplayerGame';
import { MPGameState, MPHand, MPPlayer } from '../multiplayer/multiplayerTypes';
import { HandView } from '../components/HandView';
import { evaluateHand } from '../engine/handValue';
import { theme } from '../theme/theme';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'host' | 'join';
  joinCode?: string;
  playerName: string;
  onLeave: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mpHandTotal(hand: MPHand): number {
  return evaluateHand(hand.cards).total;
}

function dealerVisible(cards: MPGameState['dealer']['cards'], phase: MPGameState['phase']): number | null {
  if (!cards.length) return null;
  const faceUp = cards.filter(c => c.faceUp);
  if (!faceUp.length) return null;
  const total = evaluateHand(faceUp).total;
  return total;
}

// ── Chip chip sizes ───────────────────────────────────────────────────────────

const CHIPS = [
  { amount: 5,   label: '$5',   bg: theme.colors.chip5 },
  { amount: 25,  label: '$25',  bg: theme.colors.chip25 },
  { amount: 100, label: '$100', bg: theme.colors.chip100 },
];

// ── Sub-views ─────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ label: string }> = ({ label }) => (
  <SafeAreaView style={v.center}>
    <ActivityIndicator size="large" color={theme.colors.gold} />
    <Text style={v.spinnerText}>{label}</Text>
  </SafeAreaView>
);

const ErrorView: React.FC<{ msg: string; onBack: () => void }> = ({ msg, onBack }) => (
  <SafeAreaView style={v.center}>
    <Text style={v.errorIcon}>!</Text>
    <Text style={v.errorText}>{msg}</Text>
    <Pressable style={v.backBtn} onPress={onBack}>
      <Text style={v.backBtnText}>Go Back</Text>
    </Pressable>
  </SafeAreaView>
);

// ── Waiting room ──────────────────────────────────────────────────────────────

const WaitingRoom: React.FC<{
  gs: MPGameState;
  isHost: boolean;
  onStart: () => void;
  onLeave: () => void;
}> = ({ gs, isHost, onStart, onLeave }) => (
  <SafeAreaView style={w.container}>
    <View style={w.header}>
      <Pressable onPress={onLeave} hitSlop={12}>
        <Text style={w.back}>← Leave</Text>
      </Pressable>
      <Text style={w.title}>Waiting Room</Text>
      <View style={{ width: 60 }} />
    </View>

    <View style={w.codeCard}>
      <Text style={w.codeLabel}>ROOM CODE</Text>
      <Text style={w.code}>{gs.roomCode}</Text>
      <Text style={w.codeSub}>Share this with friends</Text>
    </View>

    <Text style={w.playersLabel}>PLAYERS ({gs.players.length})</Text>
    <View style={w.playerList}>
      {gs.players.map((p, i) => (
        <View key={p.id} style={w.playerRow}>
          <Text style={w.playerName}>
            {p.name}{i === 0 ? '  (Host)' : ''}
          </Text>
          <Text style={[w.dot, p.isConnected ? w.dotGreen : w.dotRed]}>●</Text>
        </View>
      ))}
    </View>

    <Text style={w.msg}>{gs.message}</Text>

    {isHost ? (
      <Pressable
        style={({ pressed }) => [w.startBtn, pressed && w.pressed]}
        onPress={onStart}
      >
        <Text style={w.startText}>Start Game</Text>
      </Pressable>
    ) : (
      <View style={w.waitBanner}>
        <Text style={w.waitText}>Waiting for host to start…</Text>
      </View>
    )}
  </SafeAreaView>
);

// ── Betting phase ─────────────────────────────────────────────────────────────

const BettingPhase: React.FC<{
  gs: MPGameState;
  myPlayer: MPPlayer | undefined;
  onPlace: (a: number) => void;
  onClear: () => void;
  onLock: () => void;
  onLeave: () => void;
}> = ({ gs, myPlayer, onPlace, onClear, onLock, onLeave }) => {
  const locked = myPlayer?.betLocked ?? false;
  const bet    = myPlayer?.pendingBet ?? 0;
  const canLock = bet >= 5 && !locked;

  return (
    <SafeAreaView style={b.container}>
      <View style={b.header}>
        <Pressable onPress={onLeave} hitSlop={12}>
          <Text style={b.back}>← Leave</Text>
        </Pressable>
        <Text style={b.title}>Place Your Bet</Text>
        <Text style={b.code}>{gs.roomCode}</Text>
      </View>

      {/* Player list with lock indicators */}
      <ScrollView style={b.playerScroll} horizontal showsHorizontalScrollIndicator={false}>
        <View style={b.playerChips}>
          {gs.players.map(p => (
            <View key={p.id} style={[b.playerChip, p.betLocked && b.playerChipLocked]}>
              <Text style={b.playerChipName} numberOfLines={1}>{p.name}</Text>
              {p.betLocked
                ? <Text style={b.lockedBadge}>✓ ${p.pendingBet || '—'}</Text>
                : <Text style={b.waitingBadge}>…</Text>
              }
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={b.betDisplay}>
        <Text style={b.betLabel}>YOUR BET</Text>
        <Text style={b.betAmount}>${bet}</Text>
        <Text style={b.bankroll}>Bankroll: ${myPlayer?.bankroll.toLocaleString() ?? 0}</Text>
      </View>

      {!locked ? (
        <>
          <View style={b.chips}>
            {CHIPS.map(chip => (
              <Pressable
                key={chip.amount}
                style={({ pressed }) => [b.chip, { backgroundColor: chip.bg }, pressed && b.pressed]}
                onPress={() => onPlace(chip.amount)}
              >
                <Text style={b.chipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={b.actions}>
            <Pressable
              style={({ pressed }) => [b.clearBtn, pressed && b.pressed]}
              onPress={onClear}
            >
              <Text style={b.clearText}>Clear</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [b.lockBtn, !canLock && b.lockBtnDim, pressed && canLock && b.pressed]}
              onPress={onLock}
              disabled={!canLock}
            >
              <Text style={b.lockText}>Lock Bet</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={b.waitBanner}>
          <ActivityIndicator color={theme.colors.gold} style={{ marginRight: 10 }} />
          <Text style={b.waitText}>Waiting for other players…</Text>
        </View>
      )}

      <Text style={b.msg}>{gs.message}</Text>
    </SafeAreaView>
  );
};

// ── Game table (player-turn / dealer-turn / round-over) ───────────────────────

const GameTable: React.FC<{
  gs: MPGameState;
  myId: string | null;
  isHost: boolean;
  onAction: (a: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') => void;
  onNextRound: () => void;
  onLeave: () => void;
}> = ({ gs, myId, isHost, onAction, onNextRound, onLeave }) => {
  const activePlayer = gs.players[gs.activePlayerIndex];
  const isMyTurn = gs.phase === 'player-turn' && activePlayer?.id === myId;
  const myPlayer = gs.players.find(p => p.id === myId);
  const myHand = myPlayer?.hands[myPlayer.activeHandIndex];

  const showDouble = isMyTurn && myHand?.cards.length === 2
    && (myPlayer?.bankroll ?? 0) >= (myHand?.bet ?? 0);
  const showSplit  = isMyTurn && myHand?.cards.length === 2
    && myHand.cards[0] && myHand.cards[1]
    && myHand.cards[0].rank === myHand.cards[1].rank
    && (myPlayer?.bankroll ?? 0) >= (myHand?.bet ?? 0);

  const dealerTotal = dealerVisible(gs.dealer.cards, gs.phase);
  const dealerRevealed = gs.phase === 'dealer-turn' || gs.phase === 'round-over';

  return (
    <SafeAreaView style={g.container}>
      {/* Header */}
      <View style={g.header}>
        <Pressable onPress={onLeave} hitSlop={12}>
          <Text style={g.back}>← Leave</Text>
        </Pressable>
        <Text style={g.code}>{gs.roomCode}</Text>
        <Text style={g.bankroll}>${myPlayer?.bankroll.toLocaleString() ?? 0}</Text>
      </View>

      <ScrollView contentContainerStyle={g.table} showsVerticalScrollIndicator={false}>
        {/* Dealer area */}
        <View style={g.area}>
          <Text style={g.areaLabel}>
            DEALER{dealerTotal !== null ? `  ${dealerRevealed ? dealerTotal : '?'}` : ''}
          </Text>
          <HandView cards={gs.dealer.cards} total={dealerRevealed ? dealerTotal : null} />
        </View>

        {/* Message */}
        <View style={g.msgBox}>
          <Text style={g.msg}>{gs.message}</Text>
        </View>

        {/* Each player's hands */}
        {gs.players.map((p, pi) => {
          const isActive = gs.phase === 'player-turn' && pi === gs.activePlayerIndex;
          return (
            <View key={p.id} style={[g.playerArea, isActive && g.playerAreaActive]}>
              <View style={g.playerHeader}>
                <Text style={[g.playerName, p.id === myId && g.playerNameMe]}>
                  {p.name}{p.id === myId ? ' (You)' : ''}
                  {isActive ? '  ▶' : ''}
                </Text>
                <Text style={g.playerBank}>${p.bankroll.toLocaleString()}</Text>
              </View>

              {p.hands.length === 0 ? (
                <Text style={g.noHand}>Sitting out</Text>
              ) : (
                p.hands.map((hand, hi) => (
                  <HandView
                    key={hand.id}
                    cards={hand.cards}
                    total={mpHandTotal(hand)}
                    bet={hand.bet}
                    result={hand.result}
                    active={isActive && p.activeHandIndex === hi}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom action area */}
      {gs.phase === 'round-over' ? (
        <View style={g.footer}>
          <Pressable
            style={({ pressed }) => [g.nextBtn, pressed && g.pressed]}
            onPress={onNextRound}
          >
            <Text style={g.nextText}>Next Round</Text>
          </Pressable>
        </View>
      ) : isMyTurn ? (
        <View style={g.footer}>
          <View style={g.actionRow}>
            <ActionBtn label="Hit"   onPress={() => onAction('HIT')}   />
            <ActionBtn label="Stand" onPress={() => onAction('STAND')} />
            {showDouble && <ActionBtn label="Double" onPress={() => onAction('DOUBLE')} dim />}
            {showSplit  && <ActionBtn label="Split"  onPress={() => onAction('SPLIT')}  dim />}
          </View>
        </View>
      ) : gs.phase === 'player-turn' ? (
        <View style={g.footer}>
          <View style={g.waitBanner}>
            <Text style={g.waitText}>
              Waiting for {activePlayer?.name ?? 'other player'}…
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const ActionBtn: React.FC<{
  label: string; onPress: () => void; dim?: boolean;
}> = ({ label, onPress, dim }) => (
  <Pressable
    style={({ pressed }) => [g.actionBtn, dim && g.actionBtnDim, pressed && g.pressed]}
    onPress={onPress}
  >
    <Text style={[g.actionText, dim && g.actionTextDim]}>{label}</Text>
  </Pressable>
);

// ── Main component ────────────────────────────────────────────────────────────

export const MultiplayerGameScreen: React.FC<Props> = ({
  mode, joinCode, playerName, onLeave,
}) => {
  const {
    gameState, myId, status, error,
    createRoom, joinRoom,
    startGame, placeBet, clearBet, lockBet,
    playerAction, nextRound, leaveRoom,
  } = useMultiplayerGame();

  const didConnect = useRef(false);

  // Connect exactly once on mount
  useEffect(() => {
    if (didConnect.current) return;
    didConnect.current = true;
    if (mode === 'host') {
      createRoom(playerName);
    } else {
      joinRoom(joinCode ?? '', playerName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  // Error / connecting states
  if (status === 'error') {
    return <ErrorView msg={error ?? 'Connection failed.'} onBack={handleLeave} />;
  }
  if (status === 'disconnected') {
    return <ErrorView msg="Disconnected from server." onBack={handleLeave} />;
  }
  if (!gameState || status === 'connecting' || status === 'idle') {
    return <Spinner label="Connecting…" />;
  }

  const isHost = myId === gameState.hostId;
  const myPlayer = gameState.players.find(p => p.id === myId);

  switch (gameState.phase) {
    case 'waiting':
      return (
        <WaitingRoom
          gs={gameState}
          isHost={isHost}
          onStart={startGame}
          onLeave={handleLeave}
        />
      );

    case 'betting':
      return (
        <BettingPhase
          gs={gameState}
          myPlayer={myPlayer}
          onPlace={placeBet}
          onClear={clearBet}
          onLock={lockBet}
          onLeave={handleLeave}
        />
      );

    case 'player-turn':
    case 'dealer-turn':
    case 'round-over':
      return (
        <GameTable
          gs={gameState}
          myId={myId}
          isHost={isHost}
          onAction={playerAction}
          onNextRound={nextRound}
          onLeave={handleLeave}
        />
      );
  }
};

// ── Styles ────────────────────────────────────────────────────────────────────

const v = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.colors.felt, alignItems: 'center', justifyContent: 'center', padding: 32 },
  spinnerText: { color: theme.colors.textMuted, marginTop: 16, fontSize: 16 },
  errorIcon: { color: theme.colors.danger, fontSize: 48, fontWeight: '900', marginBottom: 12 },
  errorText: { color: theme.colors.text, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  backBtn: { backgroundColor: theme.colors.feltLight, paddingHorizontal: 32, paddingVertical: 14, borderRadius: theme.radius.pill },
  backBtnText: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
});

const w = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.felt, padding: theme.spacing(2.5) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing(3) },
  back: { color: theme.colors.textMuted, fontSize: 15 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  codeCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: theme.radius.lg, padding: theme.spacing(3), alignItems: 'center', marginBottom: theme.spacing(3) },
  codeLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 3 },
  code: { color: theme.colors.gold, fontSize: 52, fontWeight: '900', letterSpacing: 8, marginVertical: 8 },
  codeSub: { color: theme.colors.textMuted, fontSize: 13 },
  playersLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: theme.spacing(1) },
  playerList: { gap: 6, marginBottom: theme.spacing(2) },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.radius.md, paddingHorizontal: theme.spacing(2), paddingVertical: theme.spacing(1.25) },
  playerName: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  dot: { fontSize: 12 },
  dotGreen: { color: theme.colors.success },
  dotRed: { color: theme.colors.danger },
  msg: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 13, marginBottom: theme.spacing(2) },
  startBtn: { backgroundColor: theme.colors.gold, paddingVertical: theme.spacing(2), borderRadius: theme.radius.pill, alignItems: 'center' },
  startText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 20 },
  waitBanner: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.radius.md, padding: theme.spacing(2), alignItems: 'center' },
  waitText: { color: theme.colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  pressed: { opacity: 0.8 },
});

const b = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.felt, padding: theme.spacing(2.5) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing(2) },
  back: { color: theme.colors.textMuted, fontSize: 15 },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  code: { color: theme.colors.gold, fontWeight: '700', fontSize: 14 },
  playerScroll: { maxHeight: 72, marginBottom: theme.spacing(1.5) },
  playerChips: { flexDirection: 'row', gap: theme.spacing(1.25) },
  playerChip: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.radius.md, paddingHorizontal: theme.spacing(1.5), paddingVertical: theme.spacing(1), alignItems: 'center', minWidth: 80 },
  playerChipLocked: { backgroundColor: 'rgba(82,183,136,0.18)', borderWidth: 1, borderColor: theme.colors.success },
  playerChipName: { color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  lockedBadge: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
  waitingBadge: { color: theme.colors.textMuted, fontSize: 12 },
  betDisplay: { alignItems: 'center', paddingVertical: theme.spacing(2.5) },
  betLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  betAmount: { color: theme.colors.gold, fontSize: 52, fontWeight: '900', marginVertical: 4 },
  bankroll: { color: theme.colors.textMuted, fontSize: 14 },
  chips: { flexDirection: 'row', gap: theme.spacing(1.5), justifyContent: 'center', marginBottom: theme.spacing(2.5) },
  chip: { flex: 1, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  chipText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  actions: { flexDirection: 'row', gap: theme.spacing(1.5), marginBottom: theme.spacing(2) },
  clearBtn: { flex: 1, paddingVertical: theme.spacing(1.75), borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  clearText: { color: theme.colors.textMuted, fontWeight: '800', fontSize: 16 },
  lockBtn: { flex: 2, paddingVertical: theme.spacing(1.75), borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.gold },
  lockBtnDim: { opacity: 0.4 },
  lockText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 18 },
  waitBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.radius.md, padding: theme.spacing(2) },
  waitText: { color: theme.colors.textMuted, fontSize: 15, fontStyle: 'italic' },
  msg: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: theme.spacing(1) },
  pressed: { opacity: 0.8 },
});

const g = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.felt },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing(2), paddingVertical: theme.spacing(1.5) },
  back: { color: theme.colors.textMuted, fontSize: 15 },
  code: { color: theme.colors.gold, fontWeight: '700', fontSize: 14 },
  bankroll: { color: theme.colors.text, fontWeight: '800', fontSize: 16 },
  table: { paddingHorizontal: theme.spacing(2), paddingBottom: theme.spacing(2), gap: theme.spacing(1.5) },
  area: { gap: theme.spacing(1) },
  areaLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  msgBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.radius.md, paddingVertical: theme.spacing(1.25), paddingHorizontal: theme.spacing(2) },
  msg: { color: theme.colors.text, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  playerArea: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: theme.radius.lg, padding: theme.spacing(1.5), gap: theme.spacing(1) },
  playerAreaActive: { backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playerName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  playerNameMe: { color: theme.colors.text },
  playerBank: { color: theme.colors.textMuted, fontSize: 13 },
  noHand: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' },
  footer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingHorizontal: theme.spacing(2), paddingVertical: theme.spacing(2) },
  actionRow: { flexDirection: 'row', gap: theme.spacing(1.25) },
  actionBtn: { flex: 1, paddingVertical: theme.spacing(2), borderRadius: theme.radius.pill, alignItems: 'center', backgroundColor: theme.colors.gold },
  actionBtnDim: { backgroundColor: theme.colors.feltLight },
  actionText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 17 },
  actionTextDim: { color: theme.colors.text },
  waitBanner: { alignItems: 'center', paddingVertical: theme.spacing(1.5) },
  waitText: { color: theme.colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  nextBtn: { backgroundColor: theme.colors.gold, paddingVertical: theme.spacing(2), borderRadius: theme.radius.pill, alignItems: 'center' },
  nextText: { color: theme.colors.feltDark, fontWeight: '900', fontSize: 20 },
  pressed: { opacity: 0.8 },
});
