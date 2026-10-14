'use client'

import { useState } from 'react'
import type { CriticReview, Game } from '@/lib/types'
import { isValidSourceUrl, sourceDomain, SCORE_DISPLAY_MAX } from '@/lib/utils'
import { VERDICT_MAX, verdictError, verdictLength } from '@/lib/review-verdict'
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

const QUOTE_GUIDE = '원문 기사에서 기자가 쓴 문장을 그대로 복사해 넣으세요. 요약하거나 고쳐 쓰지 마세요'

export default function CriticReviewsPanel({ games, reviews, setReviews, showToast }: Props) {
  // 등록 폼
  const [gameId, setGameId]     = useState('')
  const [media, setMedia]       = useState('')
  const [reviewer, setReviewer] = useState('')
  const [score, setScore]       = useState('')
  const [scoreDisplay, setScoreDisplay] = useState('')
  const [quote, setQuote]       = useState('')
  const [url, setUrl]           = useState('')
  const [date, setDate]         = useState(today())
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)

  // 목록
  const [q, setQ] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [editId, setEditId]   = useState<number | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [quoteId, setQuoteId] = useState<number | null>(null)
  const [editQuote, setEditQuote] = useState('')

  const gameTitle = (id: number) => games.find((g) => g.id === id)?.title ?? `게임 #${id}`

  function resetForm() {
    setGameId(''); setMedia(''); setReviewer(''); setScore(''); setScoreDisplay('')
    setQuote(''); setUrl(''); setDate(today()); setErrors({})
  }

  async function addReview() {
    const e: Record<string, string> = {}
    const n = Number(score)
    if (!gameId) e.game = '게임을 선택해주세요'
    if (!media.trim()) e.media = '매체명을 입력해주세요'
    if (!reviewer.trim()) e.reviewer = '기자명을 입력해주세요'
    if (score === '' || !Number.isInteger(n) || n < 0 || n > 100) e.score = '0~100 사이 정수'
    const qErr = verdictError(quote, '원문 인용 문장')
    if (qErr) e.quote = qErr
    if (!url.trim()) e.url = '원문 기사 링크를 입력해주세요'
    else if (!isValidSourceUrl(url)) e.url = 'http:// 또는 https://로 시작해야 해요'
    if (!date) e.date = '게재일을 입력해주세요'
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    try {
      const data = await request('/api/admin/critic-reviews', 'POST', {
        game_id: Number(gameId), media, reviewer_name: reviewer, score: n, score_display: scoreDisplay,
        verdict: quote, source_url: url, published_at: date,
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

  async function patch(id: number, body: Record<string, unknown>, done: string) {
    try {
      const data = await request(`/api/admin/critic-reviews/${id}`, 'PATCH', body)
      setReviews(reviews.map((r) => (r.id === id ? data : r)))
      showToast(done)
      return true
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
      return false
    }
  }

  async function saveUrl(id: number) {
    if (!isValidSourceUrl(editUrl)) { showToast('⚠️ http:// 또는 https://로 시작하는 주소만 가능해요'); return }
    if (await patch(id, { source_url: editUrl }, editUrl.trim() ? '🔗 원문 링크가 저장됐어요' : '원문 링크를 삭제했어요')) setEditId(null)
  }

  async function saveQuote(id: number) {
    if (editQuote.trim()) {
      const err = verdictError(editQuote, '원문 인용 문장')
      if (err) { showToast(`⚠️ ${err}`); return }
    }
    if (await patch(id, { verdict: editQuote }, editQuote.trim() ? '❝ 원문 인용 문장이 저장됐어요' : '원문 인용 문장을 지웠어요')) setQuoteId(null)
  }

  function toggleHidden(r: CriticReview) {
    const hide = !r.is_hidden
    if (hide && !window.confirm(`"${gameTitle(r.game_id)}" ${r.media} 리뷰를 숨길까요?\n공개 화면과 점수 평균에서 빠지고, 기자는 CMS에서 숨김 상태를 볼 수 있어요.`)) return
    patch(r.id, { is_hidden: hide }, hide ? '🙈 리뷰를 숨겼어요' : '리뷰를 다시 공개했어요')
  }

  const query = q.trim().toLowerCase()
  const list = reviews
    .filter((r) => !onlyMissing || !r.verdict)
    .filter((r) => !query ||
      [gameTitle(r.game_id), r.media, r.reviewer_name].some((v) => v.toLowerCase().includes(query)))
  const missingCount = reviews.filter((r) => !r.verdict).length

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
              <input className={s.formInput} value={media} onChange={(e) => setMedia(e.target.value)} placeholder="매체명을 입력하세요" />
              {errors.media && <span className={s.formError}>{errors.media}</span>}
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>기자명 <span className={s.req}>*</span></label>
              <input className={s.formInput} value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="기자명을 입력하세요" />
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
              <label className={s.formLabel}>원래 점수 표기</label>
              <input className={s.formInput} value={scoreDisplay} maxLength={SCORE_DISPLAY_MAX}
                onChange={(e) => setScoreDisplay(e.target.value)} placeholder={`예) 9.5/10 · 비우면 ${score || '96'}/100`} />
            </div>
          </div>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>게재일 <span className={s.req}>*</span></label>
              <input className={s.formInput} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {errors.date && <span className={s.formError}>{errors.date}</span>}
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>
              원문 인용 문장 <span className={s.req}>*</span>
              <span className={`${s.verdictCount} ${verdictLength(quote) > VERDICT_MAX ? s.verdictCountOver : ''}`}>
                {verdictLength(quote)} / {VERDICT_MAX}
              </span>
            </label>
            <div className={s.quoteGuide}>{QUOTE_GUIDE}</div>
            <textarea className={`${s.formInput} ${s.formTextarea}`} style={{ minHeight: 70 }} value={quote}
              onChange={(e) => setQuote(e.target.value)} rows={2} placeholder="원문 기사에서 복사한 문장" />
            {errors.quote && <span className={s.formError}>{errors.quote}</span>}
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>원문 기사 링크 <span className={s.req}>*</span></label>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-sub-light)', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          한줄평 없는 리뷰만 ({missingCount})
        </label>
      </div>
      <div className={s.card}>
        <table className={s.table}>
          <thead><tr><th>게임</th><th>매체 / 기자</th><th>점수</th><th>한줄평</th><th>원문 링크</th><th>공개</th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6}><div className={s.emptyS}>등록된 리뷰가 없습니다</div></td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className={r.is_hidden ? s.rowHidden : ''}>
                <td>
                  <div className={s.gameName}>{gameTitle(r.game_id)}</div>
                  <div className={s.gameDev} style={{ fontFamily: "'DM Mono',monospace" }}>{r.published_at}</div>
                </td>
                <td>
                  <div className={s.gameName}>{r.media}</div>
                  <div className={s.gameDev}>{r.reviewer_name}</div>
                </td>
                <td><span className={`${s.chip} ${scoreChipClass(r.score)}`}>{r.score}</span>{r.score_display && <span className={s.gameDev} style={{ marginLeft: 6 }}>{r.score_display}</span>}</td>
                <td style={{ minWidth: 280, maxWidth: 380 }}>
                  {quoteId === r.id ? (
                    <div>
                      <div className={s.quoteGuide}>{QUOTE_GUIDE}</div>
                      <textarea className={`${s.formInput} ${s.formTextarea}`} style={{ minHeight: 60 }} rows={2} autoFocus
                        value={editQuote} onChange={(e) => setEditQuote(e.target.value)} placeholder="비우면 인용 삭제" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span className={`${s.verdictCount} ${verdictLength(editQuote) > VERDICT_MAX ? s.verdictCountOver : ''}`} style={{ marginLeft: 0 }}>
                          {verdictLength(editQuote)} / {VERDICT_MAX}
                        </span>
                        <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => saveQuote(r.id)}>저장</button>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setQuoteId(null)}>취소</button>
                      </div>
                    </div>
                  ) : r.verdict ? (
                    <div>
                      <span className={`${s.badge} ${r.verdict_type === 'own' ? s.bGreen : s.bBlue}`} style={{ textTransform: 'none' }}>
                        {r.verdict_type === 'own' ? '기자 작성' : '원문 인용'}
                      </span>
                      <div className={r.verdict_type === 'quote' ? s.verdictQuote : s.verdictOwn}>{r.verdict}</div>
                      {r.verdict_type === 'quote' && (
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginTop: 4 }}
                          onClick={() => { setQuoteId(r.id); setEditQuote(r.verdict ?? '') }}>인용 수정</button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`${s.badge} ${s.bOrange}`} style={{ textTransform: 'none' }}>한줄평 없음</span>
                      {r.source_url ? (
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                          onClick={() => { setQuoteId(r.id); setEditQuote('') }}>원문 인용 추가</button>
                      ) : (
                        <span className={s.gameDev}>원문 링크가 없어 기자가 CMS에서 작성해야 해요</span>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ minWidth: 240 }}>
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
                <td>
                  {r.is_hidden && <span className={`${s.badge} ${s.bGray}`} style={{ display: 'block', marginBottom: 4, textAlign: 'center' }}>숨김</span>}
                  <button className={`${s.btn} ${r.is_hidden ? s.btnGhost : s.btnDanger} ${s.btnSm}`} onClick={() => toggleHidden(r)}>
                    {r.is_hidden ? '다시 공개' : '숨기기'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
