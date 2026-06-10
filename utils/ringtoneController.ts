/**
 * RingtoneController
 *
 * Centralized, idempotent wrapper around `react-native-incall-manager` ringtone APIs.
 *
 * Why:
 * - Multiple parts of the app (service + UI) may try to start/stop the ringtone.
 * - Without a shared guard, we can end up with overlapping ringtone playback or
 *   missed stop calls (ghost ringing).
 *
 * Notes:
 * - This only tracks *in-app* ringtone playback started via InCallManager.
 * - All calls are wrapped in try/catch to keep behavior crash-safe across builds.
 */

import InCallManager from 'react-native-incall-manager';

const DEFAULT_RINGTONE = '_DEFAULT_';
const DEFAULT_VIBRATION_PATTERN = [0, 500, 200, 500];

let isPlaying = false;

export function startRingtone(options?: { ringtone?: string; vibrationPattern?: number[] }): void {
  if (isPlaying) return;

  const ringtone = options?.ringtone ?? DEFAULT_RINGTONE;
  const vibrationPattern = options?.vibrationPattern ?? DEFAULT_VIBRATION_PATTERN;

  try {
    // Signature: (ringtone, vibrate_pattern, ios_category, seconds)
    // iOS audio category is ignored on Android.
    InCallManager.startRingtone(ringtone, vibrationPattern, 'playback', 60);
    isPlaying = true;
  } catch {
    isPlaying = false;
  }
}

export function stopRingtone(): void {
  // Always attempt to stop (state may be stale if something else started it).
  isPlaying = false;
  try {
    InCallManager.stopRingtone();
  } catch {
    // ignore
  }
}

export function isRingtoneActive(): boolean {
  return isPlaying;
}

