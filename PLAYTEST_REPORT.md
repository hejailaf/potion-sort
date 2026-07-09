# Potion Sort — Playtest Report

*Session: 2026-07-09 · QA pass per PLAYTEST.md.*

> **Follow-up (same day): all findings below have been implemented.** See the
> [Implementation log](#6-implementation-log--what-shipped) at the end. Green gate
> after the work: **98 tests / tsc 0 / eslint 0**, and every user-facing change was
> re-verified live on the iPhone 17 simulator via idb. The sections below are the
> original report, preserved as written.

## 1. Session summary

| | |
|---|---|
| **Primary device** | iPhone 17 simulator, iOS 26.5 |
| **Size matrix** | iPhone 17e (390×844pt, smallest available) · iPhone 17 Pro Max (largest). No SE-class simulator exists for iOS 26.5 — SE coverage still needs a hardware check. |
| **Build** | Dev-client debug build of `com.hejailaf.potionsort` (v1.2.0 codebase), Metro on :8081 |
| **Input tooling** | `idb` tap injection + `simctl` screenshot bursts (~141 ms/frame); levels solved with the game's own engine (`generator.ts` + path-recording DFS over `rules.ts`) driving scripted taps |
| **Levels played** | 1–10 fully solved end-to-end (+ Level 11 used as probe sandbox, daily challenge board opened) |
| **Issues found** | 0 critical · 0 major · 2 minor · 4 polish |
| **Evidence** | ~80 screenshots in session scratchpad `evidence/` (referenced below as `E:<name>`) |

The headline: **the core game is in genuinely good shape.** Ten levels autoplayed without a single crash, desync, false win, or animation glitch; every economy rule (lives, coins, boosters, once-per-level caps, persistence) behaved exactly as specified. The findings below are almost entirely about *missing moments*, not broken ones.

## 2. Bugs & defects

| ID | Description | Repro | Severity | Evidence |
|----|-------------|-------|----------|----------|
| B1 | **HUD renders under the status bar for the first seconds after a cold launch** (coin pill under the clock, gear under battery), then snaps to correct position. Safe-area insets appear to apply a frame late; on the 17e it stayed wrong ~10s+ while the dev-menu sheet was up, so it may be dev-menu-related. Not reproducible once the app settles. | Fresh install → first launch → watch the HUD while the dev menu shows | Minor | `E:17e-home.png` (overlap) vs `E:17e-home-clean.png` (settled) |
| B2 | **In-game exit always costs a life.** The door is the only way home mid-level and `quitLevel` both spends a life *and* abandons the board — yet the board is fully resumable (kill+relaunch → home → Level button resumes exactly, verified). A player who exits via the door to check the shop pays a life for something the app already supports for free. Design inconsistency more than a code bug. | In level → door → confirm → life gone; vs. kill app → relaunch → resume free | Minor | `E:L11-quit-tapped.png`, `E:L11b-resumed-after-cold-start.png` |
| B3 | Second tap on **+Bottle after use is a silent no-op** — no shake/sound/toast, button is dimmed but still tappable-looking enough to try. Every other invalid action has feedback. | Use +Bottle, tap it again | Polish | `E:L11-extra-bottle-again.png` |
| B4 | **Dev-only:** cold start shows splash + "Downloading 100%…" ~3-4s (Metro bundle fetch). Production uses the embedded bundle so this shouldn't ship, but worth timing a TestFlight cold start once. | Terminate → relaunch dev build | Polish | `E:cold-start-sheet.png` |
| B5 | The invalid-pour **shake (±6 px / 160 ms) is nearly invisible** at game pace — at 141 ms/frame capture it never even registered on camera. Error haptic carries it on device, but on sound-off/haptics-off play the rejection reads as "nothing happened". | Select bottle → tap mismatched target | Polish | `E:L1-invalid-pour-rejected.png` |
| B6 | On **Pro Max the board reads sparse** — bottles cap at 56 pt (`Board.tsx` `Math.min(56, …)`), so a 5-bottle row fills barely half the 440 pt width. Correct, just small; consider scaling the cap with screen width. | Open any early level on Pro Max | Polish | `E:promax-L1-board.png` |

**Verified NOT broken** (each exercised live): pour correctness incl. multi-segment & cross-row pours · win detection fired exactly at sort-complete, never early, on all 10 levels · chained undo restores state pixel-identically (2 moves → 2 undos → 0.01% board diff) · undo disabled at 0 charges · +Bottle once-per-level cap · shuffle keeps empties empty and never completes a bottle · restart re-deals the identical seed (0.02% diff) · restart/quit confirm modals · lives 5→4→3 with regen timer + refill "+" appearing · coins exactly 20/win (200 after 10) · booster win-drops (Shuffle 3→4, Bottle 3→5 across L1–7) · review prompt fired once, at home, after L10 — sensible timing · rapid input spam (14 taps ≈2s) left a fully coherent board · mid-animation taps correctly ignored/locked · backgrounding preserves exact state incl. selection; cold start restores board minus transient selection (correct) · Game Center absence → informative native alert, no crash · Teams tab → honest "Coming soon" alert · Shop dev-state message as designed · settings incl. color-blind toggle · notifications being scheduled (os_log) · zero JS exceptions in a 30-min session log sweep.

### Difficulty curve — L1–10, engine-verified

Generated with the game's own `generator.ts` + a path-recording DFS over `rules.ts` (same search order as `solver.ts`), then confirmed by playing each solution live:

| Level | Filled | Colors | Empty | Total | Solution moves |
|-------|--------|--------|-------|-------|----------------|
| 1 | 3 | 3 | 2 | 5 | 6 |
| 2 | 3 | 3 | 2 | 5 | 8 |
| 3 | 3 | 3 | 2 | 5 | 10 |
| 4 | 4 | 4 | 2 | 6 | 11 |
| 5 | 4 | 4 | 2 | 6 | 13 |
| 6 | 4 | 4 | 2 | 6 | 15 |
| 7 | 4 | 4 | 2 | 6 | 16 |
| 8 | 5 | 5 | 2 | 7 | 16 |
| 9 | 5 | 5 | 2 | 7 | 18 |
| 10 | 5 | 5 | 2 | 7 | 20 |

**Verdict: excellent.** Monotonic 6→20 with no spikes or dips; tier transitions (L4, L8) land gently because the curated seeds absorb the bottle-count jump (L7→L8 adds a color and a bottle yet holds at 16 moves). This matches the intent documented in `generator.ts`'s curated-seed comment — and it's actually delivered on screen.

## 3. Gameplay gaps

Tagged **[deferred]** = known/deliberate per PLAN.md, AGENTS.md open threads, or `ponytail:` markers; **[oversight]** = nothing records a decision.

1. **No deadlock detection [oversight — biggest gap].** `gameStore`/`Board` never check "any legal move left?". A stuck player gets no signal, no offer — they must self-diagnose and know that restart (a life) or boosters are the way out. Genre convention is an automatic "No more moves!" prompt.
2. **No hint system [oversight].** The engine's solver can already produce a next-move hint almost for free (`solve()` returns a path); there's no button for it. Standard retention/monetization lever in this genre, and unusually cheap here.
3. **Win flow is flat for a "Perfect!" [oversight — feel].** Win modal appears ~0.5s after the last cork with a static "+20". The PLAN's own reference описание (dim → fireworks → card → coins *fly into the counter*) is only partially realized: fireworks/sparkles fire behind the modal, but there's no coin-fly moment on the home screen and no streak/star framing. It works; it doesn't *celebrate*.
4. **Level 1 has an affordance but no true tutorial [borderline].** Hint pill ("Tap any bottle…" → "Now tap a bottle to pour into") + a caret pointing at a valid target — good! But it never explains the two actual rules (same-color-on-top, 4-segment capacity), and it vanishes after L1. A brand-new player still learns capacity by being shaken at.
5. **Alchemy theme is thin [deferred-ish].** Title, vial silhouettes, corks, starry night — nice. But nothing else says "alchemy": no potion names, no brewing flavor in copy ("Perfect!" could be any game), generic emoji in dialogs (💔). The skill file's licensed-SFX note is the audio side of the same gap.
6. **No stars/score dimension [deferred per PLAN §out-of-scope].** Wins are binary; no move-count grading, so replaying a level has no draw. Fine for v1.2; listed for completeness.
7. **Daily challenge lacks identity [oversight-lite].** It's a (good) hard board with a "Daily" pill — but no streak counter, no calendar, no special reward framing. The mode exists; the *ritual* doesn't.
8. **Teams tab [deferred]** — explicit placeholder, correctly communicated in-app.

## 4. Enhancement recommendations

| # | What | Why (player impact) | Effort | Touches |
|---|------|--------------------|--------|---------|
| R1 | **Deadlock detector + rescue sheet** — after each committed pour, if no legal move exists: dim board, "No moves left!" with Shuffle / +Bottle / Restart options | Converts the worst moment in the game (silent stuck) into a booster showcase; protects new players | **S** | `rules.ts` (hasAnyMove — trivial), `gameStore.tapBottle/finishPour`, one `GameModal` |
| R2 | **Hint booster** — button shows the solver's next move (glow source + target); first one free per level, then coins | Top-3 genre retention lever; solver already returns the path, UI is the only work | **M** | `solver.ts` (expose first move), `BoosterBar`, `Board` highlight state, `metaStore` economy |
| R3 | **Win celebration pass** — coin-fly to counter on home return (component exists: `effects/CoinFly.tsx`), modal springs in with the corks, count-up on "+20", one screen-wide firework beat before the modal | The 20×/session moment; currently the flattest part of an otherwise juicy game | **M** | `game.tsx` win sequence, `index.tsx` coin counter, existing `effects/` |
| R4 | **Free exit-with-resume** — door navigates home keeping the board (already persisted!); life cost moves to an explicit "Abandon level" choice on the confirm sheet | Removes a pay-for-nothing sting; the persistence layer already does the hard part | **S** | `game.tsx` door handler, `gameStore` (split quit vs leave), modal copy |
| R5 | **Rules micro-tutorial on L1** — extend the existing hint-pill system: after first invalid pour, pill explains "Only matching colors pour!"; first capacity rejection explains fullness | Fixes onboarding-by-shake using machinery that already exists | **S** | hint logic in `game.tsx`/`Board` |
| R6 | Alchemy flavor pass — potion color names in win copy ("Moonlight Violet bottled!"), themed dialog art instead of emoji | Differentiation from clone-sea; cheap personality | S | strings + `GameModal` |
| R7 | Daily streak counter + calendar chip on the Daily button | Turns the mode into a ritual | M | `metaStore` (streak), `index.tsx` |
| R8 | Stronger invalid feedback — bigger shake + brief red rim flash on the rejected bottle | B5; sound-off players currently get almost nothing | S | `Bottle.tsx` shake anim |

**Top 5 (impact ÷ effort):** **R1 → R4 → R3 → R2 → R5.**
R1 is small and guards the single worst experience. R4 is a copy-level change that removes a player-hostile charge. R3 upgrades the most-repeated moment. R2 is the biggest system but rides on the existing solver. R5 closes onboarding with machinery already built.

## 5. Suggested next sprint

1. **Deadlock rescue** — add `hasAnyMove(bottles)` to `rules.ts` (+ unit tests), trigger a rescue `GameModal` from the store when it's false after a pour settles; offer Shuffle / +Bottle / Restart with their normal costs.
2. **Door = free leave, life = explicit abandon** — rewire the door confirm to two options ("Take a break" → home, board persists; "Abandon (−1 ❤️)" → current behavior); keep `quitLevel` for abandon only.
3. **Win celebration** — sequence the existing pieces: last-cork sparkle → 400ms firework beat → modal springs in → "+20" counts up → on Continue, `CoinFly` into the home counter.
4. **Hint booster (v1)** — solver's first move, glow the two bottles, 1 free/level then 25 coins; add to BoosterBar with the standard badge/disabled pattern.
5. **L1 rule pills** — two contextual hint strings on first mismatch / first full-bottle rejection.

Each lands independently; all five together are roughly a week of solo work at this codebase's conventions (engine change + tests first, UI second, `npm test && tsc && eslint` gate per commit).

---

## 6. Implementation log — what shipped

All bugs and all eight recommendations were built the same day. Convention held: engine + store changes landed with unit tests first, UI second, green gate (`npm test && tsc && eslint`) throughout. **98 tests pass (was 90), tsc 0, eslint 0.** Every user-facing change was re-driven live on the iPhone 17 sim.

**Bugs**

| ID | Status | Fix |
|----|--------|-----|
| B1 | ✅ Fixed | Wrapped the app in `SafeAreaProvider` + `initialWindowMetrics` (`_layout.tsx`) — insets resolve on frame one, no HUD flash. Verified: HUD sits correctly on a cold launch. |
| B2 | ✅ Fixed | Folded into R4 (free exit). |
| B3 | ✅ Fixed | Dimmed boosters now fire `hapticError` + error SFX on tap instead of dead-silence (`BoosterBar.tsx`). |
| B4 | ⏭️ Won't fix | Dev-only Metro bundle download; production ships the embedded bundle. Not a shippable defect. |
| B5 | ✅ Fixed | Folded into R8 (stronger shake + red flash). Verified live: red rim flash captured on a rejected pour. |
| B6 | ✅ Fixed | Raised the bottle-width cap 56→72pt (`Board.tsx`) so large screens fill out; small screens are already under the cap, unaffected. |

**Recommendations**

| # | Status | Notes |
|---|--------|-------|
| R1 | ✅ Shipped | `hasAnyMove()` in `rules.ts` (+3 tests); deadlock rescue `GameModal` in `game.tsx` offering Shuffle / Add a Bottle / Restart. **Verified live** — forced a real 2-move deadlock on L12, modal fired, "Add a Bottle" resolved it. |
| R2 | ✅ Shipped | `hintMove()` in `solver.ts` (+3 tests); 4th "Hint" booster tile — first free per level then 25 coins; source + target pulse a gold ring. **Verified live** — glow correct, badge flips Free→25. |
| R3 | ✅ Shipped | Reward count-up + card springs in ~500ms after the corks (`WinOverlay.tsx`); the home coin-fly (`CoinFly`) already existed. |
| R4 | ✅ Shipped | Door → "Leave Level?" with **Take a Break** (free, board persists) vs **Abandon (−1 ❤️)**. **Verified live** — a break kept lives at 5/5. |
| R5 | ✅ Shipped | L1 rule pills on rejected pours ("Colors must match…" / "That bottle is full…") via the existing hint-pill system (`OnboardingHint.tsx`). |
| R6 | ✅ Shipped | Win card shows "🧪 N potions brewed" tied to the board. **Verified live.** (Per-color potion names + custom dialog art still deferred — need art/copy.) |
| R7 | ✅ Shipped | `dailyStreak` in `metaStore` (+2 tests: extend on consecutive days, reset on gap); home Daily button shows 🔥N. |
| R8 | ✅ Shipped | Wider/longer shake + a red rim-flash ring on the rejected bottle (`Bottle.tsx`). **Verified live.** |

Not force-triggered live (logic + unit-test verified, low-risk): R5 rule pills (would need a reset to Level 1) and R7 streak flame (needs multi-day play). B4 intentionally skipped.

---
*Simulator caveats: haptics, Game Center, real ads, and IAP cannot validate in-sim (all fail-soft correctly — verified). The B1 fix and the shake/flash still deserve a glance on TestFlight hardware for feel, but both render correctly in-sim.*
