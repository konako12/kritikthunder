import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/** ADMIN_EMAILS(서버 전용 환경변수)에 포함된 이메일인지 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
    .includes(email)
}

/**
 * 관리자 API 공통 인증 — 관리자가 아니면 에러 응답을 돌려준다.
 * 사용: const denied = await requireAdmin(); if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 })
  return null
}
