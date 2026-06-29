'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ============================================================
// Game Engine — pure JS port of src/engine (no React deps)
// ============================================================

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const NUM_DECKS       = 6;
const PENETRATION     = 0.75;
const MIN_BET         = 5;
const STARTING_BANKROLL = 1000;
const BLACKJACK_PAYOUT  = 1.5;
const DEALER_STEP_MS    = 900;

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['K','Q','J','10'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function evaluateHand(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  let highAces = aces;
  while (total > 21 && highAces > 0) { total -= 10; highAces--; }
  return { total, isSoft: highAces > 0 };
}

function handTotal(cards) { return evaluateHand(cards).total; }
function isBust(cards)    { return handTotal(cards) > 21; }

function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards) === 21;
}

function canSplit(hand) {
  if (hand.cards.length !== 2) return false;
  return cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank);
}

function dealerShouldHit(cards) {
  const { total } = evaluateHand(cards);
  return total < 17;
}

function createShoe() {
  const cards = [];
  for (let d = 0; d < NUM_DECKS; d++)
    for (const suit of SUITS)
      for (const rank of RANKS)
        cards.push({ rank, suit, faceUp: true });

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const cutCardIndex = Math.floor(cards.length * PENETRATION);
  return { cards, cursor: 0, cutCardIndex, needsReshuffle: false };
}

function drawCard(shoe, faceUp = true) {
  if (shoe.cursor >= shoe.cards.length) shoe = createShoe();
  const card = { ...shoe.cards[shoe.cursor], faceUp };
  const cursor = shoe.cursor + 1;
  const needsReshuffle = shoe.needsReshuffle || cursor >= shoe.cutCardIndex;
  return { card, shoe: { ...shoe, cursor, needsReshuffle } };
}

// ============================================================
// Hand ID counter
// ============================================================

let handIdCounter = 0;
const newHandId = () => `h${++handIdCounter}`;

// ============================================================
// Room management
// ============================================================

const rooms = new Map();      // roomCode → room
const socketRoom = new Map(); // socket.id → roomCode

function generateRoomCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); }
  while (rooms.has(code));
  return code;
}

function createPlayer(socketId, name) {
  return {
    id: socketId,
    name,
    bankroll: STARTING_BANKROLL,
    hands: [],
    pendingBet: 0,
    activeHandIndex: 0,
    betLocked: false,
    isConnected: true,
  };
}

function createRoom(roomCode, hostId, hostName) {
  return {
    roomCode,
    hostId,
    players: [createPlayer(hostId, hostName)],
    dealer: { cards: [] },
    shoe: createShoe(),
    phase: 'waiting',
    activePlayerIndex: 0,
    roundId: 0,
    message: `Room ${roomCode} ready — share this code with friends!`,
    dealerTimer: null,
  };
}

function sanitizeRoom(room) {
  const { dealerTimer, ...safe } = room;
  return safe;
}

function broadcastState(io, room) {
  io.to(room.roomCode).emit('gameStateUpdate', sanitizeRoom(room));
}

// ============================================================
// Game flow
// ============================================================

function startBetting(room) {
  room.phase = 'betting';
  room.message = 'Place your bets!';
  for (const p of room.players) {
    p.hands = [];
    p.pendingBet = 0;
    p.activeHandIndex = 0;
    p.betLocked = false;
  }
}

