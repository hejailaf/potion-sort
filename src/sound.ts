import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useMetaStore } from './state/metaStore';

// Game SFX should play even when the iPhone ring switch is on silent.
setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);

const players = {
  pour: createAudioPlayer(require('../assets/sounds/liquid-pour.wav')),
  complete: createAudioPlayer(require('../assets/sounds/complete.wav')),
  error: createAudioPlayer(require('../assets/sounds/error.wav')),
  win: createAudioPlayer(require('../assets/sounds/win.wav')),
};

/** relative loudness — the pour plays constantly, so it sits under the chimes */
const volumes: Record<keyof typeof players, number> = {
  pour: 0.85,
  complete: 1,
  error: 0.9,
  win: 1,
};

const lastPlayed: Partial<Record<keyof typeof players, number>> = {};

export function playSfx(name: keyof typeof players) {
  if (!useMetaStore.getState().soundEnabled) return;
  // spam guard: stacked concurrent pours restart one shared player — don't
  // let rapid-fire taps machine-gun the first 90ms of the sample
  const now = Date.now();
  if (now - (lastPlayed[name] ?? 0) < 90) return;
  lastPlayed[name] = now;
  const player = players[name];
  player.volume = volumes[name];
  player.seekTo(0);
  player.play();
}

export function hapticError() {
  if (!useMetaStore.getState().hapticsEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** picking up a bottle */
export function hapticSelect() {
  if (!useMetaStore.getState().hapticsEnabled) return;
  Haptics.selectionAsync();
}

/** a pour landing — a soft tap per pour */
export function hapticLight() {
  if (!useMetaStore.getState().hapticsEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticSuccess() {
  if (!useMetaStore.getState().hapticsEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
