-- ============================================================
-- 002_security.sql
-- journalists 컬럼 추가, status 제약 업데이트, Storage 정책
-- ============================================================

-- 1. journalists 테이블 컬럼 추가
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS article_links TEXT[] DEFAULT '{}';
ALTER TABLE journalists ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. status CHECK에 'rejected' 추가 (기존 제약 교체)
ALTER TABLE journalists DROP CONSTRAINT IF EXISTS journalists_status_check;
ALTER TABLE journalists ADD CONSTRAINT journalists_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Storage game-covers 정책
-- (RLS가 활성화되어 있어야 함 — Supabase 콘솔 Storage 버킷 설정에서 RLS 켜기)

-- 공개 읽기 (누구나 커버 이미지 볼 수 있음)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'game_covers_public_read'
  ) THEN
    CREATE POLICY "game_covers_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'game-covers');
  END IF;
END $$;

-- 서비스 롤만 업로드 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'game_covers_service_insert'
  ) THEN
    CREATE POLICY "game_covers_service_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'game-covers' AND auth.role() = 'service_role');
  END IF;
END $$;

-- 서비스 롤만 수정 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'game_covers_service_update'
  ) THEN
    CREATE POLICY "game_covers_service_update"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'game-covers' AND auth.role() = 'service_role');
  END IF;
END $$;

-- 서비스 롤만 삭제 허용
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'game_covers_service_delete'
  ) THEN
    CREATE POLICY "game_covers_service_delete"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'game-covers' AND auth.role() = 'service_role');
  END IF;
END $$;
