import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { RECOVERY_COOKIE, validateNewPassword } from '@/lib/auth-recovery'

/** 재설정 메일 링크로 들어온 사용자의 새 비밀번호 저장 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.get(RECOVERY_COOKIE)) {
    return NextResponse.json({ error: '재설정 링크가 만료됐어요. 다시 요청해주세요.', expired: true }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '재설정 링크가 만료됐어요. 다시 요청해주세요.', expired: true }, { status: 401 })
  }

  const { password, confirm } = await req.json().catch(() => ({}))
  const invalid = validateNewPassword(String(password ?? ''), String(confirm ?? ''))
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    const msg = error.code === 'same_password'
      ? '이전과 다른 비밀번호를 입력해주세요.'
      : '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 새 비밀번호로 다시 로그인하도록 모든 세션 종료
  await supabase.auth.signOut()
  cookieStore.delete(RECOVERY_COOKIE)
  return NextResponse.json({ ok: true })
}
