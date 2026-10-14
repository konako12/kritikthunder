'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '@/lib/auth-recovery'
import s from '../login/login.module.css'

interface Props {
  valid: boolean
  email: string
}

export default function ResetPasswordClient({ valid, email }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(!valid)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = validateNewPassword(password, confirm)
    if (invalid) { setError(invalid); return }

    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirm }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      if (data.expired) { setExpired(true); return }
      setError(data.error ?? '비밀번호를 변경하지 못했어요.')
      return
    }

    router.replace('/login?notice=reset_done')
    router.refresh()
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          KRIT<span>IK</span>
        </div>
        <div className={s.subtitle}>비밀번호 재설정</div>

        {expired ? (
          <div className={s.form}>
            <div className={s.error}>
              <strong>링크가 만료됐거나 올바르지 않아요.</strong>
              <br />
              재설정 링크는 한 번만 사용할 수 있고, 일정 시간이 지나면 만료돼요.
              새 링크를 다시 요청해주세요.
            </div>
            <Link href="/forgot-password" className={`${s.btn} ${s.btnLink}`}>
              다시 요청하기
            </Link>
          </div>
        ) : (
          <>
            <p className={s.desc}>
              <strong>{email}</strong> 계정의
              <br />
              새 비밀번호를 입력해주세요.
            </p>
            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.field}>
                <label className={s.label}>새 비밀번호</label>
                <input
                  className={s.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
                  required
                  autoFocus
                  autoComplete="new-password"
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>새 비밀번호 확인</label>
                <input
                  className={s.input}
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="한 번 더 입력하세요"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <div className={s.error}>{error}</div>}

              <button className={s.btn} type="submit" disabled={loading}>
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </>
        )}

        <div className={s.footer}>
          <Link href="/login">로그인 페이지로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
