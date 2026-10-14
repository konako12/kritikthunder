import { createClient } from '@supabase/supabase-js'
import type { Journalist } from '@/lib/types'

/**
 * 로그인한 사용자를 어디로 보낼지 정하는 유일한 규칙.
 * 로그인 페이지 · 프록시(미들웨어) · /admin · /cms · 로그인 API · 인증 콜백이 모두 이 함수만 쓴다.
 *
 *   ADMIN_EMAILS에 있는 이메일   → /admin
 *   journalists.status=approved → /cms
 *   journalists.status=pending  → /pending
 *   journalists.status=rejected → /rejected
 *   그 외                       → /no-access
 *
 * 어떤 경우에도 /login을 돌려주지 않는다 (로그인 ↔ 다른 페이지 무한 이동 방지).
 * 로그인하지 않은 사용자를 /login으로 보내는 것은 호출하는 쪽에서 따로 처리한다.
 *
 * next/headers에 의존하지 않아 프록시에서도 쓸 수 있다.
 */

export type AuthDestination = '/admin' | '/cms' | '/pending' | '/rejected' | '/no-access'

export type JournalistSummary = Pick<Journalist, 'name' | 'media' | 'email' | 'status' | 'joined_at'>

export interface DestinationResult {
  destination: AuthDestination
  journalist: JournalistSummary | null
}

/** ADMIN_EMAILS(서버 전용 환경변수)에 포함된 이메일인지 — 대소문자 무시 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const target = email.trim().toLowerCase()
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target)
}

/** 서비스 키로 기자 신청 정보 조회 (쿠키 없이 동작하는 서버 전용 클라이언트) */
async function findJournalist(email: string): Promise<JournalistSummary | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  // 가입 신청 때 입력한 이메일 대소문자가 로그인 이메일(소문자)과 다를 수 있어 대소문자 무시로 비교
  const escaped = email.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data, error } = await supabase
    .from('journalists')
    .select('name, media, email, status, joined_at')
    .ilike('email', escaped)
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[auth-destination] 기자 정보 조회 실패:', error.message)
    return null
  }
  return data
}

export async function resolveDestination(user: { email?: string | null } | null): Promise<DestinationResult> {
  const email = user?.email?.trim()
  if (!email) return { destination: '/no-access', journalist: null }
  if (isAdminEmail(email)) return { destination: '/admin', journalist: null }

  const journalist = await findJournalist(email)
  switch (journalist?.status) {
    case 'approved': return { destination: '/cms', journalist }
    case 'pending':  return { destination: '/pending', journalist }
    case 'rejected': return { destination: '/rejected', journalist }
    default:         return { destination: '/no-access', journalist }
  }
}
