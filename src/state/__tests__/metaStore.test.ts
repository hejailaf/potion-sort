import AsyncStorage from '@react-native-async-storage/async-storage';
import { boosterDropForLevel, useMetaStore, WIN_REWARD_COINS } from '../metaStore';

const initialState = useMetaStore.getState();

beforeEach(() => {
  useMetaStore.setState(initialState, true);
});

describe('metaStore', () => {
  it('defaults: sound/haptics on, level 1, no coins, 3 of each booster', () => {
    const s = useMetaStore.getState();
    expect(s.soundEnabled).toBe(true);
    expect(s.hapticsEnabled).toBe(true);
    expect(s.currentLevel).toBe(1);
    expect(s.coins).toBe(0);
    expect(s.boosters).toEqual({ undo: 3, shuffle: 3, extraBottle: 3 });
    expect(s.pendingCoinReward).toBeNull();
  });

  it('advanceLevel bumps the level, awards coins, and queues the celebration', () => {
    useMetaStore.getState().advanceLevel();
    const s = useMetaStore.getState();
    expect(s.currentLevel).toBe(2);
    expect(s.coins).toBe(WIN_REWARD_COINS);
    expect(s.pendingCoinReward).toBe(WIN_REWARD_COINS);
    useMetaStore.getState().advanceLevel();
    expect(useMetaStore.getState().coins).toBe(WIN_REWARD_COINS * 2);
    expect(useMetaStore.getState().currentLevel).toBe(3);
  });

  it('clearCoinCelebration consumes the pending reward', () => {
    useMetaStore.getState().advanceLevel();
    useMetaStore.getState().clearCoinCelebration();
    expect(useMetaStore.getState().pendingCoinReward).toBeNull();
  });

  it('consumeBooster decrements and refuses at zero', () => {
    expect(useMetaStore.getState().consumeBooster('undo')).toBe(true);
    expect(useMetaStore.getState().boosters.undo).toBe(2);
    useMetaStore.setState({ boosters: { undo: 0, shuffle: 1, extraBottle: 1 } });
    expect(useMetaStore.getState().consumeBooster('undo')).toBe(false);
    expect(useMetaStore.getState().boosters.undo).toBe(0);
  });

  it('the drop table is deterministic and advanceLevel applies it', () => {
    const levels = Array.from({ length: 40 }, (_, i) => i + 1);
    const dropLevel = levels.find((l) => boosterDropForLevel(l) !== null)!;
    const dryLevel = levels.find((l) => boosterDropForLevel(l) === null)!;
    expect(boosterDropForLevel(dropLevel)).toBe(boosterDropForLevel(dropLevel));

    const kind = boosterDropForLevel(dropLevel)!;
    useMetaStore.setState({ currentLevel: dropLevel });
    useMetaStore.getState().advanceLevel();
    expect(useMetaStore.getState().boosters[kind]).toBe(4);

    useMetaStore.setState({ currentLevel: dryLevel, boosters: { undo: 3, shuffle: 3, extraBottle: 3 } });
    useMetaStore.getState().advanceLevel();
    expect(useMetaStore.getState().boosters).toEqual({ undo: 3, shuffle: 3, extraBottle: 3 });
  });

  it('persists progression and settings but never the transient celebration', async () => {
    useMetaStore.getState().setSoundEnabled(false);
    useMetaStore.getState().advanceLevel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const raw = await AsyncStorage.getItem('potion-sort-meta');
    const persisted = JSON.parse(raw!);
    expect(persisted.state.soundEnabled).toBe(false);
    expect(persisted.state.currentLevel).toBe(2);
    expect(persisted.state.coins).toBe(WIN_REWARD_COINS);
    expect(persisted.state.boosters).toEqual({ undo: 3, shuffle: 3, extraBottle: 3 });
    expect(persisted.state.pendingCoinReward).toBeUndefined();
  });
});
