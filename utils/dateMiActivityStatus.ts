export type DateMiActivityLabel = 'Active recently' | 'Active today';

const ACTIVE_RECENTLY_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVE_TODAY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getDateMiActivityLabel(lastSeen?: string | null): DateMiActivityLabel | null {
  if (!lastSeen) return null;

  const lastSeenMs = new Date(lastSeen).getTime();
  if (!Number.isFinite(lastSeenMs)) return null;

  const diffMs = Date.now() - lastSeenMs;

  // Device clock drift or future timestamps shouldn't hide activity.
  if (diffMs <= ACTIVE_RECENTLY_MS) {
    return 'Active recently';
  }
  if (diffMs <= ACTIVE_TODAY_MS) {
    return 'Active today';
  }

  return null;
}

export function getDateMiActivityLabelWithPrivacy(options: {
  lastSeen?: string | null;
  showOnlineStatus?: boolean | null;
  showLastSeen?: boolean | null;
}): DateMiActivityLabel | null {
  const { lastSeen, showOnlineStatus, showLastSeen } = options;

  // Option C: this is derived from last_seen; if user hides last seen or online status,
  // we hide the activity badge as well.
  if (showOnlineStatus === false) return null;
  if (showLastSeen === false) return null;

  return getDateMiActivityLabel(lastSeen);
}