function dealInitialCards(io, room) {
  if (room.shoe.needsReshuffle) {
    room.shoe = createShoe();
    room.message = 'Shuffling new shoe…';
  }

  // Deduct bets and initialise hands
  for (const p of room.players) {
    if (!p.isConnected || !p.betLocked || p.pendingBet < MIN_BET) {
      p.hands = [];
      continue;
    }
    p.bankroll -= p.pendingBet;
    p.hands = [{
      id: newHandId(),
      cards: [],
      bet: p.pendingBet,
      status: 'active',
      isDoubled: false,
      fromSplitAces: false,
    }];
    p.activeHandIndex = 0;
    p.pendingBet = 0;
  }

  room.dealer = { cards: [] };

  // Two-pass deal
  for (let round = 0; round < 2; round++) {
    for (const p of room.players) {
      if (!p.hands.length) continue;
      const { card, shoe } = drawCard(room.shoe, true);
      room.shoe = shoe;
      p.hands[0].cards.push(card);
    }
    const { card, shoe } = drawCard(room.shoe, round === 0);
    room.shoe = shoe;
    room.dealer.cards.push(card);
  }

  // Mark naturals
  for (const p of room.players)
    if (p.hands.length && isBlackjack(p.hands[0].cards))
      p.hands[0].status = 'blackjack';

  // US peek
  if (isBlackjack(room.dealer.cards)) {
    room.dealer.cards = room.dealer.cards.map(c => ({ ...c, faceUp: true }));
    room.phase = 'dealer-turn';
    room.message = 'Dealer has Blackjack!';
    settleRound(room);
    return;
  }

  room.phase = 'player-turn';
  const firstActive = findFirstActivePlayer(room);
  if (firstActive === -1) {
    beginDealerTurn(io, room);
  } else {
    room.activePlayerIndex = firstActive;
    updateMessage(room);
  }
}

function findFirstActivePlayer(room) {
  for (let i = 0; i < room.players.length; i++)
    if (room.players[i].hands.some(h => h.status === 'active')) return i;
  return -1;
}

function updateMessage(room) {
  const p = room.players[room.activePlayerIndex];
  if (p) room.message = `${p.name}'s turn.`;
}

function advancePlayer(io, room) {
  const cur = room.players[room.activePlayerIndex];

  // More hands for the same player (after split)?
  if (cur) {
    for (let h = cur.activeHandIndex + 1; h < cur.hands.length; h++) {
      if (cur.hands[h].status === 'active') {
        cur.activeHandIndex = h;
        updateMessage(room);
        broadcastState(io, room);
        return;
      }
    }
  }

  // Next player with an active hand
  for (let i = room.activePlayerIndex + 1; i < room.players.length; i++) {
    const p = room.players[i];
    for (let h = 0; h < p.hands.length; h++) {
      if (p.hands[h].status === 'active') {
        room.activePlayerIndex = i;
        p.activeHandIndex = h;
        updateMessage(room);
        broadcastState(io, room);
        return;
      }
    }
  }

  // All done — dealer
  beginDealerTurn(io, room);
}

function beginDealerTurn(io, room) {
  room.phase = 'dealer-turn';
  room.dealer.cards = room.dealer.cards.map(c => ({ ...c, faceUp: true }));
  room.message = "Dealer's turn.";
  broadcastState(io, room);
  scheduleDealerStep(io, room);
}

function scheduleDealerStep(io, room) {
  if (room.dealerTimer) clearTimeout(room.dealerTimer);
  room.dealerTimer = setTimeout(() => {
    room.dealerTimer = null;
    const r = rooms.get(room.roomCode);
    if (!r || r.phase !== 'dealer-turn') return;

    const anyNotBusted = r.players.some(p =>
      p.hands.some(h => h.status === 'stood' || h.status === 'blackjack')
    );

    if (anyNotBusted && dealerShouldHit(r.dealer.cards)) {
      const { card, shoe } = drawCard(r.shoe);
      r.shoe = shoe;
      r.dealer.cards.push(card);
      r.message = 'Dealer hits.';
      broadcastState(io, r);
      scheduleDealerStep(io, r);
    } else {
      settleRound(r);
      broadcastState(io, r);
    }
  }, DEALER_STEP_MS);
}

