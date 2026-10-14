import { NextRequest, NextResponse } from 'next/server'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { requireAdmin } from '@/lib/admin-auth'
import { NEWS_MEDIA_MAX, NEWS_SUMMARY_MAX, NEWS_TITLE_MAX } from '@/lib/news'

/**
 * POST /api/admin/news/fetch-meta — 원문 링크의 메타 정보(og 태그) 1회 조회
 * 관리자가 "불러오기"를 눌렀을 때만 호출된다. 자동 수집·반복 요청 없음.
 * 결과에 없는 항목은 null로 돌려주고, 화면에서 직접 입력하도록 안내한다.
 */

const TIMEOUT_MS = 8000
const MAX_BYTES = 1_500_000   // <head>만 필요하므로 앞부분만 읽음
const MAX_REDIRECTS = 4
const USER_AGENT = 'Mozilla/5.0 (compatible; KritikNewsFetcher/1.0; 관리자 수동 등록)'

/** 사설·예약 대역 주소인지 (서버 내부망 접근 차단) */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7))
  return (
    v6 === '::' || v6 === '::1' ||
    v6.startsWith('fc') || v6.startsWith('fd') ||   // 고유 로컬
    v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb') // 링크 로컬
  )
}

async function assertPublicUrl(u: URL) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('http(s) 주소만 불러올 수 있어요')
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('표준 포트(80/443) 주소만 불러올 수 있어요')
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('내부 주소는 불러올 수 없어요')
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error('내부 주소는 불러올 수 없어요')
  }
}

/** 리다이렉트를 한 단계씩 검사하며 HTML 앞부분만 읽기 */
async function fetchHead(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let url = new URL(startUrl)
    for (let hop = 0; ; hop++) {
      await assertPublicUrl(url)
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.6',
        },
      })
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        if (hop >= MAX_REDIRECTS) throw new Error('리다이렉트가 너무 많아요')
        url = new URL(res.headers.get('location')!, url)
        continue
      }
      if (!res.ok) throw new Error(`원문 페이지가 응답하지 않았어요 (HTTP ${res.status})`)
      const type = res.headers.get('content-type') ?? ''
      if (type && !/html/i.test(type)) throw new Error('HTML 페이지가 아니에요')

      // 앞부분만 읽기
      const chunks: Uint8Array[] = []
      let size = 0
      const reader = res.body?.getReader()
      if (reader) {
        while (size < MAX_BYTES) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          size += value.length
          // </head>가 나오면 그만 읽음
          if (Buffer.from(value).toString('latin1').toLowerCase().includes('</head>')) break
        }
        reader.cancel().catch(() => {})
      }
      const bytes = Buffer.concat(chunks)
      return { html: decodeHtml(bytes, type), finalUrl: url.toString() }
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 응답 헤더 또는 <meta charset>의 문자셋으로 디코딩 (EUC-KR 사이트 대응) */
function decodeHtml(bytes: Buffer, contentType: string): string {
  const sniff = bytes.subarray(0, 4096).toString('latin1')
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(sniff)?.[1] ??
    'utf-8'
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** <meta property|name="..." content="..."> → { key: content } (먼저 나온 값 우선) */
function parseMeta(html: string): Record<string, string> {
  const head = html.split(/<\/head>/i)[0]
  const out: Record<string, string> = {}
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs: Record<string, string> = {}
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? ''
    }
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase()
    if (key && attrs.content !== undefined && !(key in out)) {
      out[key] = decodeEntities(attrs.content).replace(/\s+/g, ' ').trim()
    }
  }
  return out
}

const clip = (v: string | undefined, max: number) => {
  const t = (v ?? '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

/** ISO 시각 → 한국 날짜 (YYYY-MM-DD) */
function toKstDate(v: string | undefined): string | null {
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
}

function absoluteHttpUrl(v: string | undefined, base: string): string | null {
  if (!v) return null
  try {
    const u = new URL(v, base)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { url } = await req.json().catch(() => ({ url: '' }))
  let target: URL
  try {
    target = new URL(String(url ?? '').trim())
  } catch {
    return NextResponse.json({ error: '원문 링크 형식이 올바르지 않아요' }, { status: 400 })
  }

  try {
    const { html, finalUrl } = await fetchHead(target.toString())
    const meta = parseMeta(html)
    const result = {
      title: clip(meta['og:title'], NEWS_TITLE_MAX),
      media: clip(meta['og:site_name'], NEWS_MEDIA_MAX),
      summary: clip(meta['og:description'], NEWS_SUMMARY_MAX),
      image_url: absoluteHttpUrl(meta['og:image'] ?? meta['og:image:url'], finalUrl),
      published_at: toKstDate(meta['article:published_time']),
    }
    return NextResponse.json(result)
  } catch (e) {
    const err = e as Error & { code?: string }
    const msg =
      err.name === 'AbortError' ? '원문 페이지 응답이 너무 늦어요'
      : err.code === 'ENOTFOUND' ? '원문 사이트 주소를 찾을 수 없어요'
      : err instanceof TypeError ? '원문 페이지에 연결하지 못했어요'
      : err.message || '원문 페이지를 불러오지 못했어요'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
