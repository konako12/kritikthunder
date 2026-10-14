import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendApprovalMail, sendRejectionMail } from '@/lib/journalist-mail'
import type { MailResult } from '@/lib/mailer'
import { REJECTION_REASON_MAX } from '@/lib/journalist-review'

const STATUSES = ['pending', 'approved', 'rejected']

// PATCH /api/admin/journalists/:id — 승인/거절 (+ 결과 안내 메일 자동 발송)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { status, rejection_reason } = await req.json().catch(() => ({ status: null }))
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: '상태 값이 올바르지 않아요' }, { status: 400 })
  }
  // 거절할 때는 사유 필수 — 거절 메일 · /rejected 페이지 · 재신청 화면에 보여줌
  const reason = String(rejection_reason ?? '').trim()
  if (status === 'rejected') {
    if (!reason) return NextResponse.json({ error: '거절 사유를 입력해주세요' }, { status: 400 })
    if (reason.length > REJECTION_REASON_MAX) {
      return NextResponse.json({ error: `거절 사유는 ${REJECTION_REASON_MAX}자 이내로 입력해주세요` }, { status: 400 })
    }
  }

  // 같은 상태로 다시 바꾸면 메일을 또 보내지 않도록 이전 상태 확인
  const { data: before } = await supabase.from('journalists').select('status').eq('id', id).single()

  const { data, error } = await supabase
    .from('journalists')
    // 거절: 사유 · 일시 기록 / 승인: 이전 거절 사유는 기록용으로 그대로 둠
    .update(status === 'rejected' ? { status, rejection_reason: reason, rejected_at: new Date().toISOString() } : { status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 심사 결과 안내 메일 — 승인·거절로 바뀐 경우에만 자동 발송.
  // 메일이 실패해도 상태 변경은 유지하고, 결과를 관리자 화면에 알려준다.
  let mail: MailResult | null = null
  if (before?.status !== status && (status === 'approved' || status === 'rejected')) {
    const applicant = { name: data.name, media: data.media, email: data.email }
    const siteUrl = process.env.SITE_URL?.trim() || req.nextUrl.origin
    mail = status === 'approved'
      ? await sendApprovalMail(applicant, siteUrl)
      : await sendRejectionMail(applicant, {
          reason, rejectedAt: data.rejected_at, siteUrl, contactEmail: process.env.CONTACT_EMAIL?.trim(),
        })
  }

  return NextResponse.json({ ...data, mail })
}

// DELETE /api/admin/journalists/:id — 계정 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('journalists').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
