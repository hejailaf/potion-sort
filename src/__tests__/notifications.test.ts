import { DAILY_REMINDER_HOUR, livesFullAt, nextDailyReminderAt } from '../notifications';
import { LIFE_REGEN_MS, MAX_LIVES, todayKey } from '../state/metaStore';

describe('notifications pure helpers', () => {
  it('livesFullAt is null at max lives and anchors below max', () => {
    expect(livesFullAt(MAX_LIVES, null)).toBeNull();
    expect(livesFullAt(3, null)).toBeNull(); // no anchor -> nothing to schedule
    const t0 = 1_000_000;
    expect(livesFullAt(4, t0)).toBe(t0 + LIFE_REGEN_MS);
    expect(livesFullAt(0, t0)).toBe(t0 + MAX_LIVES * LIFE_REGEN_MS);
  });

  it('nextDailyReminderAt picks today before the hour, else tomorrow', () => {
    const morning = new Date(2026, 6, 6, DAILY_REMINDER_HOUR - 3, 0, 0);
    const evening = new Date(2026, 6, 6, DAILY_REMINDER_HOUR + 2, 0, 0);

    const todayAt = nextDailyReminderAt(morning, null);
    expect(todayAt.getDate()).toBe(6);
    expect(todayAt.getHours()).toBe(DAILY_REMINDER_HOUR);

    const tomorrowAt = nextDailyReminderAt(evening, null);
    expect(tomorrowAt.getDate()).toBe(7);
    expect(tomorrowAt.getHours()).toBe(DAILY_REMINDER_HOUR);
  });

  it('nextDailyReminderAt rolls to tomorrow when today is already completed', () => {
    const morning = new Date();
    morning.setHours(DAILY_REMINDER_HOUR - 2, 0, 0, 0);
    const at = nextDailyReminderAt(morning, todayKey());
    expect(at.getTime()).toBeGreaterThan(morning.getTime());
    expect(at.getDate()).not.toBe(morning.getDate());
  });
});
