-- S.u.G WALK R7 — read-only post-creation verification
-- NO INSERT / UPDATE / DELETE / DDL / secrets. Run after 001_r7_budget_ledger.sql.
-- Returns one row per expected private table with independent security indicators.
WITH expected(name) AS (
  VALUES ('r7_budget_month'::text), ('r7_budget_operation'::text)
), objects AS (
  SELECT e.name, c.oid, c.relrowsecurity AS rls_enabled,
         c.relforcerowsecurity AS force_rls,
         n.oid AS namespace_oid
  FROM expected e
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = 'r7_private'
  LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
       AND c.relname = e.name AND c.relkind IN ('r','p')
)
SELECT
  'r7_private' AS expected_schema,
  o.name AS expected_table,
  o.oid IS NOT NULL AS table_exists,
  COALESCE(o.rls_enabled, false) AS rls_enabled,
  COALESCE((
    SELECT COUNT(*) FROM pg_catalog.pg_constraint k
    WHERE k.conrelid = o.oid AND k.contype IN ('c','p','f')
  ), 0) AS constraint_count,
  NOT COALESCE(pg_catalog.has_schema_privilege('anon', 'r7_private', 'USAGE'), false)
     AND NOT COALESCE(pg_catalog.has_schema_privilege('authenticated', 'r7_private', 'USAGE'), false)
     AS direct_schema_usage_blocked,
  NOT COALESCE(pg_catalog.has_table_privilege('anon', o.oid, 'SELECT,INSERT,UPDATE,DELETE'), false)
     AND NOT COALESCE(pg_catalog.has_table_privilege('authenticated', o.oid, 'SELECT,INSERT,UPDATE,DELETE'), false)
     AS direct_table_access_blocked
FROM objects o
ORDER BY o.name;
