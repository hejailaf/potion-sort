# PLAN.md — Potion Sort v1.3

> The operational plan for the v1.3 update. Spec of record: `docs/V1.3_BRIEF.md`.
> The v1 implementation plan is archived at `docs/PLAN_v1.md` (its §2 reference-behavior
> spec still governs core pour rules).

## Status

| Phase | State |
|---|---|
| 0 — Repo audit & decluttering | ✅ done (`3c77acd`, `33737e0`, `a1822d6`; see AUDIT.md) |
| 1 — Documentation reset | ✅ done (this commit) |
| 2 — Mechanics framework (engine) | ✅ done (engine core `c715432` + integration commit) |
| 3 — Mechanics UI & unlock moments | ✅ done (`3f25ccd`, `a35ea73`, `0720679`) |
| 4 — Measured pour choreography (per user spec) | ✅ done (`1975bd6`…`82a80e4`); UI polish audit deferred to Phase 4-F |
| 4-F — UI polish audit & fixes | ✅ done (this commit); Release re-measure closed the Phase 4 open item |
| 5 — Journey tab rework | pending |
| 6 — Regression, docs close-out, build | pending |

> **Amendment (2026-07-10, user-approved):** one color completes exactly ONE bottle at
> every tier (tested invariant). Palette grew 8 → 10 (`ivory`, `umber`); difficulty curve
> steepened to reach 12 bottles (10 colors + 2 empties) at level 38+, matching the
> reference game. Curated seeds 1–10 and 20–24 re-pinned (all deals changed with the
> palette). Also new: the delegation working rule in AGENTS.md.

## Operating rules (from the brief — non-negotiable)

1. **Plan-Mode gate per phase**: before each phase, produce a plan (files, order, risks, open questions) and wait for approval.
2. **No silent improvisation** — if reality diverges from the approved plan, stop and surface it.
3. **Engine purity**: rules live in `src/engine/` as pure TS; dependency direction `engine ← state ← components ← app`. New mechanics are engine features first.
4. **Latest stable APIs** — verify installed Reanimated/Skia/Expo versions before writing animation/graphics code.
5. **Tests ship with logic**; a phase is done when acceptance criteria pass and `npm test` + `npx tsc --noEmit` (+ eslint) are clean.
6. **Demonstrated, not declared** — show passing tests / simulator evidence per phase.
7. **Ask before any undecided choice** — 2–3 concrete options with a recommendation; never pick silently.
8. Simulator may be used freely for read-only testing at any time.

## Phase 2 — Mechanics framework (engine) ✅

> **Scope amendment (user, 2026-07-09):** v1.3 ships **three** mechanics, not two —
> the Mechanic B trade-off was resolved as "build both": **Veiled Bottles (20),
> Mystery Potions (40), Chained Bottles (60)**. Decisions also locked: curated seeds
> for 20–24 (pinned in Phase 3 once veils render); retroactivity = level N's modifiers
> depend only on N; at most one mechanic per level (stacking → BACKLOG.md).

