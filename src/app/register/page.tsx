export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // 이미 로그인했으면 이동 규칙대로 (관리자 → /admin, 승인 → /cms, 대기 → /pending, 거절 → /rejected, 그 외 → /no-access)
  if (user) redirect((await resolveDestination(user)).destination)

  return <RegisterClient />
}
