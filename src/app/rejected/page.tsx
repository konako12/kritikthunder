export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import StatusCard from '@/components/auth-status/StatusCard'
import LogoutButton from '@/components/auth-status/LogoutButton'
import { currentStatus, DESTINATION_LABEL } from '@/components/auth-status/current'
import s from '@/components/auth-status/status.module.css'

export const metadata: Metadata = { title: '가입 신청 결과 | KRITIK' }

/** 가입 거절 안내 — 로그인 검사로 다른 곳에 보내지 않음 */
export default async function RejectedPage() {
  const { loggedIn, destination } = await currentStatus()
  // 문의 받을 주소 (서버 환경변수, 선택) — 비어 있으면 일반 안내만
  const contact = process.env.CONTACT_EMAIL?.trim()

  return (
    <StatusCard icon="✗" title="가입 신청이 승인되지 않았어요">
      <p className={s.desc}>
        아쉽게도 이번 심사에서는 기자 가입이 승인되지 않았어요.<br />
        {contact ? (
          <>심사 결과에 대한 문의는 <a href={`mailto:${contact}`}>{contact}</a>로 보내주세요.</>
        ) : (
          <>심사 결과에 대한 문의는 사이트 운영자에게 이메일로 보내주세요.</>
        )}
      </p>

      <div className={s.actions}>
        {loggedIn && destination && destination !== '/rejected' && (
          <Link href={destination} className={s.btn}>{DESTINATION_LABEL[destination]}</Link>
        )}
        <Link href="/" className={s.btnGhost}>메인으로 가기</Link>
        {loggedIn && <LogoutButton />}
      </div>
    </StatusCard>
  )
}
