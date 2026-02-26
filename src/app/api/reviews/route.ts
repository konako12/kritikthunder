import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/reviews — 유저 리뷰 등록
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { game_id, nickname, stars, review_text } = await req.json()

  if (!game_id || !nickname || !stars || !review_text) {
    return NextResponse.json({ error: '필수 항목이 누락됐습니다.' }, { status: 400 })
  }
  if (review_text.length < 20) {
    return NextResponse.json({ error: '리뷰를 20자 이상 입력해주세요.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_reviews')
    .insert([{ game_id, nickname, stars, review_text }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
