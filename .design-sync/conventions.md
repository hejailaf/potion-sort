# Potion Sort UI

Three **React Native components** rendered via react-native-web, all under `window.PotionSortUI`: `GameButton`, `IconButton`, `GameModal`. They are the game's cozy "alchemy" UI kit — chunky, rounded, saturated, drop-shadowed, built to sit on a **dark indigo background**.

## Setup

- **No provider or wrapper is needed.** Each component is self-contained and self-styling (styles inject at runtime) — render it directly.
- **Fonts:** the components use the **Fredoka** family (rounded, friendly). It ships in `fonts/` and loads via `styles.css` — include that stylesheet or labels fall back to a system font.
- **Design on dark.** The game's surface is deep indigo (`#1B1440` / panel `#241B4E`); buttons and modals are drawn to read on dark.

## Styling idiom — props, not classes

There are **no CSS classes**. Style through props:

- **Variant props carry the design language.** `GameButton` takes `variant="violet" | "green" | "red"` plus `big` and `disabled`. `GameModal` composes a titled dialog from `title` / `icon` (an emoji) / `message` / `children`.
- **For your own layout glue, use React Native style objects** (RNW maps them to CSS): `<View style={{ flexDirection: 'row', gap: 12, padding: 16 }}>`. Flexbox props, never utility classes.
- **The palette these components paint with** (baked in — you match it for surrounding UI, you don't pass it): gold `#F2D43D`, violet `#8A4AE6`, green `#4FB93F`, red `#E5533F`, panel `#241B4E`, cream card `#FBF3DD`, gold text `#FFE9A8`.

## The components

- **`GameButton`** — the primary CTA: highlight band on top, dark 3D rim below, sinks 2px on press. Always pass `label` + `onPress`; choose a `variant`; add `big` for a hero button, `disabled` to dim it.
- **`IconButton`** — a rounded-square chrome button holding one `glyph` (emoji or symbol: ⚙ 🚪 ↻ 💡). For top bars / toolbars. Pass `glyph` + `onPress`.
- **`GameModal`** — a gold-rimmed dialog: a title plate over the top edge, a cream inset card holding the `icon` emoji + `message`, and `children` (usually `GameButton`s) as actions. Controlled by `visible`; the X and backdrop call `onClose`.

## Where the truth lives

- Per-component API + usage: `components/general/<Name>/<Name>.d.ts` and `<Name>.prompt.md`.
- Fonts and global CSS: `styles.css` (and `fonts/`).

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
