-- ============================================================
-- 010_journalist_reapply.sql
-- 기자 가입 거절 사유 · 재신청 + journalists 권한 점검
-- 여러 번 실행해도 안전함
-- ============================================================

-- ── 1. 칸 추가 ─────────────────────────────────────────────
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS rejection_reason TEXT;          -- 마지막 거절 사유 (재신청 후에도 기록용으로 유지)
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ;   -- 마지막 거절 일시 (재신청 대기 기간 계산)
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS apply_count      INTEGER NOT NULL DEFAULT 1; -- 신청 횟수 (재신청마다 +1)
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS last_applied_at  TIMESTAMPTZ;   -- 마지막 신청(재신청) 일시

ALTER TABLE journalists DROP CONSTRAINT IF EXISTS journalists_rejection_reason_len;
ALTER TABLE journalists ADD CONSTRAINT journalists_rejection_reason_len
  CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500);

-- ── 2. RLS 정책 정리 ───────────────────────────────────────
-- 의도한 정책은 두 개뿐:
--   · journalists_admin_all  : service_role(서버의 관리자 API · 재신청 API)만 읽기/쓰기
--   · journalists_read_own   : 로그인한 기자는 자기 행 읽기만
-- 대시보드에서 따로 만든 정책이 있어도(예: 기자가 자기 행을 UPDATE하는 정책) 모두 지우고 다시 만든다.
ALTER TABLE journalists ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'journalists' LOOP
    EXECUTE format('DROP POLICY %I ON public.journalists', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "journalists_admin_all"
  ON journalists FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "journalists_read_own"
  ON journalists FOR SELECT
  USING (lower(email) = lower(auth.email()));

-- ── 3. 이중 안전장치: 로그인 사용자(anon/authenticated)는 심사 관련 칸을 절대 못 바꿈 ──
-- 나중에 실수로 UPDATE 정책이 생겨도 status · 거절 사유 · 신청 횟수 · 이메일 변경은 DB가 막는다.
-- 서버(service_role)와 SQL Editor(postgres), 리뷰 수 자동 갱신 트리거(SECURITY DEFINER)는 영향 없음.
CREATE OR REPLACE FUNCTION guard_journalist_review_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.status           IS DISTINCT FROM OLD.status
    OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    OR NEW.rejected_at      IS DISTINCT FROM OLD.rejected_at
    OR NEW.apply_count      IS DISTINCT FROM OLD.apply_count
    OR NEW.last_applied_at  IS DISTINCT FROM OLD.last_applied_at
    OR NEW.email            IS DISTINCT FROM OLD.email
  ) THEN
    RAISE EXCEPTION '심사 관련 정보는 직접 수정할 수 없습니다';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_journalist_review_fields ON journalists;
CREATE TRIGGER trg_guard_journalist_review_fields
  BEFORE UPDATE ON journalists
  FOR EACH ROW EXECUTE FUNCTION guard_journalist_review_fields();

-- 로그인 사용자의 INSERT도 막음 (가입 신청은 서버 API가 service_role로 넣음)
CREATE OR REPLACE FUNCTION guard_journalist_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION '기자 정보는 직접 추가할 수 없습니다';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_journalist_insert ON journalists;
CREATE TRIGGER trg_guard_journalist_insert
  BEFORE INSERT ON journalists
  FOR EACH ROW EXECUTE FUNCTION guard_journalist_insert();

-- ── 4. 점검 결과 — 아래 두 줄만 나와야 정상 ─────────────────
--   journalists_admin_all | ALL    | {public} | (auth.role() = 'service_role'::text)
--   journalists_read_own  | SELECT | {public} | (lower(email) = lower(auth.email()))
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'journalists'
ORDER BY policyname;
