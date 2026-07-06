import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, {
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { track } from './analytics';

// ponytail: swap for the real rewarded unit id before the production build
const REWARDED_UNIT = __DEV__ ? TestIds.REWARDED : TestIds.REWARDED;

// ATT prompt strictly BEFORE ads init, and never at app launch — the lazy
// once-guard makes both structurally guaranteed
let initPromise: Promise<void> | null = null;
function ensureInit(): Promise<void> {
  initPromise ??= (async () => {
    await requestTrackingPermissionsAsync();
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
    });
    await mobileAds().initialize();
  })();
  return initPromise;
}

/**
 * Load and show one rewarded ad; resolves true only if the reward was earned.
 * Any failure (no fill, no network, dismissed early) resolves false — callers
 * show a fail-soft Alert and the player keeps their coins path.
 */
export async function showRewardedAd(placement: 'life' | 'booster'): Promise<boolean> {
  try {
    await ensureInit();
    return await new Promise<boolean>((resolve) => {
      const ad = RewardedAd.createForAdRequest(REWARDED_UNIT);
      let earned = false;
      const timeout = setTimeout(() => resolve(false), 12_000); // ponytail: no-fill guard
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      ad.addAdEventsListener(({ type }) => {
        if (type === 'closed' || type === 'error') {
          clearTimeout(timeout);
          if (earned) track('ad_reward', { placement });
          resolve(earned);
        }
      });
      ad.load();
    });
  } catch {
    return false;
  }
}
