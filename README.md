# Potion Sort 🧪

A cozy alchemy **color-sort puzzle** for iOS. Pour colored liquid between glass vials in a
candlelit workshop until every vial holds a single color, then cork it. Lives, boosters
(undo / shuffle / extra bottle / hint), a daily challenge, Game Center, and an endless
seeded level generator with a difficulty ramp.

**Status:** v1.3.0 on TestFlight (see [PLAN.md](PLAN.md)). A public App Store release is a
separate, metrics-gated decision.

## The rules

- Each vial holds up to 4 segments of liquid. Tap a vial to pick it up, tap another to pour.
- A pour is legal when the target has space and is empty or its top color matches. All
  consecutive same-color top segments pour together.
- A vial that's uniform and full gets corked. Cork every color to win.

## Running it

Prereqs: Node 20+, Xcode with an iOS Simulator, CocoaPods (comes with the build).

```bash
npm install
npx expo run:ios        # generates ios/, installs pods, builds, launches the simulator
```

Day-to-day you only rebuild for native changes — TypeScript edits hot-reload over Metro:

```bash
npx expo start --dev-client
```

The app runs fully in the simulator; Game Center, IAP, real ads, and haptics only validate
on a device or TestFlight (they fail soft everywhere else — by design).

| Script | What |
|---|---|
| `npm test` | Jest (engine + store logic, ~175 tests in `src/**/__tests__/`) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (zero warnings allowed) |

All three must pass before every commit ("the green gate").

## How the code is laid out

```
src/
  engine/       pure TypeScript, zero React — rules.ts (canPour/applyPour/isWin),
                generator.ts (seeded solvable levels), solver.ts, undo.ts, types.ts
  state/        zustand stores — gameStore (board, pours, selection),
                metaStore (persisted: progress, coins, lives, boosters, daily)
  components/   Skia + Reanimated presentation — Bottle, Board, PourOverlay,
                liquid physics (liquid.ts), HUD (hud/), design-system primitives (ui/)
  app/          expo-router screens — _layout, index (home), game, journey, shop
  theme.ts      design tokens: colors, button variants, radii, fonts, shadows, timings
  *.ts          fail-soft service wrappers: sound, ads, analytics, gamecenter, notifications
modules/game-center/   local Expo module — the one Swift file (GameKit)
assets/         app icon, splash, sound effects
```

### The engine/UI split

Game rules live in `src/engine/` as pure functions over plain data — no React, no Skia, no
timers. The zustand stores call the engine and hold the results; components render store
state and animate transitions. Dependency direction is strictly
`engine ← state ← components ← app`.

Why: the entire game logic is unit-testable in milliseconds (the level generator is
property-tested for solvability), and new mechanics land as engine features with tests
before a single pixel is drawn.

### Notes

- `ios/` is generated (Expo CNG) and gitignored — never hand-edit it.
- Pours are the only way bottle state mutates; selection, undo, and boosters all compose
  from `applyPour` and recorded moves.

## How to add a new mechanic

v1.3 shipped a generic **level modifier system**: `LevelDef.modifiers` is a typed,
serializable array (`veiled` / `mystery` / `chained` today, `src/engine/types.ts`); the
engine resolves all modifier behavior — pour legality (`rules.ts`), solvability
(`solver.ts`'s canonical key + DFS) — and `src/engine/progression.ts` maps unlock levels to
mechanics as data (`MECHANIC_UNLOCKS`, `modifiersFor`, `RAMP`). The UI only renders
modifier state.

A fourth mechanic is a 3-step recipe:

1. **Engine** — extend the `Modifier` union, apply it in `generator.ts`'s
   `createBottles`, `rules.ts`'s pour legality, and `solver.ts`'s canonical key, with tests.
2. **UI** — render the new bottle state in `Bottle.tsx` / `PourOverlay.tsx` if it needs
   visuals beyond what `MiniVial` already draws.
3. **Register** — add one `MECHANIC_UNLOCKS` entry (unlock level) and one `MECHANIC_COPY`
   entry (`UnlockInterstitial.tsx`: title + explainer steps).

Step 3 is the whole integration: the unlock interstitial, the first-level `MechanicHint`,
and the Journey milestone all derive from those two maps — no further changes.

## Docs map

- [PLAN.md](PLAN.md) — the v1.3 plan and status
- [docs/V1.3_BRIEF.md](docs/V1.3_BRIEF.md) — the v1.3 spec
- [docs/PLAN_v1.md](docs/PLAN_v1.md) — archived v1 plan (core-mechanics design-of-record)
- [PLAYTEST.md](PLAYTEST.md) — the simulator playtest protocol
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — what shipped, by version
- [AGENTS.md](AGENTS.md) — working brief for AI-assisted sessions
