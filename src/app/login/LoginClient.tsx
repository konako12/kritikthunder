'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import s from './login.module.css'

export default function LoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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

    // 승인된 기자이면 /cms, 그 외(관리자 등)는 /admin
    const { data: journalist } = await supabase
      .from('journalists')
      .select('id')
      .eq('email', session.user.email!)
      .eq('status', 'approved')
      .maybeSingle()

    router.push(journalist ? '/cms' : '/admin')
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
          <div className={s.field}>
            <label className={s.label}>이메일</label>
            <input
              className={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
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
          </div>

          {error && <div className={s.error}>{error}</div>}

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
