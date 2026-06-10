export const PLAY_STORE_REVIEWER_EMAIL = 'playstore.reviewer@linkapp.test';

// Legacy hard-coded IDs from earlier environments (kept for backward compatibility)
export const LEGACY_PLAY_STORE_REVIEWER_USER_IDS: string[] = [
  'db1acf91-c944-4527-afb1-56e7e126621f',
];

export interface ReviewerCheckUser {
  id?: string;
  email?: string | null;
}

/**
 * Returns true when the given user should be treated as the dedicated
 * Google Play Store reviewer account.
 *
 * This is based on the well-known reviewer email, with a fallback to
 * legacy hard-coded IDs so older test accounts still work.
 */
export const isPlayStoreReviewer = (
  user: ReviewerCheckUser | null | undefined,
): boolean => {
  if (!user) {
    return false;
  }

  if (user.email && user.email.toLowerCase() === PLAY_STORE_REVIEWER_EMAIL) {
    return true;
  }

  if (user.id && LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(user.id)) {
    return true;
  }

  return false;
};

