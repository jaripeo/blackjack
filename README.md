# Blackjack — Phase 1 (Local + Multiplayer-Ready)

A casino-accurate Blackjack game in React Native (Expo Go) + TypeScript, built
so that going online in Phase 2 (Node.js + Socket.io on Render) requires
swapping **one file** — no changes to the engine or UI.

## Run it

> The most reliable way to get versions that match your installed Expo Go app
> is to scaffold a project and drop these files in. If you already have Expo Go
> and a recent Node, you can also just install and run directly.

```bash
# from this folder
npm install
npx expo start
```

Then scan the QR code with the Expo Go app (Android) or the Camera app (iOS).

If `npm install` resolves versions that don't match your Expo Go runtime, run:

```bash
npx expo install --fix
```

## Architecture (why it's "multiplayer-ready")

```
UI (screens / components)
        │  calls intent methods + reads subscribed state
        ▼
GameController  (interface)  ← the single swap point
        ├── LocalGameController   ← Phase 1: runs the reducer in-process
        └── SocketGameController  ← Phase 2: socket.emit() / socket.on()
        │
        ▼
gameReducer(state, action)  ← PURE rules. Runs on-device now,
                              on the Node server later. Identical code.
```

- **`src/engine/`** — pure, framework-free game logic. No React, no I/O, no
  randomness except an injectable shoe RNG. This is the code the Phase 2 server
  will import verbatim to stay authoritative.
  - `types.ts` — state shape + the `GameAction` union (your future socket events).
  - `deck.ts` — 6-deck shoe, Fisher-Yates shuffle, deal-without-replacement,
    cut card at 75% penetration.
  - `handValue.ts` — soft/hard totals, blackjack & split detection.
  - `rules.ts` — house rules (dealer S17, 3:2 payout) in one place.
  - `gameReducer.ts` — the complete rule set as `(state, action) => state`.
  - `selectors.ts` — read-only views for the UI.
- **`src/controller/`** — the seam. `GameController` is the contract; the UI
  only ever calls its methods and subscribes to its state.
- **`src/components/` & `src/screens/`** — presentational only; they never
  mutate state.

## Going to Phase 2 (preview)

1. Add `socket.io-client`. Build `SocketGameController implements GameController`
   whose methods `emit` actions and whose constructor does
   `socket.on('state', setState)`.
2. In `GameContext.tsx`, construct `SocketGameController` instead of
   `LocalGameController`. **That is the only client change.**
3. On the server, import `gameReducer` from `src/engine`, hold authoritative
   state per 4-digit room, feed received actions through it, and broadcast the
   resulting `GameState`.

## Rules implemented

- 6-deck shoe, Fisher-Yates shuffle, sequential dealing, cut card at 75%
  (auto-reshuffle between rounds).
- Hit, Stand, Double (first two cards), Split (incl. split-Aces one-card rule).
- Dealer stands on all 17s (toggle `RULES.dealerHitsSoft17` for H17).
- Blackjack pays 3:2, pushes on dealer natural, US peek rules.
- Bankroll, chip betting (5 / 25 / 100), min bet 5.

Not in Phase 1 (intentionally): insurance, surrender, side bets, and the
multiplayer transport itself.
