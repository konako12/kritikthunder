-- ============================================================
-- 006_critic_review_score_display.sql
-- 전문가 리뷰 원래 점수 표기(score_display) 추가 — 예: "9.5/10", "5/5", "A-"
-- 비어 있으면 화면에서 100점 점수를 "96/100" 형식으로 표시
-- ============================================================

ALTER TABLE critic_reviews ADD COLUMN IF NOT EXISTS score_display TEXT;

ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_score_display_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_score_display_check
  CHECK (score_display IS NULL OR char_length(score_display) BETWEEN 1 AND 12);
