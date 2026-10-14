export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import StatusCard from '@/components/auth-status/StatusCard'
import LogoutButton from '@/components/auth-status/LogoutButton'
import { currentStatus, DESTINATION_LABEL } from '@/components/auth-status/current'
import s from '@/components/auth-status/status.module.css'

export const metadata: Metadata = { title: '접근 권한 없음 | KRITIK' }

/** 관리자도 기자도 아닌 계정 안내 — 로그인 검사로 다른 곳에 보내지 않음 */
export default async function NoAccessPage() {
  const { loggedIn, destination } = await currentStatus()

  return (
    <StatusCard icon="🔒" title="접근 권한이 없어요">
      <p className={s.desc}>
        이 계정은 관리자나 기자로 등록되어 있지 않아요.<br />
        기자로 활동하려면 로그아웃한 뒤 <Link href="/register">기자 가입 신청</Link>을 해주세요.
      </p>

      <div className={s.actions}>
        {loggedIn && destination && destination !== '/no-access' && (
          <Link href={destination} className={s.btn}>{DESTINATION_LABEL[destination]}</Link>
        )}
        <Link href="/" className={loggedIn && destination !== '/no-access' ? s.btnGhost : s.btn}>메인으로 가기</Link>
        {loggedIn && <LogoutButton />}
      </div>
    </StatusCard>
  )
}
