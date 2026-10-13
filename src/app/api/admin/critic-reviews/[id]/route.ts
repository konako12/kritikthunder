import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { pickReviewFields } from '../validate'

// PATCH /api/admin/critic-reviews/:id — 리뷰 수정 (보낸 필드만)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { fields, error: invalid } = pickReviewFields(await req.json(), { partial: true })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  if (!Object.keys(fields!).length) return NextResponse.json({ error: '수정할 내용이 없어요' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('critic_reviews')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
