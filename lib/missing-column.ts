/**
 * Which column a database error is complaining about, when it is a missing one. Pure.
 *
 * Optional columns come from migrations the owner applies one by one, so a database can be
 * behind the code. The code should work without them (and use them once they exist) instead of
 * failing the whole request, so it asks which column is missing, leaves it out, and tries again.
 *
 * Two shapes of message:
 *   PostgREST, on a write:  Could not find the 'client_id' column of 'meetings' in the schema cache
 *   Postgres,  on a read:   column meetings.client_id does not exist
 */
export function missingColumn(message: string | null | undefined): string | null {
  if (!message) return null;
  const match = /Could not find the '([a-z0-9_]+)' column/i.exec(message) ?? /column (?:"?[a-z0-9_]+"?\.)?"?([a-z0-9_]+)"? does not exist/i.exec(message);
  return match ? match[1].toLowerCase() : null;
}
