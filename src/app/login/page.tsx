export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'
import LoginClient from './LoginClient'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const NOTICES: Record<string, string> = {
  reset_done: '비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.',
}

const ERRORS: Record<string, string> = {
  auth_callback_failed: '인증 링크가 만료됐거나 올바르지 않아요.',
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 이미 로그인했으면 규칙대로 이동 (절대 /admin으로 일괄 보내지 않음 — 무한 이동 원인이었음)
  if (user) redirect((await resolveDestination(user)).destination)

  const params = await searchParams
  const notice = NOTICES[String(params.notice ?? '')] ?? ''
  const initialError = ERRORS[String(params.error ?? '')] ?? ''

  return <LoginClient notice={notice} initialError={initialError} />
}
