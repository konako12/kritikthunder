/**
 * 플랫폼 목록 — 이 파일 하나에서 관리한다.
 * code  : DB(games.platforms) 저장값 · 주소(?platform=) 값. 영문 소문자와 '-'만 써서 "|" 등으로 주소가 깨지지 않게.
 * label : 화면 표시 이름 (게임 상세 · 카드 태그 · 관리자 폼)
 * group : 공개 화면 필터 묶음 (PlayStation = PS5 + PS4 등)
 */
export const PLATFORMS = [
  { code: 'ps5',         label: 'PS5',             group: 'playstation' },
  { code: 'ps4',         label: 'PS4',             group: 'playstation' },
  { code: 'xbox-series', label: 'Xbox Series X|S', group: 'xbox' },
  { code: 'xbox-one',    label: 'Xbox One',        group: 'xbox' },
  { code: 'pc',          label: 'PC',              group: 'pc' },
  { code: 'switch',      label: 'Switch',          group: 'switch' },
  { code: 'switch-2',    label: 'Switch 2',        group: 'switch' },
  { code: 'mobile',      label: '모바일',           group: 'mobile' },
] as const

export type PlatformCode = (typeof PLATFORMS)[number]['code']

/** 공개 화면 필터 탭 — 랭킹 · 게임 목록 · 출시 일정 · 메인 */
export const PLATFORM_GROUPS = [
  { value: 'playstation', label: 'PlayStation', icon: '🟦' },
  { value: 'xbox',        label: 'Xbox',        icon: '🟩' },
  { value: 'pc',          label: 'PC',          icon: '💻' },
  { value: 'switch',      label: 'Switch',      icon: '🟥' },
  { value: 'mobile',      label: '모바일',       icon: '📱' },
] as const

export type PlatformGroup = (typeof PLATFORM_GROUPS)[number]['value']

/** 예전 저장값(009 변환 SQL 실행 전 데이터 · 예전 주소) → 새 코드 */
const LEGACY: Record<string, PlatformCode> = {
  PS5: 'ps5', PS4: 'ps4', Xbox: 'xbox-series', 'Xbox Series X|S': 'xbox-series', 'Xbox One': 'xbox-one',
  PC: 'pc', Switch: 'switch', 'Switch 2': 'switch-2', Mobile: 'mobile', 모바일: 'mobile',
}

/** 저장값을 새 코드로 (이미 코드면 그대로, 모르는 값은 원래 값) */
export function normalizePlatform(value: string): string {
  return PLATFORMS.some((p) => p.code === value) ? value : LEGACY[value] ?? value
}

/** 화면 표시 이름 — 세부 기종 그대로 (예: xbox-series → "Xbox Series X|S") */
export function platformLabel(value: string): string {
  const code = normalizePlatform(value)
  return PLATFORMS.find((p) => p.code === code)?.label ?? value
}

/** 플랫폼이 속한 필터 묶음 */
export function platformGroupOf(value: string): PlatformGroup | null {
  const code = normalizePlatform(value)
  return PLATFORMS.find((p) => p.code === code)?.group ?? null
}

export function platformGroupLabel(group: string): string {
  return PLATFORM_GROUPS.find((g) => g.value === group)?.label ?? group
}

/** 묶음에 속한 저장값 — DB 쿼리용 (변환 전 예전 값도 함께 넣어 SQL 실행 전에도 동작) */
export function platformCodesInGroup(group: PlatformGroup): string[] {
  const codes: string[] = PLATFORMS.filter((p) => p.group === group).map((p) => p.code)
  // 쿼리 배열 값이 깨지지 않게 공백·"|" 없는 예전 값만 (예전 목록에 실제로 있던 값: PS5 · PS4 · Xbox · PC · Switch · Mobile)
  const legacy = Object.entries(LEGACY)
    .filter(([old, c]) => codes.includes(c) && /^[\w-]+$/.test(old))
    .map(([old]) => old)
  return [...codes, ...legacy]
}

/** 게임이 이 묶음의 플랫폼을 하나라도 지원하는지 */
export function inPlatformGroup(platforms: string[], group: PlatformGroup): boolean {
  return platforms.some((p) => platformGroupOf(p) === group)
}

/**
 * 주소의 ?platform= 값 → 필터 묶음 (아니면 null = 전체).
 * 예전 주소(?platform=PS5 등)나 세부 코드(?platform=ps4)도 해당 묶음으로 받아준다.
 */
export function parsePlatform(value: string | undefined): PlatformGroup | null {
  if (!value) return null
  if (PLATFORM_GROUPS.some((g) => g.value === value)) return value as PlatformGroup
  return platformGroupOf(value)
}

/** 화면 표시 순서대로 정렬된 세부 기종 이름 목록 */
export function platformLabels(platforms: string[]): string[] {
  const order = (v: string) => {
    const i = PLATFORMS.findIndex((p) => p.code === normalizePlatform(v))
    return i < 0 ? 99 : i
  }
  return [...platforms].sort((a, b) => order(a) - order(b)).map(platformLabel)
}
