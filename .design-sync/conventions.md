# Potion Sort UI

Three **React Native components** rendered via react-native-web, all under `window.PotionSortUI`: `GameButton`, `IconButton`, `GameModal`. They are the game's cozy "candlelit alchemy" UI kit — chunky, rounded, saturated, drop-shadowed, built to sit on a **warm dark mahogany background**.

## Setup

- **No provider or wrapper is needed.** Each component is self-contained and self-styling (styles inject at runtime) — render it directly.
- **Fonts:** the components use **Baloo 2** (headings/labels) and **Nunito** (body). They ship in `fonts/` and load via `styles.css` — include that stylesheet or labels fall back to a system font.
- **Design on dark.** The game's surface is a candlelit workshop of deep roasted browns (`#200F08` base, `#341B0F`–`#4A2A16` glow) with mahogany panels (`#57301F`); buttons and modals are drawn to read on dark.

## Styling idiom — props, not classes

There are **no CSS classes**. Style through props:

- **Variant props carry the design language.** `GameButton` takes `variant="violet" | "green" | "red"` plus `big` and `disabled`. `GameModal` composes a titled dialog from `title` / `icon` (an emoji) / `message` / `children`.
- **For your own layout glue, use React Native style objects** (RNW maps them to CSS): `<View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>`. Flexbox props, never utility classes.
- **The palette these components paint with** (baked in — you match it for surrounding UI, you don't pass it; source of truth `src/theme.ts`): brass-gold `#F5B841`, violet `#9C5CE8`, green `#56BE3E`, red `#E85742`, mahogany panel `#57301F`, cream card `#FFF1D6`, gold text `#FFE3A6`.

## The components

- **`GameButton`** — the primary CTA: highlight band on top, dark 3D rim below, sinks 2px on press. Always pass `label` + `onPress`; choose a `variant`; add `big` for a hero button, `disabled` to dim it.
- **`IconButton`** — a rounded-square chrome button holding one `glyph` (emoji or symbol: ⚙ 🚪 ↻ 💡). For top bars / toolbars. Pass `glyph` + `onPress`.
- **`GameModal`** — a gold-rimmed dialog: a title plate over the top edge, a cream inset card holding the `icon` emoji + `message`, and `children` (usually `GameButton`s) as actions. Controlled by `visible`; the X and backdrop call `onClose`.

## Where the truth lives

- Per-component API + usage: `components/general/<Name>/<Name>.d.ts` and `<Name>.prompt.md`.
- Fonts and global CSS: `styles.css` (and `fonts/`).
- Colors/radii/shadows/fonts in the app itself: `src/theme.ts` — if this file and theme.ts disagree, theme.ts wins.

## One idiomatic build (the deadlock rescue dialog)

```tsx
<GameModal
  visible
  title="No Moves Left!"
  icon="🧪"
  message="The board is stuck — brew your way out:"
  onClose={close}
>
  <GameButton label="Shuffle" variant="green" onPress={shuffle} />
  <GameButton label="Restart" variant="red" onPress={restart} />
</GameModal>
```
