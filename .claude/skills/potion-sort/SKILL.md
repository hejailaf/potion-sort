---
name: potion-sort
description: Resume-context playbook for the Potion Sort iOS game. Load when starting or resuming work on this repo — gives the tech stack, where everything lives, the dev/build/ship workflow, project conventions, and the hard-won gotchas so a session starts warm instead of re-deriving it all.
---

# Potion Sort — resume context

Cozy alchemy **color-sort puzzle** for iOS: pour liquid between glass vials until each holds one color. Built solo. Public repo `hejailaf/potion-sort`.

> This file is intentionally stable. For *live* status (current version, what's in flight, what's blocked) check `git log --oneline` and the auto-memory `potion-sort-phase-status`, not this file.

## Stack

Expo SDK 54 · React Native · TypeScript · expo-router · zustand · @shopify/react-native-skia (vials + pour drawn in Skia) · reanimated. One Swift file (Game Center). It is **not** a native Swift app — game logic is TS; the only Swift is a ~80-line GameKit bridge.

## Where things live

- `src/engine/` — pure TS, **zero React**: `rules.ts` (canPour/applyPour/isWin), `solver.ts`, `generator.ts` (seeded levels), `types.ts` (Color, COLOR_HEX, BOTTLE_CAPACITY=4). Don't add React imports here.
- `src/state/` — zustand: `gameStore.ts` (board, `activePours` concurrent-pour records, `mode` normal|daily, `quitLevel`/`restart`/`loadDaily`) and `metaStore.ts` (persisted: coins, boosters, lives + `regenLives`/`spendLife`/`refillLives`/`grantLife`/`grantBooster`/`buyBooster`/`addCoins`, daily, review/notif flags). Pure economy helpers are exported and unit-tested.
- `src/components/` — `Board.tsx`, `Bottle.tsx` (Skia vial), `PourOverlay.tsx` (Skia pour: tilt/drain/stream/splash on one canvas), `EffectsLayer.tsx`; `hud/` (CoinCounter, LivesPill, LevelPill, BoosterBar, HomeTabBar, SettingsSheet); `ui/` (GameButton, GameModal, IconButton — the design-system primitives); `effects/`; shared vial geometry in `vial.ts` + `VialGlass.tsx`.
- `src/app/` — expo-router screens: `_layout.tsx` (fonts + service init + shop modal), `index.tsx` (home), `game.tsx` (`?daily=1`), `shop.tsx` (modal, RevenueCat).
- `src/theme.ts` — design tokens (colors/radii/shadows/font). Restyle work goes through these, not hardcoded values.
- `src/{sound,ads,analytics,gamecenter,notifications}.ts` — thin fail-soft service wrappers.
- `modules/game-center/` — local Expo module (Swift GameKit). `assets/sounds/` (SFX incl. synthesized `liquid-pour.wav`), `assets/images/`.
- Tests: `src/**/__tests__/` (jest-expo). ~90 tests, engine + store logic only (no component tests).

## Dev workflow

- **Iterate over Metro + dev client**: `npx expo start --dev-client` (LAN; needs the firewall rule) or `--tunnel` (ngrok — occasionally flaky, restart if "remote gone away"). Edit `.ts`/`.tsx` → hot-reloads instantly. Only rebuild for native changes (app.json/config, Swift, new native dep).
- **On the Mac**: `npx expo run:ios` (does prebuild + pods + build + simulator + Metro). This is a **CNG/managed** project — `ios/` is gitignored and generated; never commit it / never eject or config plugins stop applying. For the dev variant prefix `APP_VARIANT=development`.
- **App variants**: dynamic `app.config.js` layers on `app.json` — `APP_VARIANT` → bundle-id suffix `.dev`/`.preview` so a dev build coexists with the TestFlight app. Production id `com.hejailaf.potionsort`, unchanged.
- **Ship**: `eas build --profile production` then `eas submit --platform ios --latest` (`ascAppId` 6787759382 pinned in eas.json → submits are non-interactive). `--local` builds on the Mac instead of the cloud.

## Conventions

- **Ponytail / lazy**: smallest change that works, reuse before adding, no speculative abstraction, native `Alert` or existing patterns over new deps. Mark deliberate shortcuts with `// ponytail:`.
- **Green gate before every commit**: `npm test` && `npx tsc --noEmit` && `npx eslint src --max-warnings 0`.
- Commits end with a `Co-Authored-By: Claude ...` trailer. LF→CRLF git warnings on Windows are harmless.

## Gotchas ledger (these cost real time — respect them)

- **Game Center capability is NOT auto-synced by EAS.** Adding the `com.apple.developer.game-center` entitlement fails the build until you toggle Game Center on the App ID in the Apple Developer portal (for **each** bundle id: `.dev` and production), then run the build **interactively** once — non-interactive reuses the stale provisioning profile without revalidating and keeps failing.
- **RevenueCat is skipped in `__DEV__`** (`shop.tsx`): IAP products belong to the production bundle id in ASC, so the `.dev` variant can never fetch them. The Shop only truly works on the **TestFlight/production** build via sandbox. In dev it shows "being stocked" — that's correct, not a bug.
- **ATT prompt must fire strictly before ads init** (`ads.ts` lazy `ensureInit`). Never prompt at launch — reviewers reject context-free ATT.
- **`npm approve-scripts <pkg>` + `npm rebuild <pkg>`** on this machine for any dep with a blocked postinstall (recorded in package.json `allowScripts`).
- **Skia `Canvas` swallows touches** — always wrap a full-screen canvas in a `pointerEvents="none"` View, and put the board canvas behind the Pressable, or taps die.
- **Notification DATE triggers in the past fire immediately** — `syncNotifications` skips stale dates.
- **Native modules are mocked in `jest.setup.js`** (only expo-notifications needs it); the service wrappers (`gamecenter`/`ads`/analytics/RC) are `try/catch` fail-soft so they no-op in jest / simulator / when unauthenticated.

## Services & keys

Aptabase (analytics), AdMob (ads), RevenueCat (IAP) keys are **client-side, already committed** in `analytics.ts` / `app.json`+`ads.ts` / `shop.tsx` — not secrets, no private keys or `.p8` in the repo. User-side setup (not in code): ASC Paid Apps agreement, the AdMob/RevenueCat/Aptabase accounts, ASC Game Center leaderboard `potionsort.highest_level` + 5 achievements (ids in `gamecenter.ts`), a sandbox tester Apple ID.

## Testable where

jest covers engine + store logic. iOS **Simulator** runs the full game (UI, pours, sound, notifications, quit) but Game Center, IAP, real ads, and haptics only validate on a real device / **TestFlight** — they fail-soft in the simulator by design.

## Open threads

Public App Store release = a v1.2.1 call gated on Aptabase soft-launch metrics. Later ideas: real Teams tab, full pour chaining (pick up a mid-pour bottle), a licensed SFX pass if the synthesized pour underwhelms, optional SDK upgrade.
