import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ role: 'none' })
  }

  // 관리자 이메일 검사 (서버 전용 환경변수)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (adminEmails.includes(user.email!)) {
    return NextResponse.json({ role: 'admin' })
  }

  // journalists 테이블에서 상태 조회
  const supabase = createAdminClient()
  const { data: journalist } = await supabase
    .from('journalists')
    .select('status')
    .eq('email', user.email!)
    .maybeSingle()

  if (!journalist) {
    return NextResponse.json({ role: 'none' })
  }

  return NextResponse.json({ role: 'journalist', status: journalist.status })
}
