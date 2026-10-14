import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'

/** GET /api/auth/role — 로그인한 사용자가 갈 곳 (규칙은 src/lib/auth-destination.ts 하나) */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ destination: '/login' })

  const { destination } = await resolveDestination(user)
  return NextResponse.json({ destination })
}
