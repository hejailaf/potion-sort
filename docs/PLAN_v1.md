# PLAN_v1.md — Potion Sort v1 Implementation Plan (ARCHIVED)

> Archived 2026-07-09: v1 shipped (v1.2.0 on TestFlight). Superseded by the v1.3 `PLAN.md`
> at the repo root. Kept as the mechanics design-of-record — §2 "Reference behavior"
> is still the authority on the core pour rules and feel.

> How to use this file: work through phases strictly in order. At the start of each phase,
> enter Plan Mode and produce a concrete plan for that phase only (exact files, order,
> risks/edge cases), then wait for approval before writing code. A phase is complete when
> all its acceptance criteria pass and `npm test` + `npx tsc --noEmit` are green.

---

## 1. Product vision

A polished, relaxing color-sort puzzle game for iOS. The player pours colored liquid
between bottles until every bottle contains a single color. Reference behavior was studied
from a screen recording of a market-leading game in this genre; we replicate the *mechanics
and feel*, with original branding, art, and theme ("Potion Sort" — a cozy alchemy theme).

Target: playable, delightful v1 on TestFlight. No monetization, no backend, no social in v1.

## 2. Reference behavior (observed, must-match feel)

Core rules:
- A level = N bottles, each with capacity 4 segments. Some bottles start empty.
- Tap bottle A → it lifts/tilts up out of its row (selected state). Tap it again → deselects.
- Tap bottle B while A selected → pour if legal: B has space AND (B is empty OR B's top
  color == A's top color). All consecutive same-color top segments pour in one move,
  limited by B's remaining space.
- Illegal pour: brief shake + error haptic, A stays selected.
- Win when every non-empty bottle is uniform and full (or uniform, see Open Questions).

Feel details (from frame analysis):
- Pour animation: selected bottle floats above target, tilts ~60–90°, visible liquid
  stream, target fills segment by segment. Duration ~600–900ms, interruptible-feeling.
- Completing a bottle (uniform + full): cork pops on with sparkle particle burst + success haptic.
- Win sequence: board dims → fireworks/particles + logo card → reward popup ("PERFECT! +20 coins")
  → Continue → home screen, coins fly into the counter, level button increments.
- Layout: bottles arranged in up to 2 centered rows on a dark starry background;
  filled liquid is bright and saturated; empty bottles are dark translucent glass.
- In-level HUD: coin count (top-left), settings gear (top-right), "Level N" pill,
  bottom booster bar with 3 buttons, each showing a remaining-count badge.

Boosters:
- Undo: revert last move (stack-based, multiple undos allowed, consumes 1 charge per use)
- Shuffle: redistribute all non-completed liquid into a new solvable arrangement (1 charge)
- +Bottle: add one extra empty bottle to the board, once per level (1 charge)

## 3. Architecture

```
src/
  engine/            # pure TS, zero React imports
    types.ts         # Color, Bottle, Move, LevelDef, GameStatus
    rules.ts         # canPour, applyPour, isBottleComplete, isWin
    undo.ts          # move history + revert
    generator.ts     # seeded solvable-level generation + difficulty curve
    solver.ts        # BFS/DFS solvability check used by generator + shuffle
  state/
    gameStore.ts     # zustand: current level state, selection, moves, booster charges
    metaStore.ts     # zustand + AsyncStorage: currentLevel, coins, settings, booster inventory
  components/
    Bottle.tsx       # renders one bottle + its liquid segments
    Board.tsx        # lays out bottle rows, routes taps to store actions
    PourOverlay.tsx  # reanimated/Skia layer for the flying-bottle pour animation
    effects/         # SparkleBurst, Fireworks, CoinFly
    hud/             # CoinCounter, LevelPill, BoosterBar, SettingsSheet
  app/               # expo-router screens: index (home), game, (modals)
  assets/            # sounds, generated art placeholders
```

Data model (authoritative):
- `Color`: string union of 8 named colors with fixed hex values.
- `Bottle`: `{ id: string; segments: Color[] }` — index 0 = bottom, max length 4.
- `LevelDef`: `{ id: number; seed: number; bottles: Color[][]; emptyBottles: number }`.
- `Move`: `{ from: string; to: string; count: number; color: Color }`.
- Pours are the ONLY state mutation path for bottles. Selection, undo, boosters all
  compose from `applyPour` / recorded `Move`s.

## 4. Phases

### Phase 0 — Project setup
Tasks:
- `npx create-expo-app` with the TypeScript template; enable strict mode.
- Install: zustand, async-storage, reanimated, gesture-handler, skia, expo-haptics, expo-audio.
- Configure jest; add `npm test`, lint, typecheck scripts. Create folder skeleton above.
- Verify the blank app runs in Expo Go on the developer's iPhone.
Acceptance criteria:
- [ ] `npx expo start` shows a placeholder screen in Expo Go on a physical iPhone
- [ ] `npm test` runs a trivial passing test; `npx tsc --noEmit` is clean

### Phase 1 — Game engine (pure logic, no UI)
Tasks:
- Implement `types.ts`, `rules.ts` (canPour, pourAmount, applyPour, isBottleComplete, isWin).
- Implement `undo.ts` (apply/revert move history).
- Implement `solver.ts` (memoized DFS: is this state solvable? move-count estimate).
- Implement `generator.ts`: generate level from (levelNumber, seed) → guaranteed-solvable
  LevelDef. Difficulty curve: level 1 = 3 colors/5 bottles ramping to 8 colors/12+ bottles;
  document the curve as a table in code comments.
Acceptance criteria:
- [ ] ≥ 25 unit tests covering: legal/illegal pours, multi-segment pours, partial pours
      into near-full bottles, win detection, undo round-trips, generator solvability
      (property test: 100 random seeds across difficulty tiers all solvable)
- [ ] Zero React imports anywhere in `src/engine/`

### Phase 2 — Playable static board
Tasks:
- Board + Bottle components rendering a LevelDef: two centered rows, dark navy starry
  background, bright liquid segments, dark translucent empty bottles.
- Tap-to-select (selected bottle raises via simple transform), tap-to-pour wired to engine.
  Instant state update — fancy pour animation is Phase 3.
- Invalid pour → shake + `expo-haptics` error feedback.
- Basic HUD: Level pill, restart button.
Acceptance criteria:
- [ ] A generated level 1 is fully playable start-to-win in Expo Go with taps only
- [ ] Illegal pours shake and never mutate state; win logs to console

### Phase 3 — The pour: animation, feel, sound
Tasks:
- PourOverlay: selected bottle animates to a position above the target, tilts, pours;
  liquid stream drawn with Skia; target segments fill progressively; source drains.
  Spring-based, 600–900ms total.
- Bottle-complete: cork appears + SparkleBurst particles + success haptic + chime.
- Sound design: pour, complete, error, win (source/generate royalty-free placeholder SFX).
- Settings sheet: sound / haptics toggles (persisted in metaStore).
Acceptance criteria:
- [ ] Pour animation runs at 60fps on device (verify with the performance monitor)
- [ ] Rapid tapping during an animation cannot corrupt state (input locked or queued)
- [ ] Completing a bottle fires cork + sparkles exactly once

### Phase 4 — Win flow, progression, persistence
Tasks:
- Win sequence: dim → fireworks particles → reward card ("Perfect! +20 coins") → Continue.
- metaStore: currentLevel, coins, settings, booster inventory — persisted to AsyncStorage,
  rehydrated on launch.
- Home screen (expo-router `index`): themed background, big "Level N" button, coin counter
  with fly-in animation after a win, settings gear. Navigation home ↔ game.
Acceptance criteria:
- [ ] Beat level N → returned home → button reads "Level N+1" → survives full app restart
- [ ] Coins accumulate (+20/win) and persist

### Phase 5 — Boosters
Tasks:
- BoosterBar with Undo / Shuffle / +Bottle, count badges, disabled states at 0.
- Undo consumes a charge and reverses the last move (chainable).
- Shuffle redistributes non-completed liquid via generator, re-verified solvable by solver.
- +Bottle adds one empty bottle (reflows layout), max once per level.
- Start inventory: 3 of each; wins occasionally award charges (simple drop table).
Acceptance criteria:
- [ ] Each booster works, decrements its count, disables at 0, persists across restarts
- [ ] Post-shuffle state is always solvable (assert via solver in dev builds)

### Phase 6 — Polish + real iOS build
Tasks:
- App icon + splash (original alchemy theme; generate placeholder art).
- Onboarding hints on level 1 (tap-here pointers). Edge cases: interrupted app, empty
  states, safe-area on all iPhone sizes.
- `eas build --platform ios --profile development` → install on device; fix any
  native-build issues. Then a `preview` build for TestFlight readiness.
Acceptance criteria:
- [ ] EAS development build installs and runs on the developer's iPhone (no Expo Go)
- [ ] Levels 1–30 played through without a crash, soft-lock, or unsolvable board

### Phase 7 (v1.1, do not start without approval) — Meta-game
Lives system with timer, coin-spend on boosters, daily challenge, locked-tab home nav
(Shop/Leaderboard/Teams placeholders), Game Center achievements. Deliberately out of v1.

## 5. Open questions (resolve with the developer before the relevant phase)
1. Win condition nuance: must uniform bottles also be FULL to count, or is uniform enough?
   (Reference game appears to require full+uniform → cork. Default to full+uniform.)
2. Color-blind support: add pattern/symbol overlays on segments? (Recommend yes, Phase 6.)
3. Level count for v1: generator is infinite, but should we hand-tune the first 10 levels? (Recommend yes.)
4. Sound assets: generate placeholders now and replace with licensed SFX before TestFlight?

## 6. Explicitly out of scope for v1
Backend/accounts, ads, in-app purchases, teams/social, live events, leaderboard,
collection meta-game, Android release (the codebase will support it later for free).
