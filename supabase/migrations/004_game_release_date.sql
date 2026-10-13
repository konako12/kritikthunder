-- ============================================================
-- 004_game_release_date.sql
-- 게임 출시일(release_date) 추가 — 출시 일정 페이지(/releases)용
-- 비워두면 "출시일 미정" (year 값으로 "2026년 예정" 표시)
-- ============================================================

ALTER TABLE games ADD COLUMN IF NOT EXISTS release_date DATE;

CREATE INDEX IF NOT EXISTS games_release_date_idx ON games (release_date);
