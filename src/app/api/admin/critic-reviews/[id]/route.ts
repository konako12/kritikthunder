import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { pickReviewFields } from '../validate'

const MIGRATION_HINT = '한줄평 · 숨김 칸이 아직 없어요. supabase/migrations/012_critic_review_verdict.sql을 먼저 실행해주세요.'

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
  const { data: current, error: findError } = await supabase.from('critic_reviews').select('*').eq('id', id).single()
  if (findError || !current) return NextResponse.json({ error: '리뷰를 찾을 수 없어요' }, { status: 404 })

  // 한줄평 출처 규칙 (DB 트리거와 같은 규칙 — 먼저 알기 쉬운 안내로)
  if ('verdict' in fields!) {
    if (current.verdict_type === 'own') {
      return NextResponse.json({ error: '기자가 직접 쓴 한줄평은 수정할 수 없어요. 부적절하면 리뷰를 숨겨주세요.' }, { status: 403 })
    }
  }
  const nextUrl = 'source_url' in fields! ? fields!.source_url : current.source_url
  const nextType = 'verdict_type' in fields! ? fields!.verdict_type : current.verdict_type
  if (nextType === 'quote' && !nextUrl) {
    return NextResponse.json({ error: '원문 인용 문장이 있는 리뷰는 원문 링크가 있어야 해요' }, { status: 400 })
  }
  if (!nextUrl && !String(current.review_text ?? '').trim()) {
    return NextResponse.json({ error: '전문이 없는 리뷰라 원문 링크를 지울 수 없어요' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('critic_reviews')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const msg = /verdict|is_hidden|hidden_at/.test(error.message) && /column/.test(error.message) ? MIGRATION_HINT : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json(data)
}
