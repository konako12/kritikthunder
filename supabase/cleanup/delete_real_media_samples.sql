-- ══════════════════════════════════════════════════════════════
-- 실제 매체 이름이 들어간 샘플 데이터 삭제
--
-- ⚠️ 먼저 find_real_media_samples.sql로 지워질 행을 확인하세요.
--
-- 지우는 대상: schema.sql이 처음 넣은 샘플 행만
--   · critic_reviews 7건  — 매체 + 기자명 + 점수 + 게재일이 샘플과 정확히 같은 행
--   · journalists   6건  — 샘플 이메일이면서 실제 로그인 계정(auth.users)이 없는 행
-- 관리자 "외부 매체 리뷰 등록"이나 기자 가입으로 직접 넣은 행은 매체명이 같아도 지우지 않습니다.
--
-- 함께 일어나는 일:
--   · 리뷰가 지워진 게임(샘플 기준 Elden Ring, Baldur's Gate 3, God of War Ragnarök,
--     Cyberpunk 2077)의 critic_score가 남은 리뷰 평균으로 다시 계산됩니다.
--     남은 리뷰가 없으면 NULL(TBD)이 됩니다.
--
-- 전체가 하나의 트랜잭션이라 중간에 오류가 나면 아무것도 지워지지 않습니다.
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- 1) 샘플 전문가 리뷰 대상 확정
CREATE TEMP TABLE _seed_review_ids ON COMMIT DROP AS
SELECT cr.id, cr.game_id
FROM critic_reviews cr
JOIN (
  VALUES ('게임동아',     '김지훈 기자', 98, DATE '2022-03-02'),
         ('루리웹',       '박성현 기자', 95, DATE '2022-03-04'),
         ('인벤',         '이수민 기자', 96, DATE '2022-03-05'),
         ('디스이즈게임', '최다현 기자', 88, DATE '2022-03-08'),
         ('게임동아',     '김지훈 기자', 98, DATE '2024-01-15'),
         ('인벤',         '이수민 기자', 94, DATE '2024-01-08'),
         ('루리웹',       '박성현 기자', 89, DATE '2024-01-02')
) AS s(media, reviewer_name, score, published_at)
  ON  s.media = cr.media AND s.reviewer_name = cr.reviewer_name
  AND s.score = cr.score AND s.published_at = cr.published_at;

-- 2) 전문가 리뷰 삭제 (트리거가 있으면 critic_score 자동 재계산)
DELETE FROM critic_reviews
WHERE id IN (SELECT id FROM _seed_review_ids);

-- 3) 트리거가 없는 환경 대비 — 영향받은 게임 점수 직접 재계산
UPDATE games g
SET critic_score = (
  SELECT ROUND(AVG(cr.score))::INTEGER FROM critic_reviews cr WHERE cr.game_id = g.id
)
WHERE g.id IN (SELECT DISTINCT game_id FROM _seed_review_ids);

-- 4) 샘플 기자 계정 삭제 (실제 로그인 계정이 있는 이메일은 제외)
DELETE FROM journalists j
WHERE j.email IN (
        'kim@gamedonga.co.kr', 'lee@inven.co.kr', 'park@ruliweb.com',
        'choi@thisisgame.com', 'han@gamemeca.com', 'jung@kr.ign.com'
      )
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = j.email);

-- 5) 결과 확인 — 아래 두 숫자가 0이면 샘플이 모두 정리된 것
SELECT
  (SELECT COUNT(*) FROM critic_reviews cr
     WHERE cr.media IN ('게임동아', '루리웹', '인벤', '디스이즈게임')
       AND cr.reviewer_name IN ('김지훈 기자', '박성현 기자', '이수민 기자', '최다현 기자')) AS 남은_샘플_리뷰,
  (SELECT COUNT(*) FROM journalists j
     WHERE j.email IN ('kim@gamedonga.co.kr', 'lee@inven.co.kr', 'park@ruliweb.com',
                       'choi@thisisgame.com', 'han@gamemeca.com', 'jung@kr.ign.com')) AS 남은_샘플_기자;

COMMIT;
