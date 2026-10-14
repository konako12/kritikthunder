'use client'

import { useState } from 'react'
import { PASSWORD_MIN_LENGTH, validateNewPassword } from '@/lib/auth-recovery'
import s from './ChangePasswordForm.module.css'

/** 기자 CMS 프로필 · 관리자 계정 설정 공용 — 현재 비밀번호 확인 후 변경 */
export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess('')
    if (!current) { setError('현재 비밀번호를 입력해주세요.'); return }
    const invalid = validateNewPassword(next, confirm)
    if (invalid) { setError(invalid); return }
    if (current === next) { setError('현재 비밀번호와 다른 비밀번호를 입력해주세요.'); return }

    setError('')
    setSaving(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next, confirm }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) { setError(data.error ?? '비밀번호를 변경하지 못했어요.'); return }

    setCurrent(''); setNext(''); setConfirm('')
    setSuccess('비밀번호가 변경됐어요. 다음 로그인부터 새 비밀번호를 사용하세요.')
  }

  return (
    <form className={s.card} onSubmit={handleSubmit}>
      <div className={s.title}>비밀번호 변경</div>

      <div className={s.field}>
        <label className={s.label}>현재 비밀번호</label>
        <input
          className={s.input} type="password" value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="현재 비밀번호를 입력하세요"
          autoComplete="current-password"
        />
      </div>
      <div className={s.row}>
        <div className={s.field}>
          <label className={s.label}>새 비밀번호</label>
          <input
            className={s.input} type="password" value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={`${PASSWORD_MIN_LENGTH}자 이상`}
            autoComplete="new-password"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>새 비밀번호 확인</label>
          <input
            className={s.input} type="password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="한 번 더 입력하세요"
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && <div className={s.error}>{error}</div>}
      {success && <div className={s.success}>{success}</div>}

      <button className={s.btn} type="submit" disabled={saving}>
        {saving ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  )
}
