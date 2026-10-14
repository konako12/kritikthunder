import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { resolveDestination } from '@/lib/auth-destination'
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE, safeNextPath } from '@/lib/auth-recovery'

/**
 * 이메일 템플릿의 token_hash 링크 처리
 * (supabase/email-templates/reset-password.md 참고)
 * PKCE(code) 방식과 달리 메일을 요청한 기기와 다른 기기에서 열어도 동작한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(searchParams.get('next'))
  const isRecovery = type === 'recovery'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      if (isRecovery) {
        const cookieStore = await cookies()
        cookieStore.set(RECOVERY_COOKIE, '1', {
          httpOnly: true, sameSite: 'lax', path: '/',
          secure: process.env.NODE_ENV === 'production',
          maxAge: RECOVERY_COOKIE_MAX_AGE,
        })
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      const dest = next ?? (await resolveDestination((await supabase.auth.getUser()).data.user)).destination
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  if (isRecovery) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
