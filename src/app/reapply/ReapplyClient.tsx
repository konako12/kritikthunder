'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APPLY_LIMITS, validateApplication } from '@/lib/journalist-review'
import s from '../register/register.module.css'

interface Props {
  initial: { name: string; media: string; email: string; article_links: string[]; bio: string }
  reason: string | null
  applyCount: number
  /** 아직 재신청할 수 없으면 가능한 날짜 ("10월 17일"), 가능하면 null */
  availableLabel: string | null
}

export default function ReapplyClient({ initial, reason, applyCount, availableLabel }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [media, setMedia] = useState(initial.media)
  const [link1, setLink1] = useState(initial.article_links[0] ?? '')
  const [link2, setLink2] = useState(initial.article_links[1] ?? '')
  const [bio, setBio] = useState(initial.bio)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name: name.trim(),
      media: media.trim(),
      article_links: [link1.trim(), link2.trim()].filter(Boolean),
      bio: bio.trim() || null,
    }
    const invalid = validateApplication(body)
    if (invalid) { setError(invalid); return }

    setError('')
    setLoading(true)
    const res = await fetch('/api/reapply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error ?? '재신청을 처리하지 못했어요.'); return }

    router.replace('/pending')
    router.refresh()
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>KRIT<span>IK</span></div>
        <div className={s.subtitle}>기자 가입 재신청 · {applyCount + 1}회차</div>

        {/* 무엇을 보완할지 — 거절 사유를 맨 위에 */}
        <div className={s.reasonBox}>
          <div className={s.reasonLabel}>이전 신청 거절 사유</div>
          <div className={s.reasonText}>{reason || '거절 사유가 기록되어 있지 않아요.'}</div>
          <div className={s.reasonHint}>위 내용을 참고해 신청 정보를 보완해주세요.</div>
        </div>

        {availableLabel ? (
          <div className={s.form}>
            <div className={s.notice}>
              <strong>{availableLabel}부터 재신청할 수 있어요.</strong>
              <br />
              거절 후 3일이 지나야 다시 신청할 수 있어요.
            </div>
            <Link href="/rejected" className={s.btnSecondary}>돌아가기</Link>
          </div>
        ) : (
          <form className={s.form} onSubmit={handleSubmit}>
            <div className={s.sectionLabel}>기본 정보</div>
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label}>이름</label>
                <input className={s.input} value={name} maxLength={APPLY_LIMITS.name}
                  onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" required />
              </div>
              <div className={s.field}>
                <label className={s.label}>소속 매체</label>
                <input className={s.input} value={media} maxLength={APPLY_LIMITS.media}
                  onChange={(e) => setMedia(e.target.value)} placeholder="소속 매체명을 입력하세요" required />
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>이메일 (변경 불가)</label>
              <input className={s.input} type="email" value={initial.email} disabled readOnly />
            </div>

            <hr className={s.divider} />
            <div className={s.sectionLabel}>심사 자료</div>
            <div className={s.field}>
              <label className={s.labelOptional}>기사 링크 1</label>
              <input className={s.input} type="url" value={link1} onChange={(e) => setLink1(e.target.value)} placeholder="https://..." />
            </div>
            <div className={s.field}>
              <label className={s.labelOptional}>기사 링크 2</label>
              <input className={s.input} type="url" value={link2} onChange={(e) => setLink2(e.target.value)} placeholder="https://..." />
            </div>
            <div className={s.field}>
              <label className={s.labelOptional}>자기소개</label>
              <textarea className={s.textarea} value={bio} rows={3} maxLength={APPLY_LIMITS.bio}
                onChange={(e) => setBio(e.target.value)} placeholder="경력, 전문 분야 등을 간략히 소개해주세요." />
            </div>

            {error && <div className={s.error}>{error}</div>}

            <button className={s.btn} type="submit" disabled={loading}>
              {loading ? '재신청 중...' : '재신청하기'}
            </button>
            <Link href="/rejected" className={s.btnSecondary}>취소</Link>
          </form>
        )}
      </div>
    </div>
  )
}
