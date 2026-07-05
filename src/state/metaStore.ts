import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mulberry32 } from '../engine/generator';

export const WIN_REWARD_COINS = 20;

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
      }),
    },
  ),
);
