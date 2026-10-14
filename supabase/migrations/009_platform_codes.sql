-- ============================================================
-- 009_platform_codes.sql
-- games.platforms 저장값을 영문 코드로 변환 (화면 이름은 src/lib/platforms.ts에서 관리)
--
--   PS5    → ps5            PS4    → ps4
--   Xbox   → xbox-series    (Xbox One 지원 여부는 관리자가 직접 확인해 추가)
--   PC     → pc             Switch → switch
--   Mobile → mobile
--   (혹시 들어 있을 수 있는 "Xbox Series X|S", "Xbox One", "Switch 2", "모바일"도 함께 변환)
--
-- 순서는 유지하고 중복은 하나로 합친다. 이미 코드로 바뀐 값은 그대로라 여러 번 실행해도 안전함.
-- ============================================================

-- 1) 변환 전 미리보기 (선택) — 아래 SELECT만 먼저 실행해서 확인해도 됨
-- SELECT id, title, platforms FROM games ORDER BY id;

-- 2) 변환
UPDATE games g
SET platforms = sub.converted
FROM (
  SELECT id, ARRAY(
    SELECT code
    FROM (
      SELECT
        CASE p
          WHEN 'PS5'             THEN 'ps5'
          WHEN 'PS4'             THEN 'ps4'
          WHEN 'Xbox'            THEN 'xbox-series'
          WHEN 'Xbox Series X|S' THEN 'xbox-series'
          WHEN 'Xbox One'        THEN 'xbox-one'
          WHEN 'PC'              THEN 'pc'
          WHEN 'Switch'          THEN 'switch'
          WHEN 'Switch 2'        THEN 'switch-2'
          WHEN 'Mobile'          THEN 'mobile'
          WHEN '모바일'           THEN 'mobile'
          ELSE p
        END AS code,
        MIN(i) AS first_pos
      FROM unnest(games.platforms) WITH ORDINALITY AS t(p, i)
      GROUP BY 1
    ) mapped
    ORDER BY first_pos
  ) AS converted
  FROM games
) sub
WHERE g.id = sub.id
  AND g.platforms IS DISTINCT FROM sub.converted;

-- 3) 확인 — 알 수 없는 값이 남았으면 여기에 나옴 (비어 있으면 정상)
SELECT id, title, platforms
FROM games
WHERE NOT platforms <@ ARRAY['ps5','ps4','xbox-series','xbox-one','pc','switch','switch-2','mobile']::TEXT[];
