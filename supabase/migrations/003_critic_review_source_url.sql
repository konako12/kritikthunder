-- ============================================================
-- 003_critic_review_source_url.sql
-- 전문가 리뷰 원문 기사 링크(source_url) 추가
-- 기존 리뷰는 source_url = NULL 로 그대로 유지됨
-- ============================================================

-- 1. 원문 링크 컬럼 (선택 항목)
ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 2. http:// 또는 https:// 로 시작하는 주소만 허용 (빈 값은 NULL)
ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_source_url_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_source_url_check
  CHECK (source_url IS NULL OR source_url ~* '^https?://[^\s]+$');

-- 3. 기자 리뷰 등록 정책 보강
--    기존: 승인된 기자면 아무 기자명으로나 등록 가능
--    변경: 본인 이름(reviewer_name)으로만 등록 가능
--    (수정/삭제 정책은 이미 본인 리뷰로 제한되어 있어 그대로 유지)
DROP POLICY IF EXISTS "critic_reviews_journalist_insert" ON critic_reviews;
CREATE POLICY "critic_reviews_journalist_insert"
  ON critic_reviews FOR INSERT
  WITH CHECK (
    reviewer_name = (
      SELECT name FROM journalists
      WHERE email = auth.email()
        AND status = 'approved'
      LIMIT 1
    )
  );
