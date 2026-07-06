import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BOOSTER_COST,
  boosterDropForLevel,
  DAILY_REWARD_COINS,
  dailyBoosterKind,
  LIFE_REGEN_MS,
  LIVES_REFILL_COST,
  MAX_LIVES,
  regenLives,
  todayKey,
  useMetaStore,
  WIN_REWARD_COINS,
} from '../metaStore';

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

  it('completeDaily rewards coins and a booster at most once per day', () => {
    useMetaStore.getState().completeDaily();
    const s = useMetaStore.getState();
    expect(s.coins).toBe(DAILY_REWARD_COINS);
    expect(s.lastDailyCompleted).toBe(todayKey());
    expect(s.boosters[dailyBoosterKind()]).toBe(4);
    useMetaStore.getState().completeDaily(); // same day: no-op
    expect(useMetaStore.getState().coins).toBe(DAILY_REWARD_COINS);
    expect(useMetaStore.getState().boosters[dailyBoosterKind()]).toBe(4);
  });

  it('buyBooster trades coins for a charge and refuses when short', () => {
    useMetaStore.setState({ coins: BOOSTER_COST - 1 });
    expect(useMetaStore.getState().buyBooster('undo')).toBe(false);
    expect(useMetaStore.getState().boosters.undo).toBe(3);
    useMetaStore.setState({ coins: BOOSTER_COST });
    expect(useMetaStore.getState().buyBooster('undo')).toBe(true);
    expect(useMetaStore.getState().boosters.undo).toBe(4);
    expect(useMetaStore.getState().coins).toBe(0);
  });

  it('regenLives grants one life per elapsed interval and clamps at max', () => {
    const t0 = 1_000_000;
    // below one interval: nothing changes
    expect(regenLives(2, t0, t0 + LIFE_REGEN_MS - 1)).toEqual({ lives: 2, lastLifeAt: t0 });
    // two intervals: +2 lives, anchor advances by exactly what was consumed
    expect(regenLives(2, t0, t0 + 2 * LIFE_REGEN_MS + 5)).toEqual({
      lives: 4,
      lastLifeAt: t0 + 2 * LIFE_REGEN_MS,
    });
    // clamps at max and clears the anchor
    expect(regenLives(4, t0, t0 + 10 * LIFE_REGEN_MS)).toEqual({ lives: MAX_LIVES, lastLifeAt: null });
    // already at max: anchor stays cleared
    expect(regenLives(MAX_LIVES, null, t0)).toEqual({ lives: MAX_LIVES, lastLifeAt: null });
  });

  it('spendLife decrements, anchors the regen timestamp, and refuses at 0', () => {
    expect(useMetaStore.getState().spendLife()).toBe(true);
    const s = useMetaStore.getState();
    expect(s.lives).toBe(MAX_LIVES - 1);
    expect(s.lastLifeAt).not.toBeNull(); // countdown started
    useMetaStore.setState({ lives: 0, lastLifeAt: Date.now() });
    expect(useMetaStore.getState().spendLife()).toBe(false);
    expect(useMetaStore.getState().lives).toBe(0);
  });

  it('refillLives costs coins and refuses when short or already full', () => {
    useMetaStore.setState({ lives: 1, lastLifeAt: Date.now(), coins: LIVES_REFILL_COST - 1 });
    expect(useMetaStore.getState().refillLives()).toBe(false);
    useMetaStore.setState({ coins: LIVES_REFILL_COST });
    expect(useMetaStore.getState().refillLives()).toBe(true);
    const s = useMetaStore.getState();
    expect(s.lives).toBe(MAX_LIVES);
    expect(s.lastLifeAt).toBeNull();
    expect(s.coins).toBe(0);
    expect(useMetaStore.getState().refillLives()).toBe(false); // already full
  });

  it('grantLife adds one life below max, keeps the anchor, and refuses at max', () => {
    expect(useMetaStore.getState().grantLife()).toBe(false); // already full
    const anchor = Date.now();
    useMetaStore.setState({ lives: 2, lastLifeAt: anchor });
    expect(useMetaStore.getState().grantLife()).toBe(true);
    expect(useMetaStore.getState().lives).toBe(3);
    expect(useMetaStore.getState().lastLifeAt).toBe(anchor); // countdown unchanged
    useMetaStore.setState({ lives: MAX_LIVES - 1, lastLifeAt: anchor });
    expect(useMetaStore.getState().grantLife()).toBe(true);
    expect(useMetaStore.getState().lives).toBe(MAX_LIVES);
    expect(useMetaStore.getState().lastLifeAt).toBeNull(); // full again
  });

  it('grantBooster adds a free charge and addCoins queues the celebration', () => {
    useMetaStore.getState().grantBooster('shuffle');
    expect(useMetaStore.getState().boosters.shuffle).toBe(4);
    useMetaStore.getState().addCoins(1200);
    expect(useMetaStore.getState().coins).toBe(1200);
    expect(useMetaStore.getState().pendingCoinReward).toBe(1200);
  });

  it('markReviewPrompted records the highest milestone once', () => {
    useMetaStore.getState().markReviewPrompted(10);
    expect(useMetaStore.getState().reviewPromptedFor).toBe(10);
    useMetaStore.getState().markReviewPrompted(10);
    useMetaStore.getState().markReviewPrompted(25);
    expect(useMetaStore.getState().reviewPromptedFor).toBe(25);
    useMetaStore.getState().markReviewPrompted(10); // lower milestone never regresses
    expect(useMetaStore.getState().reviewPromptedFor).toBe(25);
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
    expect(persisted.state.lives).toBe(MAX_LIVES);
    expect(persisted.state.lastLifeAt).toBeNull();
    expect(persisted.state.pendingCoinReward).toBeUndefined();
  });
});
