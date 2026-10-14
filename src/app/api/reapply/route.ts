import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'
import { canReapply, koreanMonthDay, reapplyAvailableDate, validateApplication } from '@/lib/journalist-review'

/**
 * POST /api/reapply — 거절된 기자의 재신청 (서버에서만 처리)
 *
 * 다음을 모두 만족할 때만 status를 pending으로 바꾼다:
 *   1. 로그인한 사용자 본인의 기록 (세션의 이메일로 찾음 — 요청 본문의 id·email은 받지 않음)
 *   2. 현재 status = rejected
 *   3. 거절 후 대기 기간(3일)이 지남
 * 바꿀 수 있는 것은 이름 · 매체 · 기사 링크 · 자기소개뿐. status · 신청 횟수는 서버가 정한다.
 * approved로 바꾸는 것은 관리자 API(/api/admin/journalists/:id)만 가능.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 1. 본인 기록 — 세션 이메일 기준
  const { journalist } = await resolveDestination(user)
  if (!journalist) return NextResponse.json({ error: '가입 신청 기록이 없어요.' }, { status: 404 })

  // 2. 거절 상태만
  if (journalist.status !== 'rejected') {
    return NextResponse.json({ error: '거절된 신청만 재신청할 수 있어요.' }, { status: 409 })
  }

  // 3. 대기 기간
  if (!canReapply(journalist.rejected_at)) {
    const day = reapplyAvailableDate(journalist.rejected_at)!
    return NextResponse.json({ error: `${koreanMonthDay(day)}부터 재신청할 수 있어요.` }, { status: 409 })
  }

  // 입력값 — 허용한 칸만 골라 검증
  const body = await req.json().catch(() => ({}))
  const input = {
    name: String(body.name ?? '').trim(),
    media: String(body.media ?? '').trim(),
    article_links: (Array.isArray(body.article_links) ? body.article_links : [])
      .map((l: unknown) => String(l ?? '').trim()).filter(Boolean),
    bio: String(body.bio ?? '').trim() || null,
  }
  const invalid = validateApplication(input)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  // 상태가 그 사이 바뀌지 않았을 때만 갱신 (동시 요청 · 관리자 처리와 겹치는 경우 방지)
  const { data, error } = await createAdminClient()
    .from('journalists')
    .update({
      ...input,
      status: 'pending',
      apply_count: (journalist.apply_count ?? 1) + 1,
      last_applied_at: new Date().toISOString(),
      // rejection_reason · rejected_at은 기록용으로 그대로 둠 (관리자 화면에 "이전 거절 사유"로 표시)
    })
    .eq('id', journalist.id)
    .eq('status', 'rejected')
    .select('id, status, apply_count')
    .maybeSingle()

  if (error) {
    console.error('[reapply] 갱신 실패:', error.message)
    return NextResponse.json({ error: '재신청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: '신청 상태가 바뀌어 재신청할 수 없어요. 새로고침해주세요.' }, { status: 409 })

  return NextResponse.json({ ok: true, apply_count: data.apply_count })
}
