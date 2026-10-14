-- ============================================================
-- 012_critic_review_verdict.sql
-- 전문가 리뷰 "한줄평 + 전문 링크" 구조
--
--   · verdict      : 한줄평 (100자 이내) — 항상 리뷰를 쓴 기자 본인의 문장
--   · verdict_type : 'own'   기자가 CMS에서 직접 작성
--                    'quote' 관리자가 원문 기사 문장을 그대로 인용 (원문 링크 필수)
--   · review_text  : 전문 — 원문 링크가 없는 리뷰는 필수 (링크가 있으면 비워도 됨)
--   · is_hidden    : 부적절한 리뷰 숨김 (관리자). 숨긴 리뷰는 공개 화면 · 점수 평균에서 빠짐
--
-- 기존 리뷰의 한줄평은 비워 둔다 (관리자 화면에 "한줄평 없음"으로 표시)
-- 여러 번 실행해도 안전함
-- ============================================================

-- 1) 칸 추가
ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS verdict      TEXT;
ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS verdict_type TEXT;
ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS is_hidden    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS hidden_at    TIMESTAMPTZ;

ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_verdict_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_verdict_check
  CHECK (verdict IS NULL OR char_length(btrim(verdict)) BETWEEN 1 AND 100);

ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_verdict_type_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_verdict_type_check
  CHECK (
    (verdict IS NULL AND verdict_type IS NULL)
    OR (verdict IS NOT NULL AND verdict_type IN ('own', 'quote'))
  );

-- 원문 인용은 원문 기사가 있어야 함
ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_quote_source_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_quote_source_check
  CHECK (verdict_type IS DISTINCT FROM 'quote' OR source_url IS NOT NULL);

-- 2) 전문은 원문 링크가 없을 때만 필수
ALTER TABLE critic_reviews ALTER COLUMN review_text DROP NOT NULL;
ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_body_or_link_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_body_or_link_check
  CHECK (source_url IS NOT NULL OR (review_text IS NOT NULL AND btrim(review_text) <> ''))
  NOT VALID; -- 기존 행은 검사하지 않음 (새로 쓰거나 고칠 때부터 적용)

-- 3) 한줄평 출처 보호
--    · 기자(CMS, authenticated): 한줄평은 'own'으로만, 숨김 여부는 못 바꿈
--    · 관리자(service_role): 'own' 한줄평은 쓰거나 고칠 수 없음 — 숨김만 가능
CREATE OR REPLACE FUNCTION guard_critic_review_verdict()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := coalesce(auth.role(), '');
BEGIN
  IF v_role = 'authenticated' THEN
    IF NEW.verdict IS NOT NULL AND NEW.verdict_type IS DISTINCT FROM 'own' THEN
      RAISE EXCEPTION '기자 한줄평은 직접 작성(own)으로만 저장할 수 있어요';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_hidden THEN RAISE EXCEPTION '숨김 상태로 등록할 수 없어요'; END IF;
    ELSIF NEW.is_hidden IS DISTINCT FROM OLD.is_hidden OR NEW.hidden_at IS DISTINCT FROM OLD.hidden_at THEN
      RAISE EXCEPTION '리뷰 숨김은 관리자만 바꿀 수 있어요';
    ELSIF OLD.is_hidden THEN
      RAISE EXCEPTION '숨김 처리된 리뷰는 수정할 수 없어요';
    END IF;
  ELSIF v_role = 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.verdict_type = 'own' THEN
        RAISE EXCEPTION '관리자는 기자 한줄평(own)을 작성할 수 없어요 — 원문 인용(quote)만 가능해요';
      END IF;
    ELSIF OLD.verdict_type = 'own' THEN
      IF NEW.verdict IS DISTINCT FROM OLD.verdict OR NEW.verdict_type IS DISTINCT FROM OLD.verdict_type THEN
        RAISE EXCEPTION '기자가 직접 쓴 한줄평은 수정할 수 없어요 — 부적절하면 리뷰를 숨겨주세요';
      END IF;
    ELSIF NEW.verdict_type = 'own' THEN
      RAISE EXCEPTION '관리자는 기자 한줄평(own)을 작성할 수 없어요 — 원문 인용(quote)만 가능해요';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_critic_review_verdict ON critic_reviews;
CREATE TRIGGER trg_guard_critic_review_verdict
  BEFORE INSERT OR UPDATE ON critic_reviews
  FOR EACH ROW EXECUTE FUNCTION guard_critic_review_verdict();

-- 4) 숨긴 리뷰는 공개 화면에서 안 보이게 (관리자 · 기자 CMS는 서버에서 service_role로 조회)
DROP POLICY IF EXISTS "critic_reviews_public_read" ON critic_reviews;
CREATE POLICY "critic_reviews_public_read" ON critic_reviews FOR SELECT USING (NOT is_hidden);

-- 5) 점수 평균에서 숨긴 리뷰 제외
CREATE OR REPLACE FUNCTION update_critic_score()
RETURNS TRIGGER AS $$
DECLARE
  v_game_id INTEGER;
  v_avg     INTEGER;
BEGIN
  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  SELECT ROUND(AVG(score))::INTEGER INTO v_avg
  FROM   critic_reviews
  WHERE  game_id = v_game_id AND NOT is_hidden;

  UPDATE games SET critic_score = v_avg WHERE id = v_game_id;

  -- 다른 게임으로 옮긴 경우 이전 게임도 다시 계산
  IF TG_OP = 'UPDATE' AND OLD.game_id IS DISTINCT FROM NEW.game_id THEN
    UPDATE games g
    SET    critic_score = (SELECT ROUND(AVG(score))::INTEGER FROM critic_reviews
                           WHERE game_id = OLD.game_id AND NOT is_hidden)
    WHERE  g.id = OLD.game_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_critic_score ON critic_reviews;
CREATE TRIGGER trg_update_critic_score
  AFTER INSERT OR UPDATE OR DELETE ON critic_reviews
  FOR EACH ROW EXECUTE FUNCTION update_critic_score();

UPDATE games g
SET    critic_score = (SELECT ROUND(AVG(score))::INTEGER FROM critic_reviews
                       WHERE game_id = g.id AND NOT is_hidden)
WHERE  EXISTS (SELECT 1 FROM critic_reviews WHERE game_id = g.id);
