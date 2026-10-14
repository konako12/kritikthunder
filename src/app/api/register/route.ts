import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { name, media, email, article_links, bio } = await req.json()

    if (!name || !media || !email) {
      return NextResponse.json({ error: '필수 항목이 누락됐습니다.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 이미 신청된 이메일인지 확인
    const { data: existing } = await supabase
      .from('journalists')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      const statusMsg =
        existing.status === 'approved' ? '이미 승인된 계정입니다.' :
        existing.status === 'rejected' ? '가입 신청이 거절된 계정입니다. 로그인한 뒤 "재신청하기"에서 다시 신청할 수 있어요.' :
        '이미 가입 신청이 접수된 이메일입니다.'
      return NextResponse.json({ error: statusMsg }, { status: 409 })
    }

    const { error } = await supabase.from('journalists').insert({
      name,
      media,
      email,
      status: 'pending',
      article_links: article_links ?? [],
      bio: bio ?? null,
      review_count: 0,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
