'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SETTING_KEYS, type CurationSettings } from '@/lib/curation'
import s from './admin.module.css'

export interface CollectionSummary {
  slug: string
  title: string
  size: number
  top3: string[]
}

interface Props {
  collections: CollectionSummary[]
  settings: CurationSettings
  showToast: (msg: string) => void
}

async function saveSetting(key: string, value: string) {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? '저장에 실패했어요')
}

export default function CollectionsPanel({ collections, settings, showToast }: Props) {
  const [hidden, setHidden] = useState<string[]>(settings.hidden)
  const [pinned, setPinned] = useState<string[]>(settings.pinned)
  const [minCritic, setMinCritic] = useState(String(settings.minCriticReviews))
  const [minUser, setMinUser] = useState(String(settings.minUserReviews))
  const [savingRules, setSavingRules] = useState(false)

  async function toggle(list: string[], setList: (v: string[]) => void, key: string, slug: string, on: string, off: string) {
    const next = list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug]
    try {
      await saveSetting(key, JSON.stringify(next))
      setList(next)
      showToast(next.includes(slug) ? on : off)
    } catch (e) { showToast(`⚠️ ${(e as Error).message}`) }
  }

  async function saveRules() {
    const c = Number(minCritic), u = Number(minUser)
    if (!Number.isInteger(c) || c < 1 || !Number.isInteger(u) || u < 1) { showToast('⚠️ 1 이상의 정수를 입력해주세요'); return }
    setSavingRules(true)
    try {
      await Promise.all([
        saveSetting(SETTING_KEYS.minCriticReviews, String(c)),
        saveSetting(SETTING_KEYS.minUserReviews, String(u)),
      ])
      // 기준이 바뀌면 컬렉션 구성이 달라지므로 새로 불러온다
      window.location.reload()
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`)
      setSavingRules(false)
    }
  }

  return (
    <div>
      {/* ── 기준 설정 ── */}
      <div className={s.card} style={{ maxWidth: 720, marginBottom: '1.5rem' }}>
        <div className={s.cardHead}><span className={s.cardTitle}>큐레이션 기준</span></div>
        <div className={s.cardBody}>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>최소 전문가 리뷰 수</label>
              <input className={s.formInput} type="number" min={1} value={minCritic} onChange={(e) => setMinCritic(e.target.value)} />
              <span className={s.uploadHint}>컬렉션 · 평론가 vs 유저 공통</span>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>최소 유저 리뷰 수</label>
              <input className={s.formInput} type="number" min={1} value={minUser} onChange={(e) => setMinUser(e.target.value)} />
              <span className={s.uploadHint}>평론가 vs 유저에만 적용</span>
            </div>
          </div>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={saveRules} disabled={savingRules}>
              {savingRules ? '저장 중...' : '기준 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* ── 컬렉션 목록 ── */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardTitle}>자동 생성된 컬렉션 ({collections.length})</span>
        </div>
        <table className={s.table}>
          <thead><tr><th>컬렉션</th><th>상위 3개</th><th>게임 수</th><th>상태</th><th>관리</th></tr></thead>
          <tbody>
            {collections.length === 0 && (
              <tr><td colSpan={5}><div className={s.emptyS}>조건에 맞는 컬렉션이 없습니다 (게임 3개 이상 필요)</div></td></tr>
            )}
            {collections.map((c) => {
              const isHidden = hidden.includes(c.slug)
              const pinIdx = pinned.indexOf(c.slug)
              return (
                <tr key={c.slug} style={isHidden ? { opacity: 0.5 } : undefined}>
                  <td>
                    <div className={s.gameName}>{c.title}</div>
                    <div className={s.gameDev}>/collections/{c.slug}</div>
                  </td>
                  <td><span style={{ fontSize: '0.75rem' }}>{c.top3.join(' · ')}</span></td>
                  <td><span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.78rem' }}>{c.size}</span></td>
                  <td>
                    {isHidden && <span className={`${s.badge} ${s.bGray}`}>숨김</span>}
                    {pinIdx >= 0 && <span className={`${s.badge} ${s.bGreen}`} style={{ marginLeft: 4 }}>메인 고정 {pinIdx + 1}</span>}
                    {!isHidden && pinIdx < 0 && <span className={`${s.badge} ${s.bBlue}`}>자동</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className={`${s.btn} ${pinIdx >= 0 ? s.btnPrimary : s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }}
                      disabled={isHidden}
                      onClick={() => toggle(pinned, setPinned, SETTING_KEYS.pinned, c.slug, `📌 "${c.title}"을 메인에 고정했어요`, '고정을 해제했어요')}>
                      {pinIdx >= 0 ? '고정 해제' : '메인 고정'}
                    </button>
                    <button className={`${s.btn} ${isHidden ? s.btnPrimary : s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }}
                      onClick={() => toggle(hidden, setHidden, SETTING_KEYS.hidden, c.slug, `🙈 "${c.title}"을 숨겼어요`, '다시 공개했어요')}>
                      {isHidden ? '공개' : '숨기기'}
                    </button>
                    {!isHidden && (
                      <Link href={`/collections/${c.slug}`} target="_blank" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>보기 ↗</Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
