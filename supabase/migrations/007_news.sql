-- ============================================================
-- 007_news.sql
-- 게임 뉴스 (관리자가 원문 링크를 등록하는 방식)
--
-- 권한 구조
--   · 게시(published)된 뉴스만 누구나 조회 (RLS)
--   · 등록·수정·삭제는 service_role만 가능 (RLS)
--     → 앱에서는 /api/admin/news* 라우트만 service_role을 쓰고,
--       그 라우트는 로그인한 사용자가 ADMIN_EMAILS에 있는지 먼저 확인한다.
--       (ADMIN_EMAILS는 서버 환경변수라 DB 정책에서 직접 읽을 수 없음)
--
-- 이미지 파일은 기존 game-covers 버킷의 news/ 폴더에 저장 (002_security.sql 정책 그대로 사용)
-- ============================================================

CREATE TABLE IF NOT EXISTS news (
  id                 BIGSERIAL PRIMARY KEY,

  -- 기사 정보
  title              TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  media              TEXT NOT NULL CHECK (char_length(media) BETWEEN 1 AND 50),   -- 매체명
  source_url         TEXT NOT NULL CHECK (source_url ~* '^https?://[^\s]+$'),     -- 원문 링크 (필수)
  summary            TEXT CHECK (summary IS NULL OR char_length(summary) <= 300), -- 첫 문단
  published_at       DATE,                                                         -- 원문 게재일

  -- 이미지
  image_url          TEXT CHECK (image_url IS NULL OR image_url ~* '^https?://[^\s]+$'),
  image_source       TEXT CHECK (image_source IS NULL OR image_source IN ('original', 'upload', 'game_cover')),
  original_image_url TEXT CHECK (original_image_url IS NULL OR original_image_url ~* '^https?://[^\s]+$'),
                     -- 원문 대표 이미지(og:image) — "원문 이미지로 되돌리기"용으로 따로 보관

  -- 연결 · 노출
  game_id            INTEGER REFERENCES games(id) ON DELETE SET NULL,             -- 관련 게임 (선택)
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published', 'hidden')),
  is_pinned          BOOLEAN NOT NULL DEFAULT false,                               -- 메인 고정
  sort_order         INTEGER NOT NULL DEFAULT 0,                                   -- 고정 뉴스끼리 순서 (작을수록 앞)

  -- 출처 방식 — 매체 송고 기능을 붙일 때 'submitted'를 CHECK에 추가
  source_type        TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual')),

  -- 등록 정보
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 공개 목록: 게시 상태 + 고정 우선 + 최신순
CREATE INDEX IF NOT EXISTS news_public_list_idx
  ON news (status, is_pinned DESC, sort_order, published_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS news_game_idx   ON news (game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS news_media_idx  ON news (media);
-- 같은 원문 링크 중복 경고용 (막지는 않음)
CREATE INDEX IF NOT EXISTS news_source_url_idx ON news (source_url);

-- ── RLS ──
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_public_read" ON news;
CREATE POLICY "news_public_read"
  ON news FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "news_admin_all" ON news;
CREATE POLICY "news_admin_all"
  ON news FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
