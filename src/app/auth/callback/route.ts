import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE, safeNextPath } from '@/lib/auth-recovery'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // 비밀번호 재설정 메일은 next=/reset-password 로 들어옴 (가입 인증 메일은 next 없음)
  const next = safeNextPath(searchParams.get('next'))
  const isRecovery = next === '/reset-password'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (isRecovery) {
        cookieStore.set(RECOVERY_COOKIE, '1', {
          httpOnly: true, sameSite: 'lax', path: '/',
          secure: process.env.NODE_ENV === 'production',
          maxAge: RECOVERY_COOKIE_MAX_AGE,
        })
      }
      return NextResponse.redirect(`${origin}${next ?? '/pending'}`)
    }
  }

  // 만료·재사용된 링크 (Supabase가 ?error=...로 돌려보내는 경우 포함)
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
