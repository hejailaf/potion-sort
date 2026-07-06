import { requireNativeModule } from 'expo-modules-core';

// fail-soft: null in jest, simulators without GC, or if the module is missing —
// every function below becomes a no-op rather than a crash
let native: {
  authenticate(): Promise<boolean>;
  submitScore(leaderboardId: string, value: number): Promise<void>;
  reportAchievement(id: string, percent: number): Promise<void>;
  presentLeaderboard(leaderboardId: string): Promise<void>;
} | null = null;
try {
  native = requireNativeModule('GameCenter');
} catch {
  native = null;
}

let authenticated = false;

export const LEADERBOARD_ID = 'potionsort.highest_level';
export const ACH = {
  firstWin: 'potionsort.ach.first_win',
  level10: 'potionsort.ach.level_10',
  level25: 'potionsort.ach.level_25',
  firstDaily: 'potionsort.ach.first_daily',
  firstCork: 'potionsort.ach.first_cork',
} as const;

/** silent sign-in at launch; GameKit shows its own login sheet if needed */
export async function initGameCenter(): Promise<void> {
  if (!native) return;
  try {
    authenticated = await native.authenticate();
  } catch {
    authenticated = false;
  }
}

export function submitHighestLevel(level: number): void {
  if (!native || !authenticated) return;
  native.submitScore(LEADERBOARD_ID, level).catch(() => undefined);
}

/** reports at 100%; GameKit ignores re-reports of already-earned achievements */
export function reportAchievement(id: string): void {
  if (!native || !authenticated) return;
  native.reportAchievement(id, 100).catch(() => undefined);
}

/** returns false when unavailable so the caller can show an Alert */
export function presentLeaderboard(): boolean {
  if (!native || !authenticated) return false;
  native.presentLeaderboard(LEADERBOARD_ID).catch(() => undefined);
  return true;
}
