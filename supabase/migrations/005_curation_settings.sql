-- ============================================================
-- 005_curation_settings.sql
-- 평론가 vs 유저 · 자동 큐레이션 컬렉션 기본 설정값
-- (값이 없어도 코드 기본값으로 동작하지만, 관리자 화면에서 바로 보이도록 넣어둠)
-- 이미 값이 있으면 덮어쓰지 않음
-- ============================================================

INSERT INTO settings (key, value) VALUES
  ('curation_min_critic_reviews', '3'),   -- 컬렉션 · 평론가 vs 유저 최소 전문가 리뷰 수
  ('curation_min_user_reviews',   '5'),   -- 평론가 vs 유저 최소 유저 리뷰 수
  ('collections_hidden',          '[]'),  -- 숨긴 컬렉션 주소 목록 (JSON)
  ('collections_pinned',          '[]')   -- 메인 고정 컬렉션 주소 목록 (JSON, 순서대로 노출)
ON CONFLICT (key) DO NOTHING;
