import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // 1. 인증 및 관리자 검증
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(user.email!)) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 })
  }

  // 2. 파일 추출
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'JPG, PNG, WebP 파일만 지원합니다.' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: '파일 크기는 5MB 이하여야 합니다.' }, { status: 400 })
  }

  // 3. Supabase Storage 업로드 (service_role)
  const supabase = createAdminClient()
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

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
