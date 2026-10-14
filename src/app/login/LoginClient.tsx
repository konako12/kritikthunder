'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import s from './login.module.css'

interface Props {
  notice?: string
  initialError?: string
}

export default function LoginClient({ notice = '', initialError = '' }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: session, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !session.user) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    // 서버에서 역할 판별
    const res = await fetch('/api/auth/role')
    const { role, status } = await res.json()

    if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'journalist' && status === 'approved') {
      router.push('/cms')
    } else if (role === 'journalist' && status === 'pending') {
      router.push('/pending')
    } else if (role === 'journalist' && status === 'rejected') {
      router.push('/rejected')
    } else {
      await supabase.auth.signOut()
      setError('접근 권한이 없습니다.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          KRIT<span>IK</span>
        </div>
        <div className={s.subtitle}>기자 · 관리자 로그인</div>

        <form className={s.form} onSubmit={handleSubmit}>
          {notice && !error && <div className={s.notice}>{notice}</div>}
          <div className={s.field}>
            <label className={s.label}>이메일</label>
            <input
              className={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="journalist@example.com"
              required
              autoFocus
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>비밀번호</label>
            <input
              className={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className={s.forgotRow}>
              <Link href="/forgot-password" className={s.forgotLink}>
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.82rem', color: '#64748b' }}>
          기자 계정이 없나요?{' '}
          <Link href="/register" style={{ color: '#2563eb', textDecoration: 'none' }}>
            가입 신청
          </Link>
        </div>
      </div>
    </div>
  )
}
