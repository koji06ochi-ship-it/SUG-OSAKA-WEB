-- S.u.G WALK R7 — shared JPY budget ledger (PostgreSQL 14+)
-- DATA DEFINITION ONLY. Do not deploy or grant access until owner approval.
-- Database role used by the public app must have NO direct table privileges.
CREATE TABLE IF NOT EXISTS r7_budget_month (
 month_key text PRIMARY KEY CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
 ai_text_held bigint NOT NULL DEFAULT 0 CHECK (ai_text_held >= 0),
 ai_text_spent bigint NOT NULL DEFAULT 0 CHECK (ai_text_spent >= 0),
 ai_voice_held bigint NOT NULL DEFAULT 0 CHECK (ai_voice_held >= 0),
 ai_voice_spent bigint NOT NULL DEFAULT 0 CHECK (ai_voice_spent >= 0),
 live_held bigint NOT NULL DEFAULT 0 CHECK (live_held >= 0),
 live_spent bigint NOT NULL DEFAULT 0 CHECK (live_spent >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT r7_budget_month_total CHECK (
  ai_text_held+ai_text_spent+ai_voice_held+ai_voice_spent+live_held+live_spent <= 9000
 ),
 CONSTRAINT r7_budget_month_text CHECK(ai_text_held+ai_text_spent <= 2000),
 CONSTRAINT r7_budget_month_voice CHECK(ai_voice_held+ai_voice_spent <= 2000),
 CONSTRAINT r7_budget_month_live CHECK(live_held+live_spent <= 5000)
);
-- 1,000 yen contingency is intentionally NOT spendable.
CREATE TABLE IF NOT EXISTS r7_budget_operation (
 operation_id text PRIMARY KEY CHECK(length(operation_id) BETWEEN 16 AND 128),
 month_key text NOT NULL REFERENCES r7_budget_month(month_key),
 category text NOT NULL CHECK(category IN ('ai_text','ai_voice','live')),
 reserved_yen bigint NOT NULL CHECK(reserved_yen BETWEEN 1 AND 9000),
 actual_yen bigint CHECK(actual_yen IS NULL OR actual_yen >= 0),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','settled','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT r7_budget_operation_state CHECK (
  (status='reserved' AND actual_yen IS NULL) OR
  (status='settled' AND actual_yen IS NOT NULL AND actual_yen <= reserved_yen) OR
  (status='cancelled' AND actual_yen=0)
 )
);
CREATE INDEX IF NOT EXISTS r7_budget_operation_month_category
 ON r7_budget_operation(month_key,category,status);
COMMENT ON TABLE r7_budget_operation IS
 'Server-side ledger. Operation IDs are randomly generated, not personal IDs. No GPS, transcripts or secrets.';
