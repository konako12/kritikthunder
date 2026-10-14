import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * POST /api/admin/translate — 게임 소개 영어 → 한국어 번역 (DeepL)
 * 관리자가 "한국어로 번역" 버튼을 눌렀을 때만 호출된다.
 * DEEPL_API_KEY는 서버 환경변수로만 읽고 클라이언트에 내려보내지 않는다.
 */

const MAX_CHARS = 5000

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const key = process.env.DEEPL_API_KEY
  if (!key) {
    return NextResponse.json({ error: '번역 키(DEEPL_API_KEY)가 설정되지 않았어요' }, { status: 503 })
  }

  const { text } = await req.json().catch(() => ({ text: '' }))
  const source = String(text ?? '').trim()
  if (!source) return NextResponse.json({ error: '번역할 내용이 없어요' }, { status: 400 })
  if (source.length > MAX_CHARS) {
    return NextResponse.json({ error: `${MAX_CHARS}자 이하만 번역할 수 있어요` }, { status: 400 })
  }

  // 무료 키는 ":fx"로 끝나고 주소가 다름
  const endpoint = key.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [source], source_lang: 'EN', target_lang: 'KO' }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.error('[translate] DeepL 오류', res.status, (await res.text()).slice(0, 300))
      const msg =
        res.status === 403 ? '번역 키가 올바르지 않아요'
        : res.status === 456 ? '이번 달 번역 사용량을 모두 썼어요'
        : res.status === 429 ? '번역 요청이 많아요. 잠시 후 다시 시도해주세요'
        : '번역 서비스에서 오류가 났어요'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await res.json()
    const translated: string | undefined = data?.translations?.[0]?.text
    if (!translated) return NextResponse.json({ error: '번역 결과가 비어 있어요' }, { status: 502 })
    return NextResponse.json({ text: translated })
  } catch (e) {
    console.error('[translate] 요청 실패', (e as Error).name, (e as Error).message)
    return NextResponse.json({ error: '번역 서비스에 연결하지 못했어요' }, { status: 502 })
  }
}
