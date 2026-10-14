import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// POST /api/admin/upload-cover-file — 게임 커버 · 뉴스 이미지 업로드 (game-covers 버킷)
// form-data: file, folder?('news') — folder=news면 news/ 폴더에 저장
export async function POST(req: NextRequest) {
  // 1. 관리자 검증
  const denied = await requireAdmin()
  if (denied) return denied

  // 2. 파일 추출
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folder = formData.get('folder') === 'news' ? 'news/' : ''

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  if (!EXT[file.type]) {
    return NextResponse.json({ error: 'JPG, PNG, WebP 파일만 지원합니다.' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })
  }

  // 3. Supabase Storage 업로드 (service_role)
  const supabase = createAdminClient()
  const filename = `${folder}${Date.now()}-${Math.random().toString(36).slice(2)}.${EXT[file.type]}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('game-covers')
    .upload(filename, buffer, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: '업로드 실패: ' + error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('game-covers')
    .getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl })
}
