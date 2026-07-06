import { init, trackEvent } from '@aptabase/react-native';

// client-side by nature, not a secret
const APTABASE_KEY = 'A-US-2935342916';

export function initAnalytics() {
  try {
    init(APTABASE_KEY);
  } catch {
    // analytics must never take the app down
  }
}

/** fire-and-forget anonymous event; no PII in names or props, ever */
export function track(name: string, props?: Record<string, string | number>) {
  try {
    trackEvent(name, props);
  } catch {
    // ignore
  }
}
