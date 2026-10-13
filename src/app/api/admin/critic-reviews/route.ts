import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { pickReviewFields } from './validate'

// POST /api/admin/critic-reviews — 외부 매체 리뷰 직접 등록
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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
