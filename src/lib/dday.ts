/**
 * 출시 D-day — 날짜 계산은 모두 한국 시간(Asia/Seoul) 기준
 */

/** D-day 박스를 보여주는 기간 (오늘부터 n일 이내) */
export const DDAY_WINDOW = 15

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export function todayKst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now)
}

/** YYYY-MM-DD 두 날짜 사이 일수 (to - from) */
export function daysBetween(from: string, to: string): number {
  const ms = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

/**
 * "D-15" ~ "D-1", 출시 당일 "D-DAY".
 * 정확한 출시일이 없거나(연도만), 이미 지났거나, 15일보다 멀면 null
 */
export function ddayLabel(releaseDate: string | null | undefined, today = todayKst()): string | null {
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return null
  const n = daysBetween(today, releaseDate)
  if (n < 0 || n > DDAY_WINDOW) return null
  return n === 0 ? 'D-DAY' : `D-${n}`
}

/** 아직 출시 전인지 — 날짜가 있으면 오늘 포함 이후, 연도만 있으면 올해 포함 이후 */
export function isNotYetReleased(g: { release_date: string | null; year: number }, today = todayKst()): boolean {
  return g.release_date ? g.release_date >= today : g.year >= Number(today.slice(0, 4))
}
