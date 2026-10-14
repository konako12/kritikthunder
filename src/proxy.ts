import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveDestination } from '@/lib/auth-destination'

/**
 * /admin · /cms 접근 검사.
 * 로그인 안 함 → /login, 로그인 했지만 권한이 다르면 → 이동 규칙(src/lib/auth-destination.ts)대로.
 * /login · /forgot-password · /reset-password · /pending · /rejected · /no-access · /auth/*는
 * matcher에 없으므로 여기서 검사하지 않는다 (재설정·안내 페이지가 튕기지 않게).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const section = request.nextUrl.pathname.startsWith('/admin') ? '/admin' : '/cms'
  const { destination } = await resolveDestination(user)
  if (destination !== section) {
    const redirect = NextResponse.redirect(new URL(destination, request.url))
    // 세션 갱신 쿠키가 있으면 함께 전달
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/cms/:path*'],
}
