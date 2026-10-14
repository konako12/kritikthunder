export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { RECOVERY_COOKIE } from '@/lib/auth-recovery'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: '비밀번호 재설정 | KRITIK',
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams
  const cookieStore = await cookies()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 메일 링크(/auth/callback, /auth/confirm)를 거쳐 세션과 재설정 표시가 모두 있어야 유효
  const valid = !error && !!user && !!cookieStore.get(RECOVERY_COOKIE)

  return <ResetPasswordClient valid={valid} email={valid ? user!.email ?? '' : ''} />
}
