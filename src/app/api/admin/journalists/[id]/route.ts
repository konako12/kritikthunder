import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendApprovalMail, sendRejectionMail } from '@/lib/journalist-mail'
import type { MailResult } from '@/lib/mailer'

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
  const { status } = await req.json().catch(() => ({ status: null }))
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: '상태 값이 올바르지 않아요' }, { status: 400 })
  }

  // 같은 상태로 다시 바꾸면 메일을 또 보내지 않도록 이전 상태 확인
  const { data: before } = await supabase.from('journalists').select('status').eq('id', id).single()

  const { data, error } = await supabase
    .from('journalists')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 심사 결과 안내 메일 — 승인·거절로 바뀐 경우에만 자동 발송.
  // 메일이 실패해도 상태 변경은 유지하고, 결과를 관리자 화면에 알려준다.
  let mail: MailResult | null = null
  if (before?.status !== status && (status === 'approved' || status === 'rejected')) {
    const applicant = { name: data.name, media: data.media, email: data.email }
    mail = status === 'approved'
      ? await sendApprovalMail(applicant, process.env.SITE_URL?.trim() || req.nextUrl.origin)
      : await sendRejectionMail(applicant, process.env.CONTACT_EMAIL?.trim())
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
