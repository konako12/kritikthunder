-- ============================================================
-- 013_score_display_format.sql
-- 원래 점수 표기(score_display)는 만점이 포함된 형식만 허용 — 예) 9/10, 4.5/5, 88/100
--   · 점수 ≤ 만점, 만점 > 0
--   · 기존 값은 검사하지 않음 (NOT VALID) — 숫자만 있는 기존 값(예: 8.8)은 화면에서 100점 환산 점수로 대신 표시
-- 여러 번 실행해도 안전함
-- ============================================================

ALTER TABLE critic_reviews DROP CONSTRAINT IF EXISTS critic_reviews_score_display_format_check;
ALTER TABLE critic_reviews ADD CONSTRAINT critic_reviews_score_display_format_check
  CHECK (
    score_display IS NULL OR (
      score_display ~ '^\d{1,3}(\.\d{1,2})?/\d{1,3}(\.\d{1,2})?$'
      AND split_part(score_display, '/', 2)::numeric > 0
      AND split_part(score_display, '/', 1)::numeric <= split_part(score_display, '/', 2)::numeric
    )
  ) NOT VALID;
