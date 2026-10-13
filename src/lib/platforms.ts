/** 필터 탭용 플랫폼 — value는 DB 저장값, label은 화면 표시 */
export const PLATFORM_TABS = [
  { value: 'PS5',    label: 'PS5' },
  { value: 'Xbox',   label: 'Xbox' },
  { value: 'PC',     label: 'PC' },
  { value: 'Switch', label: 'Switch' },
  { value: 'Mobile', label: '모바일' },
]

export function platformLabel(value: string): string {
  return PLATFORM_TABS.find((p) => p.value === value)?.label ?? value
}

/** 쿼리 값이 유효한 플랫폼이면 그대로, 아니면 null (= 전체) */
export function parsePlatform(value: string | undefined): string | null {
  return PLATFORM_TABS.some((p) => p.value === value) ? value! : null
}
