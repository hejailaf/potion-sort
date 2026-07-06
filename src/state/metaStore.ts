import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mulberry32 } from '../engine/generator';

export const WIN_REWARD_COINS = 20;
export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60_000;
export const LIVES_REFILL_COST = 100;
export const BOOSTER_COST = 60;
export const DAILY_REWARD_COINS = 50;

/** local calendar date, YYYY-MM-DD — the daily challenge's identity and seed source */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
          return {
            coins: s.coins + DAILY_REWARD_COINS,
            pendingCoinReward: DAILY_REWARD_COINS,
            boosters: { ...s.boosters, [kind]: s.boosters[kind] + 1 },
            lastDailyCompleted: key,
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
      }),
    },
  ),
);
