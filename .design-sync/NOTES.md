# Potion Sort — design-sync notes

## This is an off-envelope sync (React Native, not a web DS)

Potion Sort is an **Expo React Native game**, not a web component library. There is no `dist`, no Storybook, no `exports`. Only the three plain-RN **`ui/` primitives** are synced — `GameButton`, `IconButton`, `GameModal` — rendered in the browser via **react-native-web**. The signature game components (`Bottle`, `Board`, `PourOverlay`, `VialGlass`) are **@shopify/react-native-skia** + **react-native-reanimated** and **cannot** render in Claude Design's web runtime — they are deliberately excluded and must never be added.

## Build pipeline (not the converter's default)

- The converter's `--entry` is a **pre-built react-native-web bundle**: `.design-sync/build-web-dist.mjs` (esbuild) aliases `react-native` → `react-native-web`, resolves `@/` via tsconfig, and keeps **react/react-dom external** so the converter's `_vendor` provides ONE React instance (RNW's `Pressable` uses hooks — two React copies throw "Invalid hook call"). Output: `.design-sync/.cache/web-dist/index.js` (gitignored). `cfg.buildCmd` runs it.
- Re-sync order: `node .design-sync/build-web-dist.mjs` **then** the converter `--entry ./.design-sync/.cache/web-dist/index.js`.
- Fonts: Baloo2/Nunito ttf (`.design-sync/fonts/` + `.design-sync/fonts.css`) via `cfg.extraFonts`. Components reference `Baloo2_700Bold` / `Baloo2_800ExtraBold` / `Nunito_700Bold` family names at runtime (via `src/theme.ts` font tokens); without the `@font-face` they fall back to system font.
- Styling is `[CSS_RUNTIME]` (RNW injects styles at runtime) — expected, non-blocking. `_ds_bundle.css` is a stub; the bundle is self-styling.

## The RNW rootEmpty fix (important — don't remove)

`build-web-dist.mjs` renames RNW's injected `<style id="react-native-stylesheet">` to `id="ds-rnw-stylesheet"` (an esbuild `onLoad` transform on `react-native-web/.../StyleSheet/dom/index.js`). **Why:** the id starts with `r`, so the render-check's `[id^="r"]` selector picked the empty `<style>` as the mount root and false-flagged every non-portal card as `[RENDER] root empty`. Renaming it (purely cosmetic for RNW) makes the check see the real cell mounts (`#r0…#rN`). Without this, GameButton and IconButton fail the render gate even though they render perfectly.

## Known render warns (benign — recorded per the skill)

- **`[RENDER_THIN]` GameModal — "rendered height is 0px"**: RNW's `Modal` is `position: fixed`, so the card root measures 0 height even though the dialog renders fully (confirmed in `_screenshots/review/general__GameModal.png` — both Rescue and Confirm render correctly). GameModal uses `cfg.overrides` `cardMode: single`, `viewport: 380x560` so the overlay renders inside the card. Benign — do not "fix".

## Re-sync risks / watch-list

- **RNW version bump** could change the injected style-element id or the sheet module path → re-check the rename filter/string in `build-web-dist.mjs` (currently matches `'react-native-stylesheet'`).
- **theme.ts palette drift**: `conventions.md` hand-lists hex values (gold/violet/green/red/panel/cream/gold-text) from `src/theme.ts`. If theme colors change, re-validate those hexes against the build (they're prose, not exported tokens).
- **dtsPropsFor is hand-written** for all 3 (the RN components ship no `.d.ts`). If a component's props change in source, update `cfg.dtsPropsFor`.
- **Adding a component** means adding it to `.design-sync/web-entry.ts` (and `componentSrcMap`, `dtsPropsFor`) — the entry, not discovery, defines the set.
- Browser for the render check: playwright + chromium were installed in `.ds-sync/` (gitignored) — a fresh clone re-installs.
