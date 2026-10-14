import { NextRequest, NextResponse } from 'next/server'
import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { validateNewPassword } from '@/lib/auth-recovery'

/** 로그인한 사용자(기자·관리자)의 비밀번호 변경 — 현재 비밀번호 확인 후 변경 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { currentPassword, newPassword, confirm } = await req.json().catch(() => ({}))
  if (!currentPassword) return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 })
  const invalid = validateNewPassword(String(newPassword ?? ''), String(confirm ?? ''))
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 다른 비밀번호를 입력해주세요.' }, { status: 400 })
  }

  // 현재 비밀번호 확인 — 쿠키를 건드리지 않는 별도 클라이언트로 로그인 시도
  const verifier = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }
  // 확인용으로 만든 세션만 정리 (사용자의 현재 로그인은 유지)
  await verifier.auth.signOut({ scope: 'local' })

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return NextResponse.json({ error: '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
