/**
 * Helpers for PostgREST filters used by Supabase query builder.
 *
 * Supabase's `.not('col', 'in', value)` expects `value` to be a string like:
 *   ("uuid-1","uuid-2")
 *
 * Quoting is important because UUIDs contain hyphens and can parse incorrectly without quotes.
 */
export const formatPostgrestInList = (values: string[]): string => {
  const quoted = (values || [])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => `"${v.replace(/"/g, '\\"')}"`);

  return `(${quoted.join(',')})`;
};

