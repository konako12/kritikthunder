'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

/**
 * 공개 페이지 푸터의 기자 메뉴 — 로그인 상태에 따라 다르게.
 * 판별은 서버의 이동 규칙(src/lib/auth-destination.ts)을 /api/auth/role로 받아 그대로 사용.
 * 색 · 크기는 각 페이지 푸터의 .pressLinks 스타일을 그대로 물려받는다.
 */

type Dest = '/login' | '/admin' | '/cms' | '/pending' | '/rejected' | '/no-access'

const MENU: Record<Dest, { href: string; label: string }[]> = {
  '/login':     [{ href: '/login', label: '기자 로그인' }, { href: '/register', label: '기자 가입 신청' }],
  '/admin':     [{ href: '/admin', label: '관리자 페이지' }],
  '/cms':       [{ href: '/cms', label: '리뷰 작성' }],
  '/pending':   [{ href: '/pending', label: '심사 현황' }],
  '/rejected':  [{ href: '/reapply', label: '재신청하기' }],
  '/no-access': [{ href: '/no-access', label: '계정 안내' }],
}

const linkButton: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer',
}

export default function AccountLinks() {
  const router = useRouter()
  const [dest, setDest] = useState<Dest | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/auth/role')
      .then((r) => r.json())
      .then((d) => { if (alive) setDest((d.destination as Dest) in MENU ? d.destination : '/login') })
      .catch(() => { if (alive) setDest('/login') })
    return () => { alive = false }
  }, [])

  async function logout() {
    await createClient().auth.signOut()
    setDest('/login')
    router.refresh()
  }

  // 확인 전에는 자리만 차지 (로그아웃 메뉴가 잠깐 보였다 바뀌는 깜빡임 방지)
  if (!dest) return <span aria-hidden style={{ visibility: 'hidden' }}>기자 로그인 · 기자 가입 신청</span>

  const items = MENU[dest]
  return (
    <>
      {items.map((m, i) => (
        <Fragment key={m.href}>
          {i > 0 && ' · '}
          <Link href={m.href}>{m.label}</Link>
        </Fragment>
      ))}
      {dest !== '/login' && (
        <>
          {' · '}
          <a role="button" style={linkButton} onClick={logout}>로그아웃</a>
        </>
      )}
    </>
  )
}
