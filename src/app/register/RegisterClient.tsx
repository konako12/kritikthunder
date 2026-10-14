'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import s from './register.module.css'

export default function RegisterClient() {
  const [name, setName]             = useState('')
  const [media, setMedia]           = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [link1, setLink1]           = useState('')
  const [link2, setLink2]           = useState('')
  const [bio, setBio]               = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Supabase Auth 회원가입 (이메일 인증 발송)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('이미 가입된 이메일 주소입니다.')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError('회원가입 중 오류가 발생했습니다.')
        return
      }

      // 2. journalists 테이블에 신청 등록 (서버 API 경유)
      const articleLinks = [link1.trim(), link2.trim()].filter(Boolean)
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          media: media.trim(),
          email,
          article_links: articleLinks,
          bio: bio.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        // 이미 등록된 경우 Auth 계정이 만들어졌으니 안내만
        if (res.status === 409) {
          setError(data.error)
          return
        }
        setError(data.error ?? '신청 등록 중 오류가 발생했습니다.')
        return
      }

      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={s.page}>
        <div className={s.card}>
          <div className={s.logo}>KRIT<span>IK</span></div>
          <div className={s.success}>
            <span className={s.successIcon}>✉️</span>
            <strong>이메일을 확인해주세요!</strong>
            <br /><br />
            <strong>{email}</strong>으로 인증 메일이 발송됐습니다.
            <br />
            이메일 인증 후 관리자 심사가 진행됩니다.
            <br /><br />
            심사 결과는 로그인 시 안내됩니다.
          </div>
          <div className={s.footer}>
            <Link href="/login">로그인 페이지로 돌아가기</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>KRIT<span>IK</span></div>
        <div className={s.subtitle}>기자 가입 신청</div>

        <form className={s.form} onSubmit={handleSubmit}>
          <div className={s.sectionLabel}>기본 정보</div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>이름</label>
              <input
                className={s.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                required
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>소속 매체</label>
              <input
                className={s.input}
                type="text"
                value={media}
                onChange={(e) => setMedia(e.target.value)}
                placeholder="소속 매체명을 입력하세요"
                required
              />
            </div>
          </div>

          <hr className={s.divider} />
          <div className={s.sectionLabel}>계정 정보</div>

          <div className={s.field}>
            <label className={s.label}>이메일</label>
            <input
              className={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="journalist@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>비밀번호</label>
              <input
                className={s.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                required
                autoComplete="new-password"
              />
            </div>
            <div className={s.field}>
              <label className={s.label}>비밀번호 확인</label>
              <input
                className={s.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••"
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <hr className={s.divider} />
          <div className={s.sectionLabel}>심사 자료</div>

          <div className={s.field}>
            <label className={s.labelOptional}>기사 링크 1</label>
            <input
              className={s.input}
              type="url"
              value={link1}
              onChange={(e) => setLink1(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className={s.field}>
            <label className={s.labelOptional}>기사 링크 2</label>
            <input
              className={s.input}
              type="url"
              value={link2}
              onChange={(e) => setLink2(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className={s.field}>
            <label className={s.labelOptional}>자기소개</label>
            <textarea
              className={s.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="경력, 전문 분야 등을 간략히 소개해주세요."
              rows={3}
            />
          </div>

          {error && <div className={s.error}>{error}</div>}

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? '신청 중...' : '가입 신청하기'}
          </button>
        </form>

        <div className={s.footer}>
          이미 계정이 있나요? <Link href="/login">로그인</Link>
        </div>
      </div>
    </div>
  )
}
