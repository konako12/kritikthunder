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
