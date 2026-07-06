import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LIFE_REGEN_MS, MAX_LIVES, todayKey, useMetaStore } from './state/metaStore';

export const DAILY_REMINDER_HOUR = 19;
const LIVES_ID = 'lives-full';
const DAILY_ID = 'daily-reminder';

/** epoch ms when lives reach MAX, or null when already full (anchor semantics match regenLives) */
export function livesFullAt(lives: number, lastLifeAt: number | null): number | null {
  if (lastLifeAt === null || lives >= MAX_LIVES) return null;
  return lastLifeAt + (MAX_LIVES - lives) * LIFE_REGEN_MS;
}

/** next daily-reminder time: today at the hour if still ahead and not completed today, else tomorrow */
export function nextDailyReminderAt(now: Date, lastDailyCompleted: string | null): Date {
  const at = new Date(now);
  at.setHours(DAILY_REMINDER_HOUR, 0, 0, 0);
  const doneToday = lastDailyCompleted === todayKey();
  if (at <= now || doneToday) at.setDate(at.getDate() + 1);
  return at;
}

/** cancel-and-reschedule both notifications from current store state; no-op without permission */
export async function syncNotifications(): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  const { lives, lastLifeAt, lastDailyCompleted } = useMetaStore.getState();

  await Notifications.cancelScheduledNotificationAsync(LIVES_ID);
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID);

  const fullAt = livesFullAt(lives, lastLifeAt);
  // past DATE triggers fire immediately — only schedule genuinely future dates
  if (fullAt !== null && fullAt > Date.now() + 5_000) {
    await Notifications.scheduleNotificationAsync({
      identifier: LIVES_ID,
      content: { title: 'Lives refilled!', body: 'Your hearts are full — time to sort some potions.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fullAt) },
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: 'Daily Challenge', body: "Today's potion puzzle is waiting for you." },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextDailyReminderAt(new Date(), lastDailyCompleted),
    },
  });
}

/** keep schedules in sync with app foregrounding and the store fields that affect them */
export function useNotificationSync(): void {
  useEffect(() => {
    syncNotifications();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifications();
    });
    let prev = useMetaStore.getState();
    const unsub = useMetaStore.subscribe((s) => {
      if (
        s.lives !== prev.lives ||
        s.lastLifeAt !== prev.lastLifeAt ||
        s.lastDailyCompleted !== prev.lastDailyCompleted
      ) {
        prev = s;
        syncNotifications();
      } else {
        prev = s;
      }
    });
    return () => {
      appState.remove();
      unsub();
    };
  }, []);
}
