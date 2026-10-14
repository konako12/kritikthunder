import { escapeHtml, sendMail, type MailResult } from '@/lib/mailer'
import { koreanMonthDay, reapplyAvailableDate } from '@/lib/journalist-review'

/** 가입 심사 결과 안내 메일 — 관리자가 승인·거절했을 때 자동 발송 */

interface Applicant {
  name: string
  media: string
  email: string
}

function layout(title: string, bodyHtml: string): string {
  return `<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0f172a;">
  <div style="font-size:28px;font-weight:700;letter-spacing:0.04em;margin-bottom:24px;">KRIT<span style="color:#2563eb;">IK</span></div>
  <h2 style="font-size:18px;margin:0 0 16px;">${title}</h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
  <p style="font-size:12px;color:#94a3b8;margin:0;">KRITIK — 국내 게임 전문 평점 서비스</p>
</div>`
}

const p = (html: string, color = '#334155') =>
  `<p style="font-size:14px;line-height:1.7;color:${color};margin:0 0 16px;">${html}</p>`

export function sendApprovalMail(a: Applicant, siteUrl: string): Promise<MailResult> {
  const name = escapeHtml(a.name)
  const media = escapeHtml(a.media)
  const login = `${siteUrl}/login`
  return sendMail({
    to: a.email,
    subject: '[KRITIK] 기자 가입이 승인됐어요',
    html: layout('기자 가입 승인 안내', [
      p(`안녕하세요, <strong>${name}</strong> 기자님 (${media}).`),
      p('KRITIK 기자 가입 신청이 <strong>승인</strong>됐어요.<br />이제 로그인해서 리뷰를 작성할 수 있어요.'),
      `<p style="margin:0 0 16px;"><a href="${login}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">로그인하고 리뷰 쓰기</a></p>`,
      p('가입 신청 때 등록한 이메일과 비밀번호로 로그인하세요.', '#64748b'),
    ].join('\n')),
    text: `안녕하세요, ${a.name} 기자님 (${a.media}).\n\nKRITIK 기자 가입 신청이 승인됐어요.\n이제 로그인해서 리뷰를 작성할 수 있어요.\n\n로그인: ${login}\n`,
  })
}

export function sendRejectionMail(
  a: Applicant,
  opts: { reason: string; rejectedAt: string | null; siteUrl: string; contactEmail?: string },
): Promise<MailResult> {
  const { reason, rejectedAt, siteUrl, contactEmail } = opts
  const name = escapeHtml(a.name)
  const day = reapplyAvailableDate(rejectedAt)
  const reapplyText = day
    ? `${koreanMonthDay(day)}부터 로그인해서 내용을 보완해 재신청할 수 있어요.`
    : '로그인해서 내용을 보완해 재신청할 수 있어요.'
  const login = `${siteUrl}/login`
  const contact = contactEmail
    ? `심사 결과에 대한 문의는 <a href="mailto:${escapeHtml(contactEmail)}" style="color:#2563eb;">${escapeHtml(contactEmail)}</a>로 보내주시거나 이 메일에 답장해주세요.`
    : '심사 결과에 대한 문의는 이 메일에 답장해주세요.'
  return sendMail({
    to: a.email,
    subject: '[KRITIK] 기자 가입 신청 결과 안내',
    html: layout('기자 가입 신청 결과 안내', [
      p(`안녕하세요, <strong>${name}</strong> 님.`),
      p('KRITIK 기자 가입에 관심을 가져주셔서 감사합니다.<br />아쉽게도 이번 심사에서는 가입이 <strong>승인되지 않았어요</strong>.'),
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:0 0 16px;font-size:14px;line-height:1.6;color:#0f172a;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">거절 사유</div>${escapeHtml(reason).replace(/\n/g, '<br />')}</div>`,
      p(`${reapplyText} <a href="${login}" style="color:#2563eb;">로그인하기</a>`),
      p(contact, '#64748b'),
    ].join('\n')),
    text: `안녕하세요, ${a.name} 님.\n\nKRITIK 기자 가입에 관심을 가져주셔서 감사합니다.\n아쉽게도 이번 심사에서는 가입이 승인되지 않았어요.\n\n거절 사유: ${reason}\n\n${reapplyText}\n로그인: ${login}\n\n${
      contactEmail ? `문의: ${contactEmail}` : '문의는 이 메일에 답장해주세요.'
    }\n`,
  })
}
