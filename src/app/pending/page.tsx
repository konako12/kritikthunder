export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import StatusCard from '@/components/auth-status/StatusCard'
import LogoutButton from '@/components/auth-status/LogoutButton'
import { currentStatus, DESTINATION_LABEL } from '@/components/auth-status/current'
import { kstDate } from '@/lib/journalist-review'
import s from '@/components/auth-status/status.module.css'

export const metadata: Metadata = { title: '가입 심사 중 | KRITIK' }

/** 승인 대기 안내 — 로그인 검사로 다른 곳에 보내지 않음 (무한 이동 방지) */
export default async function PendingPage() {
  const { loggedIn, destination, journalist } = await currentStatus()
  const isPending = journalist?.status === 'pending'

  return (
    <StatusCard icon="⏳" title={isPending || !loggedIn ? '가입 신청이 접수되어 심사 중입니다' : '심사 중인 신청이 없어요'}>
      {isPending ? (
        <>
          <div className={s.info}>
            <div className={s.infoRow}><span>이름</span><span>{journalist!.name}</span></div>
            <div className={s.infoRow}><span>소속 매체</span><span>{journalist!.media}</span></div>
            <div className={s.infoRow}><span>신청일</span><span>{(journalist!.last_applied_at ? kstDate(new Date(journalist!.last_applied_at)) : journalist!.joined_at)?.replaceAll('-', '.')}</span></div>
            {(journalist!.apply_count ?? 1) > 1 && (
              <div className={s.infoRow}><span>신청 횟수</span><span>재신청 ({journalist!.apply_count}회차)</span></div>
            )}
          </div>
          <p className={s.desc}>
            심사 결과는 이메일로 안내드려요.<br />
            심사는 영업일 기준 1~3일 정도 걸릴 수 있어요.
          </p>
        </>
      ) : loggedIn ? (
        <p className={s.desc}>이 계정으로 접수된 가입 신청이 심사 중이 아니에요.</p>
      ) : (
        <p className={s.desc}>로그인하면 신청한 내용과 심사 상태를 확인할 수 있어요.</p>
      )}

      <div className={s.actions}>
        {loggedIn && destination && destination !== '/pending' && (
          <Link href={destination} className={s.btn}>{DESTINATION_LABEL[destination]}</Link>
        )}
        {!loggedIn && <Link href="/login" className={s.btn}>로그인</Link>}
        <Link href="/" className={s.btnGhost}>메인으로 가기</Link>
        {loggedIn && <LogoutButton />}
      </div>
    </StatusCard>
  )
}
