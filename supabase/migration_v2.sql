-- ══════════════════════════════════════════════════════════════
-- KRITIK 마이그레이션 v2
-- Supabase SQL Editor에 붙여넣고 실행하세요
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. RLS: 기자가 본인 레코드 읽기 허용
--    (이메일 기반으로 journalists ↔ auth.users 연동)
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "journalists_read_own"
  ON journalists FOR SELECT
  USING (email = auth.email());

-- ──────────────────────────────────────────────────────────────
-- 2. RLS: 승인된 기자의 리뷰 INSERT 허용
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "critic_reviews_journalist_insert"
  ON critic_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journalists
      WHERE email = auth.email()
        AND status = 'approved'
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 3. RLS: 기자가 본인 리뷰 UPDATE 허용
--    (journalist.name = critic_reviews.reviewer_name 으로 소유 확인)
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "critic_reviews_journalist_update"
  ON critic_reviews FOR UPDATE
  USING (
    reviewer_name = (
      SELECT name FROM journalists
      WHERE email = auth.email()
        AND status = 'approved'
      LIMIT 1
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 4. RLS: 기자가 본인 리뷰 DELETE 허용
-- ──────────────────────────────────────────────────────────────
CREATE POLICY "critic_reviews_journalist_delete"
  ON critic_reviews FOR DELETE
  USING (
    reviewer_name = (
      SELECT name FROM journalists
      WHERE email = auth.email()
        AND status = 'approved'
      LIMIT 1
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 5. 메타스코어 자동 계산 트리거
--    critic_reviews INSERT / UPDATE / DELETE 시 games.critic_score
--    를 해당 게임 전체 리뷰 평균(ROUND)으로 자동 갱신
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_critic_score()
RETURNS TRIGGER AS $$
DECLARE
  v_game_id INTEGER;
  v_avg     INTEGER;
BEGIN
  -- INSERT/UPDATE → NEW, DELETE → OLD
  v_game_id := COALESCE(NEW.game_id, OLD.game_id);

  SELECT ROUND(AVG(score))::INTEGER INTO v_avg
  FROM   critic_reviews
  WHERE  game_id = v_game_id;

  -- 리뷰가 없으면 NULL 로 재설정
  UPDATE games
  SET    critic_score = v_avg
  WHERE  id = v_game_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_critic_score ON critic_reviews;
CREATE TRIGGER trg_update_critic_score
  AFTER INSERT OR UPDATE OR DELETE ON critic_reviews
  FOR EACH ROW EXECUTE FUNCTION update_critic_score();

-- ══════════════════════════════════════════════════════════════
-- 6. 기자 리뷰 수 자동 업데이트 트리거
--    INSERT → review_count +1, DELETE → review_count -1
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_journalist_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE journalists
    SET    review_count = review_count + 1
    WHERE  name = NEW.reviewer_name;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE journalists
    SET    review_count = GREATEST(review_count - 1, 0)
    WHERE  name = OLD.reviewer_name;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_journalist_review_count ON critic_reviews;
CREATE TRIGGER trg_update_journalist_review_count
  AFTER INSERT OR DELETE ON critic_reviews
  FOR EACH ROW EXECUTE FUNCTION update_journalist_review_count();

-- ══════════════════════════════════════════════════════════════
-- 7. 기존 데이터 critic_score 재계산 (마이그레이션 시 1회 실행)
-- ══════════════════════════════════════════════════════════════
UPDATE games g
SET    critic_score = (
         SELECT ROUND(AVG(score))::INTEGER
         FROM   critic_reviews
         WHERE  game_id = g.id
       )
WHERE  EXISTS (
         SELECT 1 FROM critic_reviews WHERE game_id = g.id
       );
