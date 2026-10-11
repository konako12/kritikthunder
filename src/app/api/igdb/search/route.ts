import { NextRequest, NextResponse } from 'next/server'

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

// ── IGDB 플랫폼 ID → 사이트 기준 플랫폼 변환 ──────────────────────
const PLATFORM_MAP: Record<number, string> = {
  167: 'PS5',
  48:  'PS4',
  169: 'Xbox',   // Xbox Series X|S
  11:  'Xbox',   // Xbox One
  12:  'Xbox',   // Xbox 360
  6:   'PC',     // Windows
  3:   'PC',     // Linux
  14:  'PC',     // Mac
  130: 'Switch',
  34:  'Mobile', // Android
  39:  'Mobile', // iOS
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

// ── GET /api/igdb/search?q=... ──────────────────────────────────────
export async function GET(req: NextRequest) {
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
      ` summary;` +
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

      const rawPlats = (g.platforms ?? [])
        .map((p: { id: number }) => PLATFORM_MAP[p.id])
        .filter(Boolean)
      const platforms: string[] = [...new Set<string>(rawPlats)]

      const genre = mapGenres(g.genres ?? [])

      const devs = (g.involved_companies ?? []).filter((ic: { developer: boolean }) => ic.developer)
      const pubs = (g.involved_companies ?? []).filter((ic: { publisher: boolean }) => ic.publisher)

      return {
        igdb_id:     g.id,
        title:       g.name,
        year,
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
