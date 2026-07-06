import { init, trackEvent } from '@aptabase/react-native';

// ponytail: key is client-side by nature, not a secret; replace with the real
// Aptabase app key before the Phase D wiring ships
const APTABASE_KEY = 'A-EU-0000000000';

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
