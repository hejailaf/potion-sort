# Playtest Report — v1.3.0-rc (Phase 6 regression)

*Session: 2026-07-10 · QA pass per PLAYTEST.md, extended to the v1.3 scope.
The v1.2 report this replaces lives in git history (`git show 4297965:PLAYTEST_REPORT.md`).*

## 1. Session summary

| | |
|---|---|
| Date | 2026-07-10 |
| Build | v1.3 tree at Phase 5 close (`4297965`) + Phase 6 docs, dev client, iPhone 17 sim (iOS 26.5) |
| Protocol | PLAYTEST.md phases 1–3, extended to the v1.3 scope (three mechanics, Journey rework, 4-F polish) |
| Input tooling | idb (py3.9 venv) scripted taps; engine DFS solver for move sequences; save-state injection via AsyncStorage manifest |
| Coverage | Fresh-install flow · L1–L3 wins · all four boosters · daily challenge win · L20 veiled full win · L40 mystery full win · L60 sealed partial (seal pop) · kill/relaunch + take-a-break resume · restart/abandon life economy · Journey/Shop/tabs · input-spam edge |
| Bugs found | **0 critical · 0 high · 0 medium · 0 low** |

## 2. Bugs

None found. The playtest completed all scripted runs without a single desync,
visual glitch, stuck state, or economy error.

**Verified NOT broken (explicit checks):**
- Fresh install: defaults (0 coins, 5 lives, 3× boosters, free hint), onboarding
  pill + arrow on L1, rule pills.
- Win flow: "Perfect!" card +20, Continue → coin-fly lands on the coin icon,
  counter holds then ticks up (4-F rework).
- Boosters: hint (solver-move glow, free-per-level then 25-coin price), undo
  (state revert; charge consumed), shuffle (re-deal liquid), extra bottle
  (+1 empty, layout reflows), all badges decrement correctly.
- Daily: vanilla 10-bottle board, +50 coins, +1 bonus booster (undo 2→3
  observed), "✓ Daily Complete" latch.
- Veiled (L20): interstitial fires once on unlock level, hint banner, veil "?"
  render, cork-lifts-veil (b5 cork → b2 veil dropped), full 20-move win.
- Mystery (L40): interstitial + banner, "?" segments reveal progressively as
  they surface (3→1 observed mid-solve), masked flight, full 33-move win.
- Sealed (L60): interstitial + banner, wax badge counts 3→pop on exactly the
  3rd pour, frozen-bottle legality (solver-validated sequence).
- Persistence: mid-level kill/relaunch resumes the exact board (veil state,
  undo enabled, no interstitial re-show); Take a Break resumes 8-move-deep L40
  and wins 25 moves later; abandon costs 1 life and re-deals; restart modal
  warns and costs 1 life.
- Economy: coins 0→20→40→60(+L3)→110(daily)→130(L20)→150(L40); lives 5→4
  (restart)→3 (abandon) with regen countdown ticking.
- Edge: 4-tap input spam during an active pour → exactly one pour committed,
  no desync (spam resolves as post-pour selection).
- Journey opens scrolled-to-current at level 60; Shop modal shows the expected
  dev-mode "being stocked" (RevenueCat is production-only by design).

**Not exercised (noted, not bugs):** deadlock rescue modal (no cheap
reproduction on curated seeds; engine `hasAnyMove` unchanged since its v1.2
verification), backgrounding mid-pour (no home-button injection via idb),
real-device haptics/GameCenter/ads/IAP (fail-soft by design, TestFlight
territory), colorblind-symbol toggle (native switch not scriptable — unchanged
since v1.2 hand-check).

## 3. Gameplay gaps

None new. The v1.2 gaps ledger (BACKLOG.md) is unchanged: modifier stacking,
full pour chaining, real Teams tab, licensed SFX pass, SDK upgrade.

## 4. Recommendations

None blocking 1.3.0. Cosmetic ideas already parked in BACKLOG.md; the 4-F
audit's keep-verdicts (GameModal fade, interstitial static steps, game.tsx
double bottom padding) stand.

## 5. Verdict

**Ship.** Zero open critical/high bugs; acceptance criterion met. The v1.3
mechanics, Journey, choreography, and polish all survived a full scripted
regression on the release-candidate tree.
