import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/auth-destination'

// 관리자 이메일 판별 규칙은 auth-destination 하나만 사용
export { isAdminEmail }

/**
 * 관리자 확인 후 사용자 정보까지 돌려준다 (등록자 기록 등에 사용).
 * 사용: const { user, denied } = await getAdminUser(); if (denied) return denied
 */
export async function getAdminUser(): Promise<{ user: User; denied: null } | { user: null; denied: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, denied: NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 }) }
  if (!isAdminEmail(user.email)) return { user: null, denied: NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 }) }
  return { user, denied: null }
}

/**
 * 관리자 API 공통 인증 — 관리자가 아니면 에러 응답을 돌려준다.
 * 사용: const denied = await requireAdmin(); if (denied) return denied
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  return (await getAdminUser()).denied
}