Shipped: `LevelDef.modifiers` (typed, serializable, seeded-RNG-friendly); `Bottle.veiled`/
`Bottle.locks` + `Move.decremented`; frozen-bottle pour legality; cork-lifts-one-veil
(lexicographically smallest contents — keeps the solver's sorted-key sound); board-global
lock countdown with exact undo; veil/lock-aware solver (key prefixes + reveal transition +
empty-pour pruning suspended while chains tick); `progression.ts` (unlock map + tunable
`RAMP` + `modifiersFor`, ≤1 mechanic/level, ~25% breathers); `generateLevel(level, seed,
withModifiers)` solver-verifies WITH modifiers (separate RNG stream keeps base deals
byte-identical); shuffle excludes frozen bottles; store: commit-time reveal, frozen-tap
shake, mystery `hiddenCounts` watermark (persisted, monotone, shuffle re-hides).

**Acceptance met:** 157 tests green; LevelDef JSON round-trip per modifier; 200-random-seed
solvability property (67 seeds × 3 bands); unlock boundaries 19/20/21, 39/40/41, 59/60/61.
**Note:** the app path still generates without modifiers — Phase 3 flips the one
`loadLevel` call site when the veil/mystery/chain visuals exist.

## Phase 3 — Mechanics UI & unlock moments ✅

Shipped: veil fog + "?" with 500ms reveal fade (permanent opacity-toggled Skia nodes —
never conditionally mounted, per the one-frame-late rule); **wax seal** + countdown with
pop-off animation (player-facing name: **Sealed Bottles**); mystery segments render
unknown-navy with "?" glyphs, masked in the flying pour clone too (`ActivePour.srcHidden`);
colorblind symbols suppressed where they'd leak; `loadLevel` generates with modifiers in
normal mode (**daily stays vanilla**); mechanics always debut on their exact unlock level;
one-time `UnlockInterstitial` (GameModal + mini-vial stepper) at 20/40/60 with
`seenUnlocks` latch; one-time `MechanicHint` banner on the first level featuring each
mechanic; `__DEV__` level-jump chips in Settings; CURATED_SEEDS 20–24 pinned
(1 veil, estimates 17/19/19/20/21). Bugfix found in planning: a corked mystery bottle
now clears its watermark.

**Acceptance met:** simulator walkthroughs 19→21, 39→41, 59→61 — interstitials, hints,
veil reveal on cork (recorded), mystery reveal-on-surface + masked flight (recorded),
seal countdown + pop (recorded); interstitial-not-reshown and lifted-veil state verified
across app kill/relaunch; levels 19/20/39/40/59/60 each played start-to-win on device.

## Phase 4 — Measured pour choreography & physics ✅ (user spec replaced the pour-feel scope)

Shipped per the frame-measured reference spec (`pour` + `celebration` token groups —
zero magic numbers): rise 100ms → anticipation hold 160ms → combined travel+tilt 270ms
to 72° (mouth pivot, near-rim anchor over the adjacent column) → LINEAR fill/drain at
145ms/segment on its own shared value with a 50ms top-off ease → 130ms stream tail
overlapping a 300ms ease-in-out straight return. Rigid liquid (SLOSH_ENABLED off; exact
screen-horizontal counter-rotation), steady thin stream (1.2% screen width), arrival
stripped to one faint ripple. Completion celebration fires at TOP-OFF: ribbon swirl,
16-particle shell, ember, cork materializing 0.35h above the neck and dropping with a
settle. Two Skia prop-timing races found and fixed (overlay fill masks the unfreeze;
complete bottles paint their full column via the surface path).

**Measured acceptance (60fps recording, PyAV frame extraction):** lift +2%, rise ~100ms,
hold −6%, travel −9%, fill 141ms/segment (−3%) and **dead linear at 17±1px per frame**;
concurrency (two disjoint pours, one corking) clean; full level played to a win.
**Open item — CLOSED in 4-F:** celebration onset re-measured on a Release build:
lag is 1–3 frames (~17–50ms) after top-off. The ~0.8s was dev-bundle JS jank only;
no tuning needed.

## Phase 4-F — UI polish audit & fixes ✅

Audit ran per the brief (keep/polish/rework verdict on every screen/interaction; table
in the phase plan). Shipped: `theme.timing` grown into the motion scale (12 new tokens
incl. `pressScale`; selection/shake/flash/win/coin-fly literals tokenized, values
unchanged); press states normalized to `pressScale` and added where missing (HomeTabBar
tabs, GameModal ✕, shop pack rows); Home↔Journey = 180ms crossfade (`animation:'fade'`
on index/journey — game keeps push, shop stays modal); board deal-in (FadeInDown 260ms,
30ms stagger, keyed on `startedAt` so it replays per deal, never per pour); win jingle
moved from pour-commit to WinOverlay mount (audio now lands with the card); coin-fly
reworked per user spec — coins 24pt, per-coin haptic tick + SparkleBurst splash + icon
pulse on arrival, counter holds the old total and ticks up per landing
(`coins − pendingCoinReward`, `deliverCoins` chunks), and the fly aims at the icon
measured at USE time via a poll-until-stable window (the detached screen lays out with
inset 0 under react-native-screens — a single measure, even relative, locks onto the
frozen layout; the stability window must outlast the route transition). Safe areas
audited: correct everywhere; game.tsx double bottom padding left as intentional.

**Acceptance:** 173 tests + tsc + eslint green (2 new metaStore tests); before/after
recordings for tab switch, win sequence, and coin-fly (frame-extracted evidence:
crossfade vs slide, counter hold→tick with splash-on-icon, deal-in stagger mid-entry);
Release-build celebration measurement above.

## Phase 5 — Journey tab rework

- Path with **milestone nodes at every mechanic unlock** (20, 40, 60, future slots as locked "???").
- Locked = silhouette + level requirement; unlocked = icon + tap-to-recall mini explainer (reuses Phase 3 interstitial content).
- Current-level indicator, completed styling, scroll-to-current on open.
- Fully data-driven from `progression.ts` — a future level-60 mechanic must need zero Journey code changes.

**Acceptance:** correct rendering for fresh / level-25 / level-45 saves (via debug state injector); milestones come from progression data only.

## Phase 6 — Regression, docs close-out, build

- Full regression playtest per `PLAYTEST.md` (fresh install, core loop, boosters, both mechanics, Journey, persistence).
- Update AGENTS.md lessons + finalize the two stubbed doc sections (`<!-- finalize -->` markers in AGENTS.md and README.md); delete AUDIT.md; verify README matches reality.
- Bump to 1.3.0, EAS iOS build, write RELEASE_NOTES.md.

**Acceptance:** playtest report with zero open critical/high bugs; clean build; docs current.

## Out of scope for v1.3

New monetization, lives-system changes, leaderboards/social, Android, backend/accounts, a fourth mechanic (the brief's two-mechanic cap was amended to three by the user on 2026-07-09). Tempting ideas go to `BACKLOG.md`, not into the build.
