# Potion Sort — project brief

Cozy alchemy **color-sort puzzle** for iOS (pour liquid between glass vials until each holds one color). Solo project. Stack: Expo SDK 54 · React Native · TypeScript · expo-router · zustand · React Native Skia (vials + pour animation) · one local Swift Expo module for Game Center. Shipped to TestFlight (v1.2.0); a public App Store release is a later, metrics-gated decision.

**Start here:** invoke the **`potion-sort` skill** (`.claude/skills/potion-sort/SKILL.md`) for the architecture map, where everything lives, the dev/build/ship workflow, project conventions, and the hard-won gotchas ledger. Run `git log --oneline` for current status (this file stays deliberately stable).

## Working rules

- **Expo HAS CHANGED** — read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any Expo code.
- **Ponytail / lazy**: the smallest change that works, reuse before adding, no speculative abstraction, no new dependency for what a few lines do. Mark deliberate shortcuts with `// ponytail:`.
- **Green gate before every commit**: `npm test` && `npx tsc --noEmit` && `npx eslint src --max-warnings 0`.
- **Managed / CNG project**: `ios/` is generated and gitignored — never eject or hand-edit it. Build locally with `npx expo run:ios`; iterate over Metro + a dev client.
