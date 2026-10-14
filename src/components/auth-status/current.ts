import { createClient } from '@/lib/supabase-server'
import { resolveDestination, type AuthDestination, type DestinationResult } from '@/lib/auth-destination'

/** 안내 페이지용 — 현재 로그인 사용자와 이동 규칙 결과 (로그인 안 했으면 user=null, 이동하지 않음) */
export async function currentStatus(): Promise<{ loggedIn: boolean } & Partial<DestinationResult>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { loggedIn: false }
  return { loggedIn: true, ...(await resolveDestination(user)) }
}

/** 이 계정이 실제로 가야 할 곳이 다른 안내 페이지일 때 보여줄 버튼 이름 */
export const DESTINATION_LABEL: Record<AuthDestination, string> = {
  '/admin': '관리자 페이지로 이동',
  '/cms': '기자 CMS로 이동',
  '/pending': '신청 상태 보기',
  '/rejected': '신청 결과 보기',
  '/no-access': '계정 상태 보기',
}
