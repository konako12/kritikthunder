'use client'

import type { Game } from '@/lib/types'
import { HERO_FOCUS_PRESETS, heroFocusPercent } from '@/lib/hero'
import s from './admin.module.css'

/**
 * 메인 히어로 배너 이미지 · 초점 위치 편집 (게임 수정 창, 메인 노출 설정에서 사용)
 * 파일은 저장할 때 부모가 업로드한다 — 여기서는 고른 파일과 미리보기만 들고 있음.
 */

export interface HeroDraft {
  /** 저장된(또는 직접 입력한) 이미지 URL */
  url: string | null
  focus: string | null
  /** 새로 고른 파일 — 저장할 때 업로드 */
  file: File | null
  /** 화면 미리보기용 (파일이면 blob URL) */
  preview: string
}

export function heroDraftFrom(g: Pick<Game, 'hero_image_url' | 'hero_focus'>): HeroDraft {
  return { url: g.hero_image_url ?? null, focus: g.hero_focus ?? null, file: null, preview: g.hero_image_url ?? '' }
}

/** 처음 상태에서 바뀌었는지 — 안 바뀌었으면 저장 요청에 넣지 않음 (SQL 011 실행 전에도 다른 칸 수정 가능) */
export function heroDraftChanged(d: HeroDraft, g: Pick<Game, 'hero_image_url' | 'hero_focus'>): boolean {
  return !!d.file || (d.url ?? null) !== (g.hero_image_url ?? null) || (d.focus ?? null) !== (g.hero_focus ?? null)
}

/** 저장 실패 메시지 — 컬럼이 아직 없으면 SQL 안내로 바꿔줌 */
export function heroSaveError(message: string): string {
  return /hero_(image_url|focus)/.test(message)
    ? '히어로 이미지 칸이 아직 없어요. supabase/migrations/011_game_hero_image.sql을 먼저 실행해주세요.'
    : message
}

const MAX_SIZE = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  draft: HeroDraft
  onChange: (d: HeroDraft) => void
  /** 전용 이미지가 없을 때 대신 쓰는 커버 */
  coverUrl: string | null
  title: string
  onError: (msg: string) => void
}

export default function HeroImageField({ draft, onChange, coverUrl, title, onError }: Props) {
  const src = draft.preview || coverUrl || ''
  const usingCover = !draft.preview
  const percent = heroFocusPercent(draft.focus)
  // 메인 페이지와 같은 규칙: 전용 이미지는 세로 가운데, 커버는 위쪽 20%
  const objectPosition = `${percent}% ${usingCover ? '20%' : '50%'}`

  function pickFile(file: File) {
    if (!TYPES.includes(file.type)) { onError('JPG, PNG, WebP 파일만 지원합니다.'); return }
    if (file.size > MAX_SIZE) { onError('파일 크기는 5MB 이하여야 합니다.'); return }
    onChange({ ...draft, file, preview: URL.createObjectURL(file) })
  }

  return (
    <div className={s.heroField}>
      {/* 미리보기 — PC(가로로 넓은 화면) · 모바일(세로 화면)에서 어떻게 잘리는지 */}
      <div className={s.heroPreviews}>
        <figure className={s.heroPrev}>
          <div className={s.heroPrevDesk}>
            {src && <img src={src} alt={`${title} 히어로 이미지 미리보기 (PC)`} style={{ objectPosition }} />}
            <div className={s.heroPrevShade} />
            <div className={s.heroPrevText}>
              <span className={s.heroPrevTitle}>{title || '게임 제목'}</span>
              <span className={s.heroPrevLine} /><span className={s.heroPrevLine} style={{ width: '70%' }} />
            </div>
          </div>
          <figcaption>PC</figcaption>
        </figure>
        <figure className={s.heroPrev}>
          <div className={s.heroPrevMobile}>
            {src && <img src={src} alt={`${title} 히어로 이미지 미리보기 (모바일)`} style={{ objectPosition }} />}
            <div className={s.heroPrevShadeMobile} />
          </div>
          <figcaption>모바일</figcaption>
        </figure>
      </div>
      <div className={s.uploadHint} style={{ marginTop: 0, marginBottom: '0.7rem' }}>
        {usingCover
          ? (coverUrl ? '히어로 전용 이미지가 없어 커버 이미지를 대신 쓰고 있어요.' : '이미지가 없어요.')
          : '왼쪽 아래는 글자 영역이라 어둡게 덮여요. 인물·배경은 오른쪽에 오도록 초점을 맞춰주세요.'}
      </div>

      {/* 초점 위치 */}
      <div className={s.heroFocusRow}>
        <span className={s.heroFocusLabel}>초점 위치</span>
        {HERO_FOCUS_PRESETS.map((p) => (
          <button key={p.value} type="button"
            className={`${s.heroFocusBtn} ${percent === p.percent ? s.heroFocusBtnOn : ''}`}
            onClick={() => onChange({ ...draft, focus: p.value === 'center' ? null : p.value })}>
            {p.label}
          </button>
        ))}
        <input type="range" min={0} max={100} step={5} value={percent} className={s.heroFocusRange}
          aria-label="초점 가로 위치 (%)"
          onChange={(e) => {
            const v = Number(e.target.value)
            const preset = HERO_FOCUS_PRESETS.find((p) => p.percent === v)
            onChange({ ...draft, focus: preset ? (preset.value === 'center' ? null : preset.value) : `${v}%` })
          }} />
        <span className={s.heroFocusVal}>{percent}%</span>
      </div>

      {/* 이미지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <label className={s.uploadBtn}>
          {draft.preview ? '이미지 바꾸기' : '히어로 이미지 업로드'}
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
        </label>
        {draft.preview && (
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
            onClick={() => onChange({ ...draft, url: null, file: null, preview: '' })}>
            전용 이미지 제거 (커버 사용)
          </button>
        )}
      </div>
      <div className={s.uploadHint}>가로 이미지 권장 (1920×1080 이상) · JPG, PNG, WebP · 최대 5MB</div>
      <div className={s.uploadOr}>또는 URL 직접 입력</div>
      <input className={s.formInput} value={draft.file ? '' : (draft.url ?? '')} disabled={!!draft.file}
        placeholder={draft.file ? '업로드할 파일을 골랐어요' : 'https://...'}
        onChange={(e) => onChange({ ...draft, url: e.target.value.trim() || null, file: null, preview: e.target.value.trim() })} />
    </div>
  )
}
