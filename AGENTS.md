# Potion Sort — project brief

Cozy alchemy **color-sort puzzle** for iOS: pour liquid between glass vials until each holds
one color. Solo project. **v1.2.0 on TestFlight**; v1.3 in development — live scope in
`PLAN.md`, spec in `docs/V1.3_BRIEF.md`, status via `git log --oneline` (this file stays
deliberately stable). A public App Store release is a separate, metrics-gated decision.

**Start here:** invoke the **`potion-sort` skill** (`.claude/skills/potion-sort/SKILL.md`)
for the architecture map, where everything lives, the dev/build/ship workflow, and the
hard-won gotchas ledger.

## Stack (versions from package.json — verify there, not here)

Expo SDK ~54 · React Native 0.81 · React 19.1 · TypeScript 5.9 (strict) · expo-router 6 ·
zustand 5 · react-native-reanimated ~4.1 · @shopify/react-native-skia 2.2 · jest-expo.
One local Swift Expo module (`modules/game-center/`, ~80-line GameKit bridge) — everything
else is TypeScript.

## Architecture rules

- Dependency direction: **`engine ← state ← components ← app`** — never the reverse.
- `src/engine/` is **pure TS, zero React imports**. New mechanics are engine features
  first, rendering second. Pours (`applyPour`) are the only bottle-mutation path.
- UI chrome colors, radii, fonts, and shared timings come from **`src/theme.ts` tokens**.
  Skia liquid/glass art constants deliberately live with their components (vial.ts) — don't
  force them into the theme.
- Level modifier system: <!-- finalize: Phase 6 --> designed in v1.3 Phase 2 (`PLAN.md`);
  documented here once it lands.

## Commands

- Dev loop: `npx expo start --dev-client` (hot reload); full build `npx expo run:ios`
  (prefix `APP_VARIANT=development` for the `.dev` bundle id). CocoaPods needs a UTF-8
  locale (`LANG=en_US.UTF-8`).
- **Green gate before every commit**: `npm test` && `npx tsc --noEmit` &&
  `npx eslint src --max-warnings 0`.
- Ship: `eas build --profile production` then `eas submit --platform ios --latest`.

## Working rules

- **Expo HAS CHANGED** — read the exact versioned docs at
  https://docs.expo.dev/versions/v54.0.0/ before writing any Expo code.
- **Ponytail / lazy**: the smallest change that works, reuse before adding, no speculative
  abstraction, no new dependency for what a few lines do. Mark shortcuts with `// ponytail:`.
- **Managed / CNG project**: `ios/` is generated and gitignored — never eject or hand-edit
  it. Native changes = rebuild; TS changes = hot reload.
- **During v1.3**: Plan-Mode gate per phase and ask-before-any-undecided-choice are in
  force — see the operating rules in `PLAN.md`.

## Lessons that cost real time (full ledger in the skill)

- Measure layouts **at use time**, not mount — cached `measureInWindow` frames go stale.
- A full-screen Skia `Canvas` swallows touches — wrap in `pointerEvents="none"`.
- Reanimated spring completion callbacks fire ~0.5s after visual arrival — use
  `withTiming` for hand-offs that gate input.
