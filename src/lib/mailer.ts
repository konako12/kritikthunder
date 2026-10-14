/**
 * 메일 발송 (Resend API — https://resend.com) · 서버 전용
 *
 * 환경변수
 *   RESEND_API_KEY : Resend API 키 (없으면 발송하지 않고 skipped로 알림)
 *   MAIL_FROM      : 보내는 사람 — 예) KRITIK <no-reply@내도메인>  (Resend에서 인증한 도메인이어야 함)
 *   CONTACT_EMAIL  : 받는 사람이 "답장"하면 갈 주소 (선택)
 */

export interface MailResult {
  sent: boolean
  /** 환경변수가 없어 보내지 않음 */
  skipped?: boolean
  error?: string
}

export async function sendMail(msg: { to: string; subject: string; html: string; text: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.MAIL_FROM?.trim()
  if (!key || !from) {
    return { sent: false, skipped: true, error: '메일 설정(RESEND_API_KEY, MAIL_FROM)이 없어 보내지 않았어요' }
  }

  const replyTo = process.env.CONTACT_EMAIL?.trim()
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(replyTo && { reply_to: replyTo }),
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[mailer] 발송 실패', res.status, body.slice(0, 300))
      const msg =
        res.status === 401 || res.status === 403 ? '메일 API 키나 보내는 주소(도메인 인증)를 확인해주세요'
        : res.status === 422 ? '보내는 주소나 받는 주소 형식이 올바르지 않아요'
        : res.status === 429 ? '메일 발송 한도를 넘었어요. 잠시 후 다시 시도해주세요'
        : `메일 서비스 오류 (HTTP ${res.status})`
      return { sent: false, error: msg }
    }
    return { sent: true }
  } catch (e) {
    console.error('[mailer] 요청 실패', (e as Error).name, (e as Error).message)
    return { sent: false, error: '메일 서비스에 연결하지 못했어요' }
  }
}

/** 메일 본문에 사용자 입력(이름·매체)을 넣을 때 HTML 이스케이프 */
export function escapeHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
