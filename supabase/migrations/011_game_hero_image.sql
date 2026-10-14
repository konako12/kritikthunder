-- ============================================================
-- 011_game_hero_image.sql
-- 메인 히어로 배너 전용 이미지 · 초점 위치
--   · hero_image_url : 히어로 배너용 가로 이미지 (없으면 cover_url 사용)
--   · hero_focus     : 이미지를 자를 때 남길 가로 위치
--                      'left' | 'center' | 'right' 또는 '0%' ~ '100%'
--                      (NULL이면 가운데)
-- 여러 번 실행해도 안전함
-- ============================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS hero_focus TEXT;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_hero_focus_check;
ALTER TABLE games ADD CONSTRAINT games_hero_focus_check
  CHECK (hero_focus IS NULL OR hero_focus IN ('left', 'center', 'right') OR hero_focus ~ '^(100|[1-9]?[0-9])%$');
