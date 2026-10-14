-- ============================================================
-- 008_game_title_original.sql
-- 게임 원어 제목(title_original) 추가
--   · title          : 화면에 보여줄 한국어 제목 (한국어 제목이 없으면 원어 그대로)
--   · title_original : IGDB 등 원어(주로 영어) 제목 — 검색과 상세 페이지 보조 표기에 사용
-- 여러 번 실행해도 안전함
-- ============================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS title_original TEXT;

-- 기존 게임은 지금 제목을 원어 제목으로 복사
UPDATE games SET title_original = title WHERE title_original IS NULL;
