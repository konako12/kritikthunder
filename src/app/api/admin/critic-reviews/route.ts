import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { pickReviewFields } from './validate'

// POST /api/admin/critic-reviews — 외부 매체 리뷰 등록 (원문 인용 문장 + 원문 링크 필수)
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { fields, error: invalid } = pickReviewFields(await req.json(), { partial: false })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('critic_reviews')
    .insert([fields])
    .select()
    .single()

  if (error) {
    const msg = /verdict/.test(error.message) && /column/.test(error.message)
      ? '한줄평 칸이 아직 없어요. supabase/migrations/012_critic_review_verdict.sql을 먼저 실행해주세요.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data, { status: 201 })
}