function settleRound(room) {
  const dt = handTotal(room.dealer.cards);
  const dealerBust = dt > 21;
  const dealerNatural = isBlackjack(room.dealer.cards);

  for (const p of room.players) {
    for (const hand of p.hands) {
      if (hand.status === 'busted') {
        hand.result = 'lose';
      } else if (hand.status === 'blackjack') {
        if (dealerNatural) {
          hand.result = 'push';
          p.bankroll += hand.bet;
        } else {
          hand.result = 'blackjack';
          p.bankroll += hand.bet + Math.floor(hand.bet * BLACKJACK_PAYOUT);
        }
      } else {
        const total = handTotal(hand.cards);
        if (dealerNatural) {
          hand.result = 'lose';
        } else if (dealerBust || total > dt) {
          hand.result = 'win';
          p.bankroll += hand.bet * 2;
        } else if (total === dt) {
          hand.result = 'push';
          p.bankroll += hand.bet;
        } else {
          hand.result = 'lose';
        }
      }
      hand.status = 'done';
    }
  }

  room.phase = 'round-over';
  room.message = dealerBust
    ? `Dealer busts with ${dt}.`
    : `Dealer stands on ${dt}.`;
}

// ============================================================
// Socket.io
// ============================================================

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.get('/health', (_, res) =>
  res.json({ status: 'ok', rooms: rooms.size, uptime: process.uptime() })
);

