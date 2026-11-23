/* S.u.G WALK R7 — PostgreSQL transaction adapter for the private budget ledger.
 * SERVER ONLY. Accepts a configured pg-compatible Pool via dependency injection.
 * No connection string in source, no implicit connection or schema creation.
 * No API route imports this module; activating paid calls requires separate approval.
 */
export function createR7PgAdapter(pool) {
 if (!pool || typeof pool.connect !== 'function')
   throw new Error('R7_PG_POOL_REQUIRED');
 return Object.freeze({
  async transaction(task) {
   if (typeof task !== 'function') throw new Error('R7_TRANSACTION_CALLBACK_REQUIRED');
   const client = await pool.connect();
   if (!client || typeof client.query !== 'function' || typeof client.release !== 'function') {
    if (typeof client?.release === 'function') client.release();
    throw new Error('R7_PG_CLIENT_INVALID');
   }
   let began = false;
   try {
    await client.query('BEGIN');
    began = true;
    const tx = Object.freeze({
      query: (sql, args = []) => {
        if (typeof sql !== 'string' || !sql.trim() || !Array.isArray(args))
          throw new Error('R7_QUERY_INVALID');
        return client.query(sql, args);
      }
    });
    const result = await task(tx);
    await client.query('COMMIT');
    return result;
   } catch (error) {
    if (began) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // Preserve the original error; the client is always released below.
        // Pool implementations must discard broken clients after connection errors.
      }
    }
    throw error;
   } finally {
    client.release();
   }
  }
 });
}
