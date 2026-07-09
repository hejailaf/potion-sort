# Prompt: Potion Sort — Simulator Playtest & Enhancement Session

Copy everything below the line into Claude Code from your project root.

---

## Role & Objective

You are acting as a senior game QA analyst and game designer running a structured playtesting session for **Potion Sort**, a cozy color-sort puzzle game with an alchemy theme (Expo + TypeScript + Zustand + Reanimated + Skia). Your goal is NOT to fix code yet. Your goal is to **play the game in the iOS Simulator, systematically probe it for gameplay gaps, and produce a prioritized enhancement report**. Only make code changes if I explicitly approve them after reviewing the report.

## Phase 1 — Setup & Orientation (do this first)

1. Read `CLAUDE.md` and `PLAN.md` to refresh yourself on the intended design, phases completed, and known limitations. Note anything in the plan that has not yet been implemented so you don't report it as a "bug."
2. Build and launch the app in the iOS Simulator (`npx expo run:ios` or the appropriate dev-build command for this project). Confirm which simulator device and iOS version you're using and state them in the report.
3. Identify what interaction tooling is available to you (e.g., `xcrun simctl` for booting, screenshots, and video capture; `idb` or a mobile MCP server for taps/gestures if installed). If you cannot programmatically tap, tell me immediately and propose a fallback (e.g., I drive the device while you observe screenshots, or we add a temporary debug/auto-play harness).
4. Take a baseline screenshot of the first screen the player sees.

## Phase 2 — Structured Playthrough

Play through the game methodically. Capture a screenshot at every notable moment (level start, mid-solve, win, fail, any visual glitch). For each area below, record observations before moving on.

### A. First-Time Player Experience
- Cold start: how long from launch to interactive? Any blank/loading jank?
- Is it obvious what to do on Level 1 without instructions? Is there a tutorial or affordance? Would a brand-new player understand pour rules (same color on top, capacity limits)?
- Is the alchemy theme actually communicated (visuals, naming, framing), or does it feel like a generic bottle-sort clone?

### B. Core Loop Mechanics
- Test every interaction: select bottle, pour, deselect, invalid pour attempt, pouring into a full bottle, pouring a mismatched color, pouring into an empty bottle, multi-segment pours of the same color.
- Undo: does it exist? Does it correctly restore state across multiple consecutive undos? Undo after a win?
- Restart level: does it fully reset state, move counter, and animations?
- Win detection: does it fire exactly when all bottles are sorted? Any false positives/negatives?
- Deadlock/unwinnable states: can the player get stuck with no valid moves? Is that detected? Is there a hint or shuffle escape hatch?

### C. Difficulty & Progression
- Play at least the first 8–10 levels (or as many as exist). Chart the difficulty curve: colors count, bottle count, empty bottles available, minimum moves.
- Flag any level that is trivially easy after a harder one, or a sudden spike.
- Is there a progression/reward structure (stars, currency, level map, unlocks)? If absent, note it as a gap, not a bug.

### D. Feel, Animation & Performance
- Pour animation: timing, easing, liquid rendering quality (Skia), interruptibility (what happens if you tap mid-animation?).
- Rapid input spam: tap many bottles quickly — any state desync, double-pours, or crashes?
- Frame rate during pours and transitions (use the simulator's performance overlay or logs where possible).
- Haptics/audio: present? Appropriate? (Note simulator limitations for haptics.)

### E. UI/UX & Edge Cases
- Layout on a small device (iPhone SE class) and a large one (Pro Max class) — run both if feasible.
- Safe areas, notch overlap, button hit targets.
- Backgrounding and returning mid-level: is state preserved?
- Any dead-end screens, missing back buttons, or unreachable states.

## Phase 3 — Report (the deliverable)

Produce `PLAYTEST_REPORT.md` in the project root with these sections:

1. **Session summary** — device, iOS version, build, levels played, total issues found.
2. **Bugs & defects** — table with: ID, description, repro steps, severity (Critical / Major / Minor / Polish), screenshot reference.
3. **Gameplay gaps** — missing systems or moments where the experience falls flat (e.g., no fail feedback, no hint system, no juice on win). Distinguish "not yet built per PLAN.md" from genuine oversights.
4. **Enhancement recommendations** — each with: what, why (player impact), rough effort (S/M/L), and which files/systems it touches. Rank them into a Top 5 using impact-vs-effort.
5. **Suggested next sprint** — a concrete ordered list of the 3–5 items you'd tackle first, phrased as implementable tasks.

## Rules

- Be brutally honest — a cozy game still needs to feel great; "it works" is not the bar.
- Do not modify game code during Phases 1–2. Debug harness additions require my approval first.
- Prefer evidence over opinion: cite screenshots, move counts, and repro steps.
- If the build fails or the simulator can't be driven, stop and report the blocker with options rather than improvising silently.
