import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// POST /api/critic-reviews — 기자 리뷰 등록 (CMS)
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('critic_reviews')
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // journalist review_count 증가
  if (body.journalist_id) {
    await supabase.rpc('increment_review_count', { jid: body.journalist_id })
  }

  return NextResponse.json(data, { status: 201 })
}
