import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mulberry32 } from '../engine/generator';
import { MechanicKind } from '../engine/progression';

export const WIN_REWARD_COINS = 20;
export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60_000;
export const LIVES_REFILL_COST = 100;
export const BOOSTER_COST = 60;
export const DAILY_REWARD_COINS = 50;
export const HINT_COST = 25;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** local calendar date, YYYY-MM-DD — the daily challenge's identity and seed source */
export function todayKey(): string {
  return dateKey(new Date());
}

/** yesterday's calendar date — a daily completed on this key extends the streak */
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/** deterministic bonus booster for a given daily */
export function dailyBoosterKind(key: string = todayKey()): BoosterKind {
  return BOOSTER_KINDS[Number(key.replace(/-/g, '')) % BOOSTER_KINDS.length];
}

/** Timestamp-based regen: one life per elapsed interval, anchor advances, null anchor at max. */
export function regenLives(
  lives: number,
  lastLifeAt: number | null,
  now: number,
): { lives: number; lastLifeAt: number | null } {
  if (lastLifeAt === null || lives >= MAX_LIVES) return { lives, lastLifeAt: null };
  const gained = Math.floor((now - lastLifeAt) / LIFE_REGEN_MS);
  if (gained <= 0) return { lives, lastLifeAt };
  const next = Math.min(MAX_LIVES, lives + gained);
  return {
    lives: next,
    lastLifeAt: next >= MAX_LIVES ? null : lastLifeAt + gained * LIFE_REGEN_MS,
  };
}

export interface BoosterInventory {
  undo: number;
  shuffle: number;
  extraBottle: number;
}

export type BoosterKind = keyof BoosterInventory;

const BOOSTER_KINDS: BoosterKind[] = ['undo', 'shuffle', 'extraBottle'];
const DROP_CHANCE = 0.35;

/** Deterministic per-level drop: ~35% of wins award one random booster charge. */
export function boosterDropForLevel(level: number): BoosterKind | null {
  const rng = mulberry32(level * 7919);
  if (rng() >= DROP_CHANCE) return null;
  return BOOSTER_KINDS[Math.floor(rng() * BOOSTER_KINDS.length)];
}

interface MetaState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  colorBlindSymbols: boolean;
  onboardingDone: boolean;
  currentLevel: number;
  coins: number;
  boosters: BoosterInventory;
  lives: number;
  /** epoch ms anchoring the regen countdown; null while at max lives */
  lastLifeAt: number | null;
  /** todayKey() of the last completed daily challenge */
  lastDailyCompleted: string | null;
  /** consecutive-day daily-challenge streak (0 when never / broken) */
  dailyStreak: number;
  /** mechanics whose one-time unlock interstitial has been shown */
  seenUnlocks: MechanicKind[];
  /** mechanics whose first-level contextual hint has been shown */
  seenHints: MechanicKind[];
  /** notification permission has been requested once (after the first win) */
  notifPromptDone: boolean;
  /** highest win-milestone level a rating prompt was shown for (0 = never) */
  reviewPromptedFor: number;
  /** transient: reward queued for the home-screen coin fly-in; never persisted */
  pendingCoinReward: number | null;
  setSoundEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setColorBlindSymbols: (value: boolean) => void;
  setOnboardingDone: () => void;
  advanceLevel: () => void;
  clearCoinCelebration: () => void;
  /** returns false (and changes nothing) when the charge is already at 0 */
  consumeBooster: (kind: BoosterKind) => boolean;
  /** deduct coins for an ad-hoc purchase (e.g. a hint); false when short */
  spendCoins: (amount: number) => boolean;
  /** apply timestamp regen; call on home mount — spendLife runs it itself */
  syncLives: () => void;
  /** returns false (and changes nothing) at 0 lives */
  spendLife: () => boolean;
  /** returns false when coins are short or lives already full */
  refillLives: () => boolean;
  /** returns false (and changes nothing) when coins are short */
  buyBooster: (kind: BoosterKind) => boolean;
  /** award the daily reward — at most once per calendar day */
  completeDaily: () => void;
  setNotifPromptDone: () => void;
  markReviewPrompted: (milestone: number) => void;
  markUnlockSeen: (kind: MechanicKind) => void;
  markHintSeen: (kind: MechanicKind) => void;
  /** rewarded-ad reward: +1 life; returns false (nothing changes) at max */
  grantLife: () => boolean;
  /** rewarded-ad reward: one free booster charge */
  grantBooster: (kind: BoosterKind) => void;
  /** IAP grant; queues the coin fly-in celebration */
  addCoins: (amount: number) => void;
}

