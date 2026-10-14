'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import s from '../login/login.module.css'

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    // 가입 여부가 드러나지 않도록 결과(오류 포함)와 관계없이 같은 안내를 보여준다
    await supabase.auth
      .resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      .catch(() => null)

    setLoading(false)
    setSent(true)
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          KRIT<span>IK</span>
        </div>
        <div className={s.subtitle}>비밀번호 찾기</div>

        {sent ? (
          <div className={s.form}>
            <div className={s.notice}>
              <strong>메일을 보냈어요.</strong>
              <br />
              입력하신 주소로 가입된 계정이 있다면 비밀번호 재설정 링크가 담긴 메일이 도착해요.
              메일이 보이지 않으면 스팸함도 확인해주세요.
            </div>
            <Link href="/login" className={`${s.btn} ${s.btnLink}`}>
              로그인 페이지로
            </Link>
          </div>
        ) : (
          <>
            <p className={s.desc}>
              가입하신 이메일 주소를 입력하면
              <br />
              비밀번호를 다시 설정할 수 있는 링크를 보내드려요.
            </p>
            <form className={s.form} onSubmit={handleSubmit}>
              <div className={s.field}>
                <label className={s.label}>이메일</label>
                <input
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button className={s.btn} type="submit" disabled={loading}>
                {loading ? '보내는 중...' : '재설정 메일 받기'}
              </button>
            </form>
          </>
        )}

        <div className={s.footer}>
          비밀번호가 기억나셨나요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  )
}
