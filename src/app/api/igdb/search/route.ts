import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import type { PlatformCode } from '@/lib/platforms'

// ── Twitch 토큰 인-프로세스 캐시 (만료 1분 전 갱신) ──────────────
let tokenCache: { token: string; expiresAt: number } | null = null

async function getTwitchToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${process.env.TWITCH_CLIENT_ID}` +
    `&client_secret=${process.env.TWITCH_CLIENT_SECRET}` +
    `&grant_type=client_credentials`,
    { method: 'POST' },
  )
  if (!res.ok) {
    const text = await res.text()
    console.error('[IGDB] Twitch 토큰 발급 실패:', res.status, text)
    throw new Error(`Twitch 토큰 발급 실패 (${res.status}): ${text}`)
  }
  const json = await res.json()
  console.log('[IGDB] Twitch 토큰 발급 성공, 만료까지:', Math.floor(json.expires_in / 3600), '시간')
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000 - 60_000,
  }
  return tokenCache.token
}

// ── IGDB 플랫폼 ID → 사이트 플랫폼 코드 (src/lib/platforms.ts) ─────────
// ID는 IGDB /platforms 기준. 11(초대 Xbox) · 12(Xbox 360)처럼 목록에 없는 기종은 넣지 않음
const PLATFORM_MAP: Record<number, PlatformCode> = {
  167: 'ps5',          // PlayStation 5
  48:  'ps4',          // PlayStation 4
  169: 'xbox-series',  // Xbox Series X|S
  49:  'xbox-one',     // Xbox One
  6:   'pc',           // PC (Windows)
  3:   'pc',           // Linux
  14:  'pc',           // Mac
  130: 'switch',       // Nintendo Switch
  508: 'switch-2',     // Nintendo Switch 2
  34:  'mobile',       // Android
  39:  'mobile',       // iOS
}

// ── IGDB 장르 ID → 사이트 한국어 장르 변환 ────────────────────────
function mapGenres(genres: { id: number }[]): string | null {
  const ids = genres.map((g) => g.id)

  const isRpg    = ids.includes(12)
  const isAction = ids.some((id) => [4, 5, 8, 17, 25, 35].includes(id))

  if (isRpg && isAction) return '액션 RPG'
  if (isRpg) return 'RPG'

  const MAP: Record<number, string> = {
    5:  '슈팅',
    36: '슈팅',
    31: '어드벤처',
    2:  '어드벤처',
    34: '어드벤처',
    14: '스포츠',
    10: '스포츠',
    15: '전략',
    11: '전략',
    16: '전략',
    24: '전략',
    32: '인디',
    9:  '인디',
    7:  '인디',
    26: '인디',
    33: '인디',
    13: '시뮬레이션',
    4:  '액션',
    8:  '액션',
    17: '액션',
    25: '액션',
    35: '액션',
  }

  for (const id of ids) {
    if (MAP[id]) return MAP[id]
  }
  return null
}

// ── 한국어 제목 찾기 (번역기 없이 IGDB 데이터만 사용) ──────────────
// 우선순위: game_localizations의 한국 지역(ko-KR) → alternative_names의 "Korean title"
//          → 한글이 들어간 다른 별칭. 개발 중 가칭("working")은 제외 (예: 스텔라 블레이드의 "프로젝트 이브")
const HANGUL = /[가-힣]/

interface IgdbLocalization { name?: string; region?: { identifier?: string; name?: string } }
interface IgdbAltName { name?: string; comment?: string }

function koreanTitle(g: { game_localizations?: IgdbLocalization[]; alternative_names?: IgdbAltName[] }):
  { title: string; source: 'localization' | 'alternative_name' } | null {
  const loc = (g.game_localizations ?? []).find(
    (l) => (l.region?.identifier === 'ko-KR' || l.region?.name === 'Korea') && l.name?.trim()
  )
  if (loc) return { title: loc.name!.trim(), source: 'localization' }

  const alts = (g.alternative_names ?? []).filter(
    (a) => a.name?.trim() && HANGUL.test(a.name) && !/working/i.test(a.comment ?? '')
  )
  const alt = alts.find((a) => /korean/i.test(a.comment ?? '')) ?? alts[0]
  if (alt) return { title: alt.name!.trim(), source: 'alternative_name' }
  return null
}

// ── GET /api/igdb/search?q=... ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    const token = await getTwitchToken()

    // game_type 값 (구 category):
    //   null | 0 = 메인게임, 8 = 리메이크, 9 = 리마스터, 10 = 확장판, 11 = 포트
    // ※ 구 API의 `category` 필드는 `game_type`으로 이름이 변경됨
    //   `category`를 그대로 쓰면 IGDB가 빈 배열 []을 반환하므로 반드시 game_type 사용
    const body =
      `search "${q.replace(/"/g, '')}";` +
      `fields name, cover.image_id, first_release_date, platforms.id, genres.id,` +
      ` involved_companies.company.name, involved_companies.developer, involved_companies.publisher,` +
      ` summary, game_localizations.name, game_localizations.region.identifier, game_localizations.region.name,` +
      ` alternative_names.name, alternative_names.comment;` +
      ` where game_type = null | game_type = (0,8,9,10,11);` +
      ` limit 8;`

    console.log('[IGDB] 쿼리:', body)

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID':     process.env.TWITCH_CLIENT_ID!,
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'text/plain',
      },
      body,
    })

    const rawText = await res.text()
    console.log('[IGDB] 응답 상태:', res.status, '/ 본문 앞 200자:', rawText.slice(0, 200))

    if (!res.ok) {
      throw new Error(`IGDB HTTP ${res.status}: ${rawText.slice(0, 300)}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any[]
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error(`IGDB 응답 파싱 실패: ${rawText.slice(0, 200)}`)
    }

    // IGDB는 에러를 200 + [{ title, status, cause }] 형태로 내려주기도 함
    if (!Array.isArray(data)) {
      throw new Error(`IGDB 예상치 못한 응답 형식: ${rawText.slice(0, 200)}`)
    }
    if (data.length > 0 && typeof data[0]?.title === 'string' && typeof data[0]?.status === 'number') {
      const igdbErr = data[0]
      console.error('[IGDB] API 오류 응답:', igdbErr)
      throw new Error(`IGDB 오류 (${igdbErr.status}): ${igdbErr.title} — ${igdbErr.cause ?? ''}`)
    }

    console.log('[IGDB] 검색 결과:', data.length, '건')

    const results = data.map((g) => {
      const year = g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null

      const release_date = g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
        : null

      const rawPlats = (g.platforms ?? [])
        .map((p: { id: number }) => PLATFORM_MAP[p.id])
        .filter(Boolean)
      const platforms: string[] = [...new Set<string>(rawPlats)]

      const genre = mapGenres(g.genres ?? [])

      const devs = (g.involved_companies ?? []).filter((ic: { developer: boolean }) => ic.developer)
      const pubs = (g.involved_companies ?? []).filter((ic: { publisher: boolean }) => ic.publisher)

      const ko = koreanTitle(g)

      return {
        igdb_id:     g.id,
        title:       ko?.title ?? g.name,       // 화면용 — 한국어 제목이 없으면 원어 그대로
        title_original: g.name,                 // 원어 제목은 항상
        title_ko_source: ko?.source ?? null,    // null이면 한국어 제목 없음 → 관리자가 직접 입력
        year,
        release_date,
        cover_id:    g.cover?.image_id ?? null,
        cover_thumb: g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${g.cover.image_id}.jpg`
          : null,
        platforms,
        genre,
        developer: devs[0]?.company?.name ?? null,
        publisher: pubs[0]?.company?.name ?? null,
        summary:   g.summary ?? null,
      }
    })

    return NextResponse.json({ results })
  } catch (e: unknown) {
    const msg = (e as Error).message
    console.error('[IGDB] 검색 실패:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
