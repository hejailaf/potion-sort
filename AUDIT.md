# v1.3 Phase 0 — repo audit record

> Temporary file, per docs/V1.3_BRIEF.md Phase 0. Deleted at the end of v1.3 (Phase 6).
> Records what the audit found, what was removed and why, and what was deliberately kept.

Audit date: 2026-07-09, against v1.2.0 (commit 224188b). Method: usage detected by actual
imports/references (grep across src/, modules/, app.json, app.config.js, jest.setup.js,
package.json), never by filename. `depcheck` was not used (not installed; manual grep
covered all 30 deps instead).

## Overall verdict

The repo was already healthy: **0 unreachable source files** (all 40 files under src/
reachable from the 5 expo-router entries + tests), **0 commented-out code blocks**, **all 8
assets referenced**, all package.json scripts valid, no duplicated config, .gitignore
already covers every build artifact (/ios, /android, .expo/, dist/, web-build/, ds-bundle/,
.ds-sync/, node_modules).

## Removed (isolated deletion commit)

| Item | Why |
|---|---|
| dep `@expo-google-fonts/fredoka` | Zero references. App loads Baloo2 + Nunito only (src/app/_layout.tsx). Fredoka appeared only in design-sync tooling, now synced to the real fonts. |
| dep `expo-web-browser` | Zero references — no import, no plugin, no in-app browser flow. Template leftover. |
| dep `expo-status-bar` | Zero references — no `<StatusBar>` anywhere; this app's _layout.tsx omits the template default. |
| `shade()` in src/components/vial.ts | Only dead export in the codebase; no importer, no internal call, no test. Orphaned when LIQUID_DARK became a literal record. |
| src/engine/__tests__/smoke.test.ts | Trivial "jest runs TypeScript" sanity test; the other ~120 tests prove the same thing. |
| `console.log('WIN: …')` in src/state/gameStore.ts | Debug logging shipping in production, fired on every win. The gameStore test that asserted the log now asserts win state directly. |

## Changed (consolidation commit)

| Item | Change |
|---|---|
| src/theme.ts | Added `timing` token group (`hintAutoDismiss` 2600ms, `adWatchDelay` 400ms) — the two UX delays that were each duplicated in two files. |
| BoosterBar.tsx, journey.tsx | Inline hex that exactly duplicated `theme.button.violet` / `theme.button.green` → token refs. Zero visual change. |
| CoinCounter.tsx, LivesPill.tsx | Were still painting the **v1** green (#4FB93F/#2A7A21) — missed in the v2 reskin. Now `theme.button.green` (#56BE3E/#2F7D22). **Approved visible shade change.** |
| GameModal.tsx | Same story for red: #D93D2B/#A32516 → `theme.button.red` (#E85742/#A03325). **Approved visible shade change.** |
| OnboardingHint.tsx, BoosterBar.tsx, LevelPill.tsx | Duplicated 2600ms / 400ms literals → `theme.timing` tokens. |
| .design-sync/ (conventions.md, fonts.css, fonts/) | Docs described the retired v1 indigo palette + Fredoka fonts. Synced to v2 "Candlelit Alchemy" (source of truth: src/theme.ts) and Baloo2/Nunito TTFs copied from the installed `@expo-google-fonts/*` packages. |

## Deliberately kept (uncertain or wrong-fit items — do not "clean up" later without reading this)

- **deps `expo-constants`, `expo-system-ui`** — no direct import, but Expo plumbing reads
  them internally (system-ui applies app.json's root `backgroundColor`). Removal risk
  outweighs two lines of package.json. Classified UNCERTAIN → keep.
- **deps with no direct import that ARE load-bearing**: expo-asset + expo-splash-screen
  (config plugins in app.json), react-dom + react-native-web (web target / design-sync),
  react-native-screens + react-native-gesture-handler (expo-router peers),
  react-native-worklets (reanimated 4 hard dep), expo-font (@expo-google-fonts re-export),
  expo-linking (scheme/deep links), expo-dev-client (dev builds).
- **Skia art constants** (vial.ts LIQUID_DARK/LIGHT records, rgba shading in
  VialGlass/PourOverlay/Bottle) — per-liquid art data, not UI chrome; wrong fit for
  theme.ts. Left in place.
- **Redundant `export` keywords** on internally-used symbols (liquid.ts C_FLY/K_FLY,
  gamecenter.ts LEADERBOARD_ID, vial.ts LIQUID_DARK, assorted types) — harmless, left alone.
- **Spacing magic numbers** (~10 files) — no spacing scale exists; deferred to Phase 4
  (UI overhaul), which re-touches every one of those screens anyway. Decided with the user.
- **README.md (create-expo-app boilerplate) and PLAN.md (v1-era)** — stale but owned by
  Phase 1 (documentation reset); not touched in Phase 0.
- **No `.easignore` added** — EAS falls back to .gitignore, which already excludes the
  heavy dirs. **No CLAUDE.md context-hygiene note needed** — nothing tracked bloats context
  (heaviest tracked file is the 584K package-lock.json).
- **docs/privacy-policy.html** — referenced by App Store listing, not by code. Keep.

## Asset inventory (all USED, total ≈ 246 KB tracked)

icon.png 96K (app icon) · splash-icon.png 14K · android-icon-foreground.png 5.7K ·
favicon.png 1.1K · liquid-pour.wav 56K · win.wav 43K · complete.wav 24K · error.wav 6.9K.
