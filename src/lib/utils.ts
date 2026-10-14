/** 점수에 따른 색상 클래스 */
export function scoreClass(score: number | null): string {
  if (score === null) return 'score-tbd'
  if (score >= 90) return 'score-great'
  if (score >= 75) return 'score-good'
  return 'score-bad'
}

/** 별점 → 퍼센트 (0~100) */
export function starsToPercent(stars: number): number {
  return (stars / 5) * 100
}

/** 날짜 포맷 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 닉네임 첫 글자 */
export function initial(name: string): string {
  return name[0] ?? '?'
}

/** 원문 링크 검증 — 비어 있으면 통과, 아니면 http(s):// 주소만 허용 */
export function isValidSourceUrl(url: string): boolean {
  const v = url.trim()
  if (!v) return true
  if (!/^https?:\/\/\S+$/i.test(v)) return false
  try { new URL(v); return true } catch { return false }
}

/** 입력값 → DB 저장값 (빈 문자열은 null) */
export function normalizeSourceUrl(url: string | null | undefined): string | null {
  const v = (url ?? '').trim()
  return v ? v : null
}

/** 출처 도메인 (예: https://www.example.com/view.php → example.com) */
export function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** 원래 점수 표기 최대 길이 (예: "9.5/10", "A-") */
export const SCORE_DISPLAY_MAX = 12

/** 원래 점수 표기 입력값 → DB 저장값 (빈 문자열은 null) */
export function normalizeScoreDisplay(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

/** 화면 표시용 점수 — 원래 표기가 없으면 "96/100" */
export function scoreLabel(r: { score: number; score_display?: string | null }): string {
  return r.score_display?.trim() || `${r.score}/100`
}

/** 게임 검색 — 한국어 제목 · 원어 제목 둘 다로 찾기 (대소문자·공백 무시) */
export function gameTitleMatches(g: { title: string; title_original?: string | null }, query: string): boolean {
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '')
  const q = norm(query)
  if (!q) return true
  return norm(g.title).includes(q) || (!!g.title_original && norm(g.title_original).includes(q))
}

/** 출시일 표시 — 날짜가 있으면 2026.10.15, 없으면 2026년 */
export function formatReleaseDate(g: { release_date: string | null; year: number }): string {
  return g.release_date ? g.release_date.replaceAll('-', '.') : `${g.year}년`
}
