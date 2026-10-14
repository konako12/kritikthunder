/** 기자 가입 심사 · 재신청 공용 규칙 (서버 · 클라이언트 모두 사용) */

/** 거절 후 재신청까지 기다리는 기간 (일) */
export const REAPPLY_WAIT_DAYS = 3

export const REJECTION_REASON_MAX = 500

/** 관리자 거절 창의 자주 쓰는 사유 */
export const REJECTION_REASON_PRESETS = [
  '기사 링크로 기자 활동 확인이 어려움',
  '소속 매체 확인 불가',
] as const

/** 신청서 입력 제한 — 가입 신청과 재신청 공통 */
export const APPLY_LIMITS = { name: 30, media: 50, bio: 1000, links: 2, link: 500 } as const

/** 한국 시간 기준 날짜 (YYYY-MM-DD) */
export function kstDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
}

/**
 * 재신청 가능 날짜 (한국 시간 YYYY-MM-DD) — 거절된 날 + 3일, 그날 0시부터 가능.
 * 거절 일시 기록이 없으면(이 기능 전에 거절된 경우) null = 바로 가능.
 */
export function reapplyAvailableDate(rejectedAt: string | null | undefined): string | null {
  if (!rejectedAt) return null
  const t = new Date(rejectedAt)
  if (Number.isNaN(t.getTime())) return null
  const [y, m, d] = kstDate(t).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + REAPPLY_WAIT_DAYS)).toISOString().slice(0, 10)
}

export function canReapply(rejectedAt: string | null | undefined, now = new Date()): boolean {
  const day = reapplyAvailableDate(rejectedAt)
  return !day || kstDate(now) >= day
}

/** 2026-10-17 → 10월 17일 */
export function koreanMonthDay(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}월 ${d}일`
}

/** 신청서 검증 — 문제가 있으면 안내 문구 */
export function validateApplication(v: { name: string; media: string; article_links: string[]; bio: string | null }): string | null {
  if (!v.name.trim()) return '이름을 입력해주세요.'
  if (!v.media.trim()) return '소속 매체를 입력해주세요.'
  if (v.name.trim().length > APPLY_LIMITS.name) return `이름은 ${APPLY_LIMITS.name}자 이내로 입력해주세요.`
  if (v.media.trim().length > APPLY_LIMITS.media) return `소속 매체는 ${APPLY_LIMITS.media}자 이내로 입력해주세요.`
  if ((v.bio ?? '').length > APPLY_LIMITS.bio) return `자기소개는 ${APPLY_LIMITS.bio}자 이내로 입력해주세요.`
  if (v.article_links.length > APPLY_LIMITS.links) return `기사 링크는 ${APPLY_LIMITS.links}개까지 입력할 수 있어요.`
  for (const l of v.article_links) {
    if (l.length > APPLY_LIMITS.link || !/^https?:\/\/\S+$/i.test(l)) return '기사 링크는 http:// 또는 https://로 시작하는 주소여야 해요.'
  }
  return null
}
