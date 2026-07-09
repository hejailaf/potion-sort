# PLAN.md — Potion Sort v1.3

> The operational plan for the v1.3 update. Spec of record: `docs/V1.3_BRIEF.md`.
> The v1 implementation plan is archived at `docs/PLAN_v1.md` (its §2 reference-behavior
> spec still governs core pour rules).

## Status

| Phase | State |
|---|---|
| 0 — Repo audit & decluttering | ✅ done (`3c77acd`, `33737e0`, `a1822d6`; see AUDIT.md) |
| 1 — Documentation reset | ✅ done (this commit) |
| 2 — Mechanics framework (engine) | ⏳ next |
| 3 — Mechanics UI & unlock moments | pending |
| 4 — Animation & UI overhaul | pending |
| 5 — Journey tab rework | pending |
| 6 — Regression, docs close-out, build | pending |

## Operating rules (from the brief — non-negotiable)

1. **Plan-Mode gate per phase**: before each phase, produce a plan (files, order, risks, open questions) and wait for approval.
2. **No silent improvisation** — if reality diverges from the approved plan, stop and surface it.
3. **Engine purity**: rules live in `src/engine/` as pure TS; dependency direction `engine ← state ← components ← app`. New mechanics are engine features first.
4. **Latest stable APIs** — verify installed Reanimated/Skia/Expo versions before writing animation/graphics code.
5. **Tests ship with logic**; a phase is done when acceptance criteria pass and `npm test` + `npx tsc --noEmit` (+ eslint) are clean.
6. **Demonstrated, not declared** — show passing tests / simulator evidence per phase.
7. **Ask before any undecided choice** — 2–3 concrete options with a recommendation; never pick silently.
8. Simulator may be used freely for read-only testing at any time.

## Phase 2 — Mechanics framework (engine)

Generic **level modifier system** so v1.3 ships two mechanics and future ones are near-free.
Before planning: read `docs/V1.3_BRIEF.md` §Phase 2 (full spec) and `src/engine/`
(`types.ts`, `generator.ts`, `solver.ts` — the contracts the modifiers extend).

- Level schema gains a typed, serializable, seeded-RNG-friendly `modifiers` array; engine resolves modifiers, UI only renders their state.
- Unlock schedule is data: `progression.ts` maps `level → mechanic`. v1.3: **level 20 → Veiled Bottles**, **level 40 → Mechanic B**.
- **Veiled Bottles**: bottles start fully hidden (opaque veil; can't pour in or out). A veil lifts when the player corks any other bottle. Ramp levels 20–39: 1 veiled bottle with early reveals → several veils requiring sequenced reveals. Ramp = tunable parameters, not magic numbers.
- **Mechanic B**: default proposal **Mystery Potions** (segments below the top render "?" until surfaced). The Phase 2 plan must present it against one alternative (e.g. chained/locked bottles) with a difficulty/implementation trade-off table — **user picks before build**.
- Deadlock detection and the generator account for modifiers; generated modifier levels are guaranteed solvable.
- Tests: reveal triggers, pour legality under modifiers, unlock boundaries (19/20/21, 39/40/41), property-style solvability over many seeds.

**Acceptance:** all tests pass; a level JSON with each modifier round-trips serialize/deserialize; generator produces solvable modifier levels across **200 random seeds**.

**Open decisions (ask before building):**
1. Mechanic B: Mystery Potions vs. alternative (trade-off table due in the Phase 2 plan).
2. Veiled bottles in hand-tuned early-ramp levels 20–24, or generator-only?
3. Retroactivity for players already past 20/40 — brief default: mechanics apply to all levels ≥ unlock level regardless of when reached.

## Phase 3 — Mechanics UI & unlock moments

- Render veils (Skia fog/veil material + reveal animation) and Mechanic B's visual language, on-theme.
- One-time unlock interstitial at 20/40: names the mechanic, 2–3 step visual explainer, "got it"; skippable, never twice, persisted.
- First level with each mechanic: one dismissable contextual hint, then never again.
- Haptics/SFX hooks for reveal events, matching existing audio patterns.

**Acceptance:** simulator walkthrough of 19→21 and 39→41 showing interstitial, hint, 60fps reveal, persistence across restart.

## Phase 4 — Animation & UI overhaul (refine, don't redesign)

- Audit pass in Plan Mode first: every screen/interaction gets keep/polish/rework + specific issues.
- Polish targets: pour feel (spring curves, anticipation/settle), selection feedback, win pacing, coin-fly, screen transitions, press states, safe areas.
- All timings/curves from `theme.ts` tokens (the `timing` group started in Phase 0).
- Guardrail: profile before/after; no dropped frames during pour (iPhone 12-class); Skia only where Views can't.

**Acceptance:** before/after recordings for the 3 biggest improvements; no latency regression; spacing/typography consistent via tokens.

## Phase 5 — Journey tab rework

- Path with **milestone nodes at every mechanic unlock** (20, 40, future slots as locked "???").
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

New monetization, lives-system changes, leaderboards/social, Android, backend/accounts, >2 new mechanics. Tempting ideas go to `BACKLOG.md`, not into the build.
