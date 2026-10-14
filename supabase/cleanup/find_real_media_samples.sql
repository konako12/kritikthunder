-- ══════════════════════════════════════════════════════════════
-- 실제 매체 이름이 들어간 샘플 데이터 조회 (읽기 전용, 아무것도 바꾸지 않음)
--
-- Supabase SQL Editor에서 실행하세요.
-- 결과의 "구분" 열:
--   · 샘플(schema.sql)  → schema.sql이 처음 넣은 샘플 행. delete_real_media_samples.sql이 지우는 대상
--   · 직접 등록         → 매체명은 겹치지만 관리자/기자가 나중에 등록한 행. 삭제 SQL은 건드리지 않음
-- ══════════════════════════════════════════════════════════════

-- 1) critic_reviews
WITH media_names(name) AS (
  VALUES ('인벤'), ('루리웹'), ('게임메카'), ('IGN 코리아'), ('IGN Korea'), ('IGN'),
         ('게임동아'), ('디스이즈게임')
),
seed_reviews(media, reviewer_name, score, published_at) AS (
  VALUES ('게임동아',     '김지훈 기자', 98, DATE '2022-03-02'),
         ('루리웹',       '박성현 기자', 95, DATE '2022-03-04'),
         ('인벤',         '이수민 기자', 96, DATE '2022-03-05'),
         ('디스이즈게임', '최다현 기자', 88, DATE '2022-03-08'),
         ('게임동아',     '김지훈 기자', 98, DATE '2024-01-15'),
         ('인벤',         '이수민 기자', 94, DATE '2024-01-08'),
         ('루리웹',       '박성현 기자', 89, DATE '2024-01-02')
)
SELECT
  CASE WHEN s.media IS NOT NULL THEN '샘플(schema.sql)' ELSE '직접 등록' END AS 구분,
  cr.id, cr.game_id, g.title AS game_title,
  cr.media, cr.reviewer_name, cr.score, cr.published_at, cr.source_url, cr.created_at
FROM critic_reviews cr
LEFT JOIN games g ON g.id = cr.game_id
LEFT JOIN seed_reviews s
  ON  s.media = cr.media AND s.reviewer_name = cr.reviewer_name
  AND s.score = cr.score AND s.published_at = cr.published_at
WHERE EXISTS (SELECT 1 FROM media_names m WHERE cr.media ILIKE '%' || m.name || '%')
ORDER BY 구분 DESC, cr.id;

-- 2) journalists
WITH media_names(name) AS (
  VALUES ('인벤'), ('루리웹'), ('게임메카'), ('IGN 코리아'), ('IGN Korea'), ('IGN'),
         ('게임동아'), ('디스이즈게임')
),
seed_emails(email) AS (
  VALUES ('kim@gamedonga.co.kr'), ('lee@inven.co.kr'), ('park@ruliweb.com'),
         ('choi@thisisgame.com'), ('han@gamemeca.com'), ('jung@kr.ign.com')
)
SELECT
  CASE
    WHEN s.email IS NOT NULL AND u.id IS NULL THEN '샘플(schema.sql)'
    WHEN s.email IS NOT NULL                  THEN '샘플 이메일이지만 로그인 계정 있음 — 삭제 안 함'
    ELSE '직접 등록'
  END AS 구분,
  j.id, j.name, j.media, j.email, j.status, j.review_count, j.joined_at,
  (u.id IS NOT NULL) AS has_auth_account
FROM journalists j
LEFT JOIN seed_emails s ON s.email = j.email
LEFT JOIN auth.users u  ON u.email = j.email
WHERE EXISTS (SELECT 1 FROM media_names m WHERE j.media ILIKE '%' || m.name || '%')
   OR s.email IS NOT NULL
ORDER BY 구분 DESC, j.id;
