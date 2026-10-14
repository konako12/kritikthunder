import type { Game } from './types'

/**
 * 메인 히어로 배너 이미지 · 초점 위치 (SQL 011)
 * hero_focus: 'left' | 'center' | 'right' 또는 '0%' ~ '100%' — 이미지를 자를 때 남길 가로 위치
 */

export const HERO_FOCUS_PRESETS = [
  { value: 'left', label: '왼쪽', percent: 0 },
  { value: 'center', label: '가운데', percent: 50 },
  { value: 'right', label: '오른쪽', percent: 100 },
] as const

const PERCENT_RE = /^(100|[1-9]?[0-9])%$/

export function isValidHeroFocus(v: string | null | undefined): boolean {
  return !v || HERO_FOCUS_PRESETS.some((p) => p.value === v) || PERCENT_RE.test(v)
}

/** hero_focus → 가로 위치(0~100). 비었거나 잘못된 값은 가운데 */
export function heroFocusPercent(v: string | null | undefined): number {
  const preset = HERO_FOCUS_PRESETS.find((p) => p.value === v)
  if (preset) return preset.percent
  if (v && PERCENT_RE.test(v)) return Number(v.slice(0, -1))
  return 50
}

/** 히어로에 쓸 이미지 — 전용 이미지가 없으면 커버 */
export function heroImage(g: Pick<Game, 'hero_image_url' | 'cover_url'>): string | null {
  return g.hero_image_url || g.cover_url
}

/**
 * CSS object-position.
 * 전용 이미지는 세로 가운데, 커버(세로로 긴 이미지)로 대신할 때는 기존처럼 위쪽 20%를 남김.
 */
export function heroObjectPosition(g: Pick<Game, 'hero_image_url' | 'hero_focus'>): string {
  return `${heroFocusPercent(g.hero_focus)}% ${g.hero_image_url ? '50%' : '20%'}`
}
