/**
 * NotificationThrottler
 *
 * Prevents notification spam by rate-limiting alerts per conversation or event key.
 * When multiple notifications arrive within the throttle window, only the first
 * is delivered. Subsequent ones are silently skipped (the user will still see the
 * latest content when they open the conversation).
 */

const DEFAULT_THROTTLE_MS = 3000; // 3 seconds
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

class NotificationThrottler {
  private lastNotificationTime = new Map<string, number>();
  private readonly throttleMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(throttleMs: number = DEFAULT_THROTTLE_MS) {
    this.throttleMs = throttleMs;

    // Periodically clean stale entries to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Returns true if a notification for the given key should be delivered,
   * false if it should be suppressed (rate-limited).
   */
  shouldNotify(key: string): boolean {
    const now = Date.now();
    const last = this.lastNotificationTime.get(key) || 0;

    if (now - last < this.throttleMs) {
      return false;
    }

    this.lastNotificationTime.set(key, now);
    return true;
  }

  /**
   * Reset throttle for a specific key (e.g. when user opens a conversation).
   */
  reset(key: string): void {
    this.lastNotificationTime.delete(key);
  }

  /**
   * Reset all throttle state.
   */
  resetAll(): void {
    this.lastNotificationTime.clear();
  }

  /**
   * Remove entries older than 2x the throttle window to keep memory bounded.
   */
  private cleanup(): void {
    const now = Date.now();
    const expiryThreshold = this.throttleMs * 2;

    for (const [key, timestamp] of this.lastNotificationTime.entries()) {
      if (now - timestamp > expiryThreshold) {
        this.lastNotificationTime.delete(key);
      }
    }
  }

  /**
   * Tear down (call on app shutdown if needed).
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.lastNotificationTime.clear();
  }
}

// Singleton instances for different notification types
export const messageThrottler = new NotificationThrottler(3000);  // 3s for messages
export const callThrottler = new NotificationThrottler(5000);      // 5s for calls (prevent duplicate ring)

export default NotificationThrottler;