export const useMetaStore = create<MetaState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      colorBlindSymbols: false,
      onboardingDone: false,
      currentLevel: 1,
      coins: 0,
      boosters: { undo: 3, shuffle: 3, extraBottle: 3 },
      lives: MAX_LIVES,
      lastLifeAt: null,
      lastDailyCompleted: null,
      dailyStreak: 0,
      seenUnlocks: [],
      seenHints: [],
      notifPromptDone: false,
      reviewPromptedFor: 0,
      pendingCoinReward: null,
      setSoundEnabled: (value) => set({ soundEnabled: value }),
      setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
      setColorBlindSymbols: (value) => set({ colorBlindSymbols: value }),
      setOnboardingDone: () => set({ onboardingDone: true }),
      advanceLevel: () =>
        set((s) => {
          const drop = boosterDropForLevel(s.currentLevel);
          return {
            currentLevel: s.currentLevel + 1,
            coins: s.coins + WIN_REWARD_COINS,
            pendingCoinReward: WIN_REWARD_COINS,
            boosters: drop ? { ...s.boosters, [drop]: s.boosters[drop] + 1 } : s.boosters,
          };
        }),
      clearCoinCelebration: () => set({ pendingCoinReward: null }),
      consumeBooster: (kind) => {
        let consumed = false;
        set((s) => {
          if (s.boosters[kind] <= 0) return {};
          consumed = true;
          return { boosters: { ...s.boosters, [kind]: s.boosters[kind] - 1 } };
        });
        return consumed;
      },
      spendCoins: (amount) => {
        let spent = false;
        set((s) => {
          if (s.coins < amount) return {};
          spent = true;
          return { coins: s.coins - amount };
        });
        return spent;
      },
      setNotifPromptDone: () => set({ notifPromptDone: true }),
      markReviewPrompted: (milestone) =>
        set((s) => ({ reviewPromptedFor: Math.max(s.reviewPromptedFor, milestone) })),
      markUnlockSeen: (kind) =>
        set((s) => (s.seenUnlocks.includes(kind) ? {} : { seenUnlocks: [...s.seenUnlocks, kind] })),
      markHintSeen: (kind) =>
        set((s) => (s.seenHints.includes(kind) ? {} : { seenHints: [...s.seenHints, kind] })),
      grantLife: () => {
        let granted = false;
        set((s) => {
          const cur = regenLives(s.lives, s.lastLifeAt, Date.now());
          if (cur.lives >= MAX_LIVES) return cur;
          granted = true;
          const lives = cur.lives + 1;
          return { lives, lastLifeAt: lives >= MAX_LIVES ? null : cur.lastLifeAt };
        });
        return granted;
      },
      grantBooster: (kind) =>
        set((s) => ({ boosters: { ...s.boosters, [kind]: s.boosters[kind] + 1 } })),
      addCoins: (amount) =>
        set((s) => ({ coins: s.coins + amount, pendingCoinReward: amount })),
      syncLives: () => set((s) => regenLives(s.lives, s.lastLifeAt, Date.now())),
      spendLife: () => {
        let spent = false;
        set((s) => {
          const now = Date.now();
          const cur = regenLives(s.lives, s.lastLifeAt, now);
          if (cur.lives <= 0) return cur;
          spent = true;
          // leaving max lives starts the regen countdown
          return { lives: cur.lives - 1, lastLifeAt: cur.lastLifeAt ?? now };
        });
        return spent;
      },
      completeDaily: () =>
        set((s) => {
          const key = todayKey();
          if (s.lastDailyCompleted === key) return {};
          const kind = dailyBoosterKind(key);
          // consecutive day extends the streak; any gap restarts it at 1
          const dailyStreak = s.lastDailyCompleted === yesterdayKey() ? s.dailyStreak + 1 : 1;
          return {
            coins: s.coins + DAILY_REWARD_COINS,
            pendingCoinReward: DAILY_REWARD_COINS,
            boosters: { ...s.boosters, [kind]: s.boosters[kind] + 1 },
            lastDailyCompleted: key,
            dailyStreak,
          };
        }),
      buyBooster: (kind) => {
        let bought = false;
        set((s) => {
          if (s.coins < BOOSTER_COST) return {};
          bought = true;
          return {
            coins: s.coins - BOOSTER_COST,
            boosters: { ...s.boosters, [kind]: s.boosters[kind] + 1 },
          };
        });
        return bought;
      },
      refillLives: () => {
        let refilled = false;
        set((s) => {
          if (s.coins < LIVES_REFILL_COST || s.lives >= MAX_LIVES) return {};
          refilled = true;
          return { coins: s.coins - LIVES_REFILL_COST, lives: MAX_LIVES, lastLifeAt: null };
        });
        return refilled;
      },
    }),
    {
      name: 'potion-sort-meta',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        hapticsEnabled: s.hapticsEnabled,
        colorBlindSymbols: s.colorBlindSymbols,
        onboardingDone: s.onboardingDone,
        currentLevel: s.currentLevel,
        coins: s.coins,
        boosters: s.boosters,
        lives: s.lives,
        lastLifeAt: s.lastLifeAt,
        lastDailyCompleted: s.lastDailyCompleted,
        dailyStreak: s.dailyStreak,
        seenUnlocks: s.seenUnlocks,
        seenHints: s.seenHints,
        notifPromptDone: s.notifPromptDone,
        reviewPromptedFor: s.reviewPromptedFor,
      }),
    },
  ),
);
