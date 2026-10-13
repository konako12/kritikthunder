'use client'

import { useState } from 'react'
import type { CriticReview, Game } from '@/lib/types'
import { isValidSourceUrl, sourceDomain } from '@/lib/utils'
import s from './admin.module.css'

interface Props {
  games: Game[]
  reviews: CriticReview[]
  setReviews: (r: CriticReview[]) => void
  showToast: (msg: string) => void
}

function scoreChipClass(score: number) {
  if (score >= 90) return s.chipG
  if (score >= 75) return s.chipY
  return s.chipR
}

async function request(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '오류가 발생했습니다')
  return data
}

const today = () => new Date().toISOString().slice(0, 10)

export default function CriticReviewsPanel({ games, reviews, setReviews, showToast }: Props) {
  // 등록 폼
  const [gameId, setGameId]     = useState('')
  const [media, setMedia]       = useState('')
  const [reviewer, setReviewer] = useState('')
  const [score, setScore]       = useState('')
  const [summary, setSummary]   = useState('')
  const [url, setUrl]           = useState('')
  const [date, setDate]         = useState(today())
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)

  // 목록
  const [q, setQ] = useState('')
  const [editId, setEditId]   = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')

  const gameTitle = (id: number) => games.find((g) => g.id === id)?.title ?? `게임 #${id}`

  function resetForm() {
    setGameId(''); setMedia(''); setReviewer(''); setScore('')
    setSummary(''); setUrl(''); setDate(today()); setErrors({})
  }

  async function addReview() {
    const e: Record<string, string> = {}
    const n = Number(score)
    if (!gameId) e.game = '게임을 선택해주세요'
    if (!media.trim()) e.media = '매체명을 입력해주세요'
    if (!reviewer.trim()) e.reviewer = '기자명을 입력해주세요'
    if (score === '' || !Number.isInteger(n) || n < 0 || n > 100) e.score = '0~100 사이 정수'
    if (!summary.trim()) e.summary = '요약을 입력해주세요'
    if (!isValidSourceUrl(url)) e.url = 'http:// 또는 https://로 시작해야 해요'
    if (!date) e.date = '게재일을 입력해주세요'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    try {
      const data = await request('/api/admin/critic-reviews', 'POST', {
        game_id: Number(gameId), media, reviewer_name: reviewer, score: n,
        review_text: summary, source_url: url, published_at: date,
      })
      setReviews([data, ...reviews])
      showToast(`✅ "${gameTitle(data.game_id)}" ${data.media} 리뷰가 등록됐어요`)
      resetForm()
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  async function saveUrl(id: number) {
    if (!isValidSourceUrl(editUrl)) { showToast('⚠️ http:// 또는 https://로 시작하는 주소만 가능해요'); return }
    try {
      const data = await request(`/api/admin/critic-reviews/${id}`, 'PATCH', { source_url: editUrl })
      setReviews(reviews.map((r) => (r.id === id ? data : r)))
      setEditId(null)
      showToast(data.source_url ? '🔗 원문 링크가 저장됐어요' : '원문 링크를 삭제했어요')
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
    }
  }

  const query = q.trim().toLowerCase()
  const list = query
    ? reviews.filter((r) =>
        [gameTitle(r.game_id), r.media, r.reviewer_name].some((v) => v.toLowerCase().includes(query)))
    : reviews

  return (
    <div>
      {/* ── 외부 리뷰 등록 ── */}
      <div className={s.card} style={{ maxWidth: 720, marginBottom: '1.5rem' }}>
        <div className={s.cardHead}><span className={s.cardTitle}>외부 매체 리뷰 등록</span></div>
        <div className={s.cardBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>게임 <span className={s.req}>*</span></label>
            <select className={s.formSelect} value={gameId} onChange={(e) => setGameId(e.target.value)}>
              <option value="">게임 선택...</option>
              {[...games].sort((a, b) => a.title.localeCompare(b.title)).map((g) => (
                <option key={g.id} value={g.id}>{g.title} ({g.year})</option>
              ))}
            </select>
            {errors.game && <span className={s.formError}>{errors.game}</span>}
          </div>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>매체명 <span className={s.req}>*</span></label>
              <input className={s.formInput} value={media} onChange={(e) => setMedia(e.target.value)} placeholder="예) 게임메카" />
              {errors.media && <span className={s.formError}>{errors.media}</span>}
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>기자명 <span className={s.req}>*</span></label>
              <input className={s.formInput} value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="예) 홍길동" />
              {errors.reviewer && <span className={s.formError}>{errors.reviewer}</span>}
            </div>
          </div>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>점수 (0–100) <span className={s.req}>*</span></label>
              <input className={s.formInput} type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="예) 88" />
              {errors.score && <span className={s.formError}>{errors.score}</span>}
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>게재일 <span className={s.req}>*</span></label>
              <input className={s.formInput} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {errors.date && <span className={s.formError}>{errors.date}</span>}
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>요약 <span className={s.req}>*</span></label>
            <textarea className={`${s.formInput} ${s.formTextarea}`} value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="리뷰 핵심 내용을 요약해주세요..." />
            {errors.summary && <span className={s.formError}>{errors.summary}</span>}
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>원문 기사 링크</label>
            <input className={s.formInput} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            {errors.url && <span className={s.formError}>{errors.url}</span>}
          </div>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={addReview} disabled={saving}>
              {saving ? '등록 중...' : '리뷰 등록하기'}
            </button>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={resetForm}>초기화</button>
          </div>
        </div>
      </div>

      {/* ── 전체 리뷰 목록 ── */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <span className={s.searchIc}>🔍</span>
          <input className={s.formInput} type="text" placeholder="게임 · 매체 · 기자 검색..."
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className={s.card}>
        <table className={s.table}>
          <thead><tr><th>게임</th><th>매체 / 기자</th><th>점수</th><th>게재일</th><th>원문 링크</th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5}><div className={s.emptyS}>등록된 리뷰가 없습니다</div></td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id}>
                <td><div className={s.gameName}>{gameTitle(r.game_id)}</div></td>
                <td>
                  <div className={s.gameName}>{r.media}</div>
                  <div className={s.gameDev}>{r.reviewer_name}</div>
                </td>
                <td><span className={`${s.chip} ${scoreChipClass(r.score)}`}>{r.score}</span></td>
                <td><span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.78rem' }}>{r.published_at}</span></td>
                <td style={{ minWidth: 260 }}>
                  {editId === r.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input className={s.formInput} type="url" value={editUrl} autoFocus
                        onChange={(e) => setEditUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveUrl(r.id)}
                        placeholder="https://... (비우면 삭제)" />
                      <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => saveUrl(r.id)}>저장</button>
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setEditId(null)}>취소</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--blue)' }}>
                          {sourceDomain(r.source_url)} ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted-light)' }}>없음</span>
                      )}
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginLeft: 'auto' }}
                        onClick={() => { setEditId(r.id); setEditUrl(r.source_url ?? '') }}>
                        {r.source_url ? '수정' : '추가'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