io.on('connection', socket => {
  console.log('[connect]', socket.id);

  // ── createRoom ────────────────────────────────────────────
  socket.on('createRoom', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const room = createRoom(roomCode, socket.id, (playerName || 'Host').trim().slice(0, 20));
    rooms.set(roomCode, room);
    socketRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    broadcastState(io, room);
    console.log('[createRoom]', roomCode, 'by', socket.id);
  });

  // ── joinRoom ──────────────────────────────────────────────
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('joinError', { message: `Room "${roomCode}" not found.` });
      return;
    }
    if (room.phase !== 'waiting' && room.phase !== 'betting') {
      socket.emit('joinError', { message: 'Game is already in progress.' });
      return;
    }
    if (room.players.filter(p => p.isConnected).length >= 6) {
      socket.emit('joinError', { message: 'Room is full (max 6 players).' });
      return;
    }

    room.players.push(createPlayer(socket.id, (playerName || 'Player').trim().slice(0, 20)));
    socketRoom.set(socket.id, roomCode);
    socket.join(roomCode);
    socket.emit('roomJoined', { roomCode });
    room.message = `${playerName} joined!`;
    broadcastState(io, room);
    console.log('[joinRoom]', roomCode, socket.id);
  });

  // ── startGame (host only, from waiting → betting) ─────────
  socket.on('startGame', () => {
    const roomCode = socketRoom.get(socket.id);
    const room = rooms.get(roomCode);
    if (!room || socket.id !== room.hostId || room.phase !== 'waiting') return;
    startBetting(room);
    broadcastState(io, room);
  });

  // ── placeBet ──────────────────────────────────────────────
  socket.on('placeBet', ({ amount }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'betting') return;
    const p = room.players.find(q => q.id === socket.id);
    if (!p || p.betLocked) return;
    const next = p.pendingBet + (amount || 0);
    if (next <= p.bankroll) { p.pendingBet = next; broadcastState(io, room); }
  });

  // ── clearBet ─────────────────────────────────────────────
  socket.on('clearBet', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'betting') return;
    const p = room.players.find(q => q.id === socket.id);
    if (!p || p.betLocked) return;
    p.pendingBet = 0;
    broadcastState(io, room);
  });

  // ── lockBet ───────────────────────────────────────────────
  socket.on('lockBet', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'betting') return;
    const p = room.players.find(q => q.id === socket.id);
    if (!p || p.betLocked || p.pendingBet < MIN_BET) return;

    p.betLocked = true;
    room.message = `${p.name} locked in $${p.pendingBet}.`;
    broadcastState(io, room);

    // Deal when all connected players have locked
    const allLocked = room.players
      .filter(q => q.isConnected)
      .every(q => q.betLocked);
    if (allLocked) {
      dealInitialCards(io, room);
      broadcastState(io, room);
    }
  });

  // ── playerAction ──────────────────────────────────────────
  socket.on('playerAction', ({ action }) => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'player-turn') return;

    const activePlayer = room.players[room.activePlayerIndex];
    if (!activePlayer || activePlayer.id !== socket.id) return;

    const hand = activePlayer.hands[activePlayer.activeHandIndex];
    if (!hand || hand.status !== 'active') return;

    switch (action) {
      case 'HIT': {
        const { card, shoe } = drawCard(room.shoe);
        room.shoe = shoe;
        hand.cards.push(card);
        const total = handTotal(hand.cards);
        if (total > 21) {
          hand.status = 'busted';
          room.message = `${activePlayer.name} busts!`;
          broadcastState(io, room);
          advancePlayer(io, room);
        } else if (total === 21) {
          hand.status = 'stood';
          broadcastState(io, room);
          advancePlayer(io, room);
        } else {
          broadcastState(io, room);
        }
        break;
      }

      case 'STAND': {
        hand.status = 'stood';
        broadcastState(io, room);
        advancePlayer(io, room);
        break;
      }

      case 'DOUBLE': {
        if (hand.cards.length !== 2 || activePlayer.bankroll < hand.bet) break;
        activePlayer.bankroll -= hand.bet;
        hand.bet *= 2;
        hand.isDoubled = true;
        const { card, shoe } = drawCard(room.shoe);
        room.shoe = shoe;
        hand.cards.push(card);
        const total = handTotal(hand.cards);
        hand.status = total > 21 ? 'busted' : 'stood';
        room.message = total > 21
          ? `${activePlayer.name} doubles and busts!`
          : `${activePlayer.name} doubles down.`;
        broadcastState(io, room);
        advancePlayer(io, room);
        break;
      }

      case 'SPLIT': {
        if (!canSplit(hand) || activePlayer.bankroll < hand.bet) break;
        const splittingAces = hand.cards[0].rank === 'A';
        activePlayer.bankroll -= hand.bet;

        let shoe = room.shoe;
        const { card: c1, shoe: s1 } = drawCard(shoe);
        shoe = s1;
        const { card: c2, shoe: s2 } = drawCard(shoe);
        shoe = s2;
        room.shoe = shoe;

        const handA = {
          id: newHandId(), cards: [hand.cards[0], c1], bet: hand.bet,
          status: splittingAces ? 'stood' : 'active',
          isDoubled: false, fromSplitAces: splittingAces,
        };
        const handB = {
          id: newHandId(), cards: [hand.cards[1], c2], bet: hand.bet,
          status: splittingAces ? 'stood' : 'active',
          isDoubled: false, fromSplitAces: splittingAces,
        };
        activePlayer.hands.splice(activePlayer.activeHandIndex, 1, handA, handB);
        room.message = `${activePlayer.name} splits!`;
        broadcastState(io, room);

        if (splittingAces) advancePlayer(io, room);
        break;
      }
    }
  });

  // ── nextRound ─────────────────────────────────────────────
  socket.on('nextRound', () => {
    const room = rooms.get(socketRoom.get(socket.id));
    if (!room || room.phase !== 'round-over') return;
    room.roundId++;
    startBetting(room);
    broadcastState(io, room);
  });

  // ── disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('[disconnect]', socket.id);
    const roomCode = socketRoom.get(socket.id);
    socketRoom.delete(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const p = room.players.find(q => q.id === socket.id);
    if (p) p.isConnected = false;

    // Auto-stand disconnected player's active hand
    if (room.phase === 'player-turn') {
      const active = room.players[room.activePlayerIndex];
      if (active?.id === socket.id) {
        for (const h of active.hands) if (h.status === 'active') h.status = 'stood';
        advancePlayer(io, room);
      }
    }

    // Prune disconnected players from lobby
    if (room.phase === 'waiting' || room.phase === 'betting') {
      room.players = room.players.filter(q => q.isConnected);
      if (room.players.length === 0) { rooms.delete(roomCode); return; }
      if (room.hostId === socket.id) room.hostId = room.players[0].id;
    }

    room.message = `${p?.name ?? 'A player'} disconnected.`;
    broadcastState(io, room);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () =>
  console.log(`Blackjack server running on :${PORT}`)
);
