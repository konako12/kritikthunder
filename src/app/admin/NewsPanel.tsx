'use client'

import { useState } from 'react'
import type { Game, News, NewsImageSource, NewsStatus } from '@/lib/types'
import {
  NEWS_IMAGE_SOURCE_LABEL, NEWS_MEDIA_MAX, NEWS_STATUS_LABEL, NEWS_SUMMARY_MAX, NEWS_TITLE_MAX,
  formatNewsDate, normalizeNewsUrl,
} from '@/lib/news'
import NewsCard from '@/components/news/NewsCard'
import NewsImage from '@/components/news/NewsImage'
import ns from '@/components/news/news.module.css'
import s from './admin.module.css'

interface Props {
  games: Game[]
  news: News[]
  setNews: (n: News[]) => void
  showToast: (msg: string) => void
}

interface Draft {
  id: number | null
  source_url: string
  title: string
  media: string
  summary: string
  published_at: string
  image_url: string
  image_source: NewsImageSource | null
  original_image_url: string
  game_id: number | null
  status: NewsStatus
  is_pinned: boolean
  sort_order: number
}

interface MetaResult {
  title: string | null
  media: string | null
  summary: string | null
  image_url: string | null
  published_at: string | null
}

const EMPTY: Draft = {
  id: null, source_url: '', title: '', media: '', summary: '', published_at: '',
  image_url: '', image_source: null, original_image_url: '', game_id: null,
  status: 'draft', is_pinned: false, sort_order: 0,
}

const META_LABEL: Record<keyof MetaResult, string> = {
  title: '기사 제목', media: '매체명', summary: '첫 문단', image_url: '대표 이미지', published_at: '원문 게재일',
}

function toDraft(n: News): Draft {
  return {
    id: n.id, source_url: n.source_url, title: n.title, media: n.media, summary: n.summary ?? '',
    published_at: n.published_at ?? '', image_url: n.image_url ?? '', image_source: n.image_source,
    original_image_url: n.original_image_url ?? '', game_id: n.game_id, status: n.status,
    is_pinned: n.is_pinned, sort_order: n.sort_order,
  }
}

async function request(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? '오류가 발생했습니다')
  return data
}

const STATUS_BADGE: Record<NewsStatus, string> = { draft: s.bGray, published: s.bGreen, hidden: s.bOrange }

export default function NewsPanel({ games, news, setNews, showToast }: Props) {
  // 목록
  const [statusFilter, setStatusFilter] = useState<NewsStatus | ''>('')
  const [q, setQ] = useState('')

  // 편집기
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 원문 불러오기 — 같은 주소는 한 번만
  const [fetching, setFetching] = useState(false)
  const [fetchedUrl, setFetchedUrl] = useState('')
  const [fetchNotice, setFetchNotice] = useState<{ ok: boolean; text: string } | null>(null)

  // 이미지 교체
  const [imgMenu, setImgMenu] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 관련 게임 검색
  const [gameQ, setGameQ] = useState('')
  const [gameDrop, setGameDrop] = useState(false)

  const gameOf = (id: number | null) => (id ? games.find((g) => g.id === id) ?? null : null)

  function patch(p: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...p } : d))
  }

  function openEditor(n: News | null) {
    setDraft(n ? toDraft(n) : { ...EMPTY })
    setErrors({})
    setShowPreview(false)
    setFetchedUrl(n?.source_url.trim() ?? '')
    setFetchNotice(null)
    setImgMenu(false)
    setGameQ('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeEditor() {
    setDraft(null)
  }

  // ── 원문 링크로 자동 입력 (관리자가 누를 때만 1회)
  async function fetchMeta() {
    if (!draft) return
    const url = draft.source_url.trim()
    if (!/^https?:\/\/\S+$/i.test(url)) { setErrors({ source_url: 'http:// 또는 https://로 시작하는 주소를 입력해주세요' }); return }

    setFetching(true)
    setFetchNotice(null)
    try {
      const meta: MetaResult = await request('/api/admin/news/fetch-meta', 'POST', { url })
      const missing = (Object.keys(META_LABEL) as (keyof MetaResult)[]).filter((k) => !meta[k])
      patch({
        ...(meta.title && { title: meta.title }),
        ...(meta.media && { media: meta.media }),
        ...(meta.summary && { summary: meta.summary }),
        ...(meta.published_at && { published_at: meta.published_at }),
        ...(meta.image_url && { image_url: meta.image_url, image_source: 'original', original_image_url: meta.image_url }),
      })
      setFetchNotice(
        missing.length === 0
          ? { ok: true, text: '원문 정보를 불러왔어요. 내용을 확인하고 필요하면 고쳐주세요.' }
          : { ok: false, text: `원문에서 ${missing.map((k) => META_LABEL[k]).join(', ')}을(를) 찾지 못했어요. 해당 칸은 직접 입력해주세요.` }
      )
      setFetchedUrl(url) // 성공한 주소는 다시 불러오지 않음
    } catch (e) {
      setFetchNotice({ ok: false, text: `${(e as Error).message}. 각 항목을 직접 입력해주세요.` })
    } finally {
      setFetching(false)
    }
  }

  // ── 이미지
  async function uploadImage(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('JPG, PNG, WebP 파일만 지원합니다.'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('파일 크기는 5MB 이하여야 합니다.'); return }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', 'news')
    const res = await fetch('/api/admin/upload-cover-file', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    setUploading(false)
    if (!res.ok) { showToast('이미지 업로드 실패: ' + (data.error ?? '알 수 없는 오류')); return }
    patch({ image_url: data.url, image_source: 'upload' })
    setImgMenu(false)
  }

  function applyGameCover() {
    const g = gameOf(draft?.game_id ?? null)
    if (!g?.cover_url) return
    patch({ image_url: g.cover_url, image_source: 'game_cover' })
    setImgMenu(false)
  }

  function revertOriginal() {
    if (!draft?.original_image_url) return
    patch({ image_url: draft.original_image_url, image_source: 'original' })
    setImgMenu(false)
  }

  // ── 저장
  async function save() {
    if (!draft) return
    const e: Record<string, string> = {}
    if (!/^https?:\/\/\S+$/i.test(draft.source_url.trim())) e.source_url = '원문 링크를 http(s):// 주소로 입력해주세요'
    if (!draft.title.trim()) e.title = '기사 제목을 입력해주세요'
    if (!draft.media.trim()) e.media = '매체명을 입력해주세요'
    if (draft.summary.length > NEWS_SUMMARY_MAX) e.summary = `${NEWS_SUMMARY_MAX}자 이내로 줄여주세요`
    setErrors(e)
    if (Object.keys(e).length) return

    const { id, ...body } = draft
    setSaving(true)
    try {
      if (id) {
        const data: News = await request(`/api/admin/news/${id}`, 'PATCH', body)
        setNews(news.map((n) => (n.id === id ? data : n)))
        showToast(`✅ "${data.title}" 뉴스를 수정했어요`)
      } else {
        const data: News = await request('/api/admin/news', 'POST', body)
        setNews([data, ...news])
        showToast(`✅ "${data.title}" 뉴스를 ${data.status === 'published' ? '게시' : '저장'}했어요`)
      }
      setDraft(null)
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── 목록에서 바로 바꾸기 (숨김 · 게시 · 고정)
  async function quickPatch(n: News, body: Partial<News>, msg: string) {
    try {
      const data: News = await request(`/api/admin/news/${n.id}`, 'PATCH', body)
      setNews(news.map((x) => (x.id === n.id ? data : x)))
      showToast(msg)
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
    }
  }

  async function remove(n: News) {
    if (!window.confirm(`"${n.title}" 뉴스를 삭제할까요?\n삭제하면 되돌릴 수 없어요. 잠시 내리려면 "숨김"을 사용하세요.`)) return
    try {
      await request(`/api/admin/news/${n.id}`, 'DELETE')
      setNews(news.filter((x) => x.id !== n.id))
      if (draft?.id === n.id) setDraft(null)
      showToast('🗑️ 뉴스를 삭제했어요')
    } catch (err) {
      showToast(`⚠️ ${(err as Error).message}`)
    }
  }

  // ── 파생 값
  const counts = { draft: 0, published: 0, hidden: 0 }
  for (const n of news) counts[n.status]++

  const query = q.trim().toLowerCase()
  const list = news
    .filter((n) => !statusFilter || n.status === statusFilter)
    .filter((n) => !query || n.title.toLowerCase().includes(query) || n.media.toLowerCase().includes(query))

  const draftUrlKey = draft?.source_url.trim() ? normalizeNewsUrl(draft.source_url) : ''
  const duplicates = draftUrlKey
    ? news.filter((n) => n.id !== draft?.id && normalizeNewsUrl(n.source_url) === draftUrlKey)
    : []

  const selGame = gameOf(draft?.game_id ?? null)
  const gameMatches = gameQ.trim()
    ? games.filter((g) => g.title.toLowerCase().includes(gameQ.trim().toLowerCase())).slice(0, 8)
    : []

  const canFetch = !!draft && !fetching && !!draft.source_url.trim() && draft.source_url.trim() !== fetchedUrl

  return (
    <div>
      {/* ── 등록 / 수정 ── */}
      {draft ? (
        <div className={s.card} style={{ maxWidth: 820 }}>
          <div className={s.cardHead}>
            <span className={s.cardTitle}>{draft.id ? '뉴스 수정' : '뉴스 등록'}</span>
            <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={closeEditor}>닫기</button>
          </div>
          <div className={s.cardBody}>

            {/* 원문 링크 + 불러오기 */}
            <div className={s.formGroup}>
              <label className={s.formLabel}>원문 링크 <span className={s.req}>*</span></label>
              <div className={s.igdbRow}>
                <input
                  className={s.formInput} type="url" value={draft.source_url}
                  onChange={(e) => patch({ source_url: e.target.value })}
                  placeholder="https://... 기사 주소를 붙여넣으세요"
                />
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={fetchMeta} disabled={!canFetch}
                  title={draft.source_url.trim() && draft.source_url.trim() === fetchedUrl ? '이 주소는 이미 불러왔어요' : ''}>
                  {fetching ? '불러오는 중...' : '불러오기'}
                </button>
              </div>
              <span className={s.uploadHint}>“불러오기”를 누를 때만 원문 페이지를 한 번 읽어 제목·매체명·첫 문단·이미지·게재일을 채워요.</span>
              {errors.source_url && <span className={s.formError}>{errors.source_url}</span>}
              {fetchNotice && (
                <div className={fetchNotice.ok ? s.newsNoticeOk : s.newsNoticeWarn}>{fetchNotice.text}</div>
              )}
              {duplicates.length > 0 && (
                <div className={s.dupWarn} style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                  ⚠️ 같은 원문 링크로 등록된 뉴스가 있어요:{' '}
                  {duplicates.map((d) => (
                    <strong key={d.id}>“{d.title}” ({NEWS_STATUS_LABEL[d.status]}) </strong>
                  ))}
                </div>
              )}
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel}>기사 제목 <span className={s.req}>*</span></label>
              <input className={s.formInput} value={draft.title} maxLength={NEWS_TITLE_MAX}
                onChange={(e) => patch({ title: e.target.value })} placeholder="기사 제목을 입력하세요" />
              {errors.title && <span className={s.formError}>{errors.title}</span>}
            </div>

            <div className={s.formGrid}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>매체명 <span className={s.req}>*</span></label>
                <input className={s.formInput} value={draft.media} maxLength={NEWS_MEDIA_MAX}
                  onChange={(e) => patch({ media: e.target.value })} placeholder="매체명을 입력하세요" />
                {errors.media && <span className={s.formError}>{errors.media}</span>}
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>원문 게재일</label>
                <input className={s.formInput} type="date" value={draft.published_at}
                  onChange={(e) => patch({ published_at: e.target.value })} />
              </div>
            </div>

            <div className={s.formGroup}>
              <label className={s.formLabel}>
                첫 문단 (요약)
                <span className={draft.summary.length > NEWS_SUMMARY_MAX ? s.newsCountOver : s.newsCount}>
                  {draft.summary.length} / {NEWS_SUMMARY_MAX}자
                </span>
              </label>
              <textarea className={`${s.formInput} ${s.formTextarea}`} rows={4} value={draft.summary}
                maxLength={NEWS_SUMMARY_MAX}
                onChange={(e) => patch({ summary: e.target.value })}
                placeholder="기사의 첫 문단을 입력하세요. 공개 화면에서 아래에 “출처: 매체명”이 함께 표시돼요." />
              {errors.summary && <span className={s.formError}>{errors.summary}</span>}
            </div>

            {/* 관련 게임 */}
            <div className={s.formGroup}>
              <label className={s.formLabel}>관련 게임 (선택)</label>
              {selGame ? (
                <div className={s.newsGameSel}>
                  {selGame.cover_url && <img src={selGame.cover_url} alt="" className={s.gameThumb} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={s.gameName}>{selGame.title}</div>
                    <div className={s.gameDev}>{selGame.developer} · {selGame.year}</div>
                  </div>
                  <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => {
                    // 게임 커버를 쓰던 중이면 이미지도 원문으로 되돌림
                    patch({
                      game_id: null,
                      ...(draft.image_source === 'game_cover' && {
                        image_url: draft.original_image_url, image_source: draft.original_image_url ? 'original' : null,
                      }),
                    })
                  }}>✕ 해제</button>
                </div>
              ) : (
                <div className={s.newsGameSearch}>
                  <input className={s.formInput} value={gameQ} placeholder="게임 제목으로 검색..."
                    onChange={(e) => { setGameQ(e.target.value); setGameDrop(true) }}
                    onFocus={() => setGameDrop(true)}
                    onBlur={() => setTimeout(() => setGameDrop(false), 150)} />
                  {gameDrop && gameMatches.length > 0 && (
                    <div className={s.newsGameDrop}>
                      {gameMatches.map((g) => (
                        <button key={g.id} className={s.newsGameItem}
                          onMouseDown={() => { patch({ game_id: g.id }); setGameQ(''); setGameDrop(false) }}>
                          {g.cover_url && <img src={g.cover_url} alt="" className={s.gameThumb} />}
                          <span>
                            <span className={s.gameName}>{g.title}</span>
                            <span className={s.gameDev} style={{ display: 'block' }}>{g.developer} · {g.year}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 이미지 */}
            <div className={s.formGroup}>
              <label className={s.formLabel}>대표 이미지</label>
              <div className={s.newsImgRow}>
                <div className={s.newsImgBox}>
                  <NewsImage
                    src={draft.image_source === 'game_cover' ? selGame?.cover_url ?? draft.image_url : draft.image_url || null}
                    fallback={selGame?.cover_url} alt="" className={s.newsImg}
                  />
                </div>
                <div className={s.newsImgSide}>
                  <div className={s.gameDev}>
                    {draft.image_source ? NEWS_IMAGE_SOURCE_LABEL[draft.image_source] : '이미지 없음 — 관련 게임 커버 또는 기본 이미지로 표시돼요'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setImgMenu((v) => !v)}>이미지 교체</button>
                    {draft.original_image_url && draft.image_source !== 'original' && (
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={revertOriginal}>원문 이미지로 되돌리기</button>
                    )}
                  </div>
                  {imgMenu && (
                    <div className={s.newsImgMenu}>
                      <label className={s.uploadBtn}>
                        {uploading ? '업로드 중...' : '직접 업로드'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
                      </label>
                      <button className={`${s.btn} ${s.btnGhost}`} onClick={applyGameCover} disabled={!selGame?.cover_url}
                        title={!selGame ? '관련 게임을 먼저 선택하세요' : !selGame.cover_url ? '선택한 게임에 커버가 없어요' : ''}>
                        관련 게임 커버 사용
                      </button>
                      <div className={s.uploadHint} style={{ width: '100%' }}>업로드: JPG, PNG, WebP · 최대 5MB</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 노출 */}
            <div className={s.formSectionTitle} style={{ marginTop: '0.5rem' }}>노출 설정</div>
            <div className={s.formGrid3}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>상태</label>
                <select className={s.formSelect} value={draft.status} onChange={(e) => patch({ status: e.target.value as NewsStatus })}>
                  <option value="draft">임시저장</option>
                  <option value="published">게시</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>메인 고정</label>
                <label className={`${s.platLbl} ${draft.is_pinned ? s.platOn : ''}`} style={{ alignSelf: 'flex-start' }}>
                  <input type="checkbox" checked={draft.is_pinned} onChange={(e) => patch({ is_pinned: e.target.checked })} />
                  📌 {draft.is_pinned ? '고정됨' : '고정 안 함'}
                </label>
              </div>
              {draft.is_pinned && (
                <div className={s.formGroup}>
                  <label className={s.formLabel}>노출 순서</label>
                  <input className={s.formInput} type="number" min={0} max={9999} value={draft.sort_order}
                    onChange={(e) => patch({ sort_order: Number(e.target.value) || 0 })} />
                  <span className={s.uploadHint}>고정 뉴스끼리 작은 숫자가 앞</span>
                </div>
              )}
            </div>

            {/* 미리보기 */}
            {showPreview && (
              <div className={s.newsPreview}>
                <div className={s.newsPreviewLabel}>미리보기 — 공개 화면</div>
                {draft.is_pinned && (
                  <div style={{ marginBottom: '1rem' }}>
                    <NewsCard variant="feature" news={previewData(draft, selGame)} />
                  </div>
                )}
                <div className={ns.grid} style={{ ['--news-cols' as string]: 2 }}>
                  <NewsCard news={previewData(draft, selGame)} />
                </div>
              </div>
            )}

            <div className={s.formActions}>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={save} disabled={saving}>
                {saving ? '저장 중...' : draft.id ? '수정 저장' : draft.status === 'published' ? '게시하기' : '저장하기'}
              </button>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? '미리보기 닫기' : '미리보기'}
              </button>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={closeEditor} style={{ marginLeft: 'auto' }}>취소</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openEditor(null)}>+ 뉴스 등록</button>
        </div>
      )}

      {/* ── 목록 ── */}
      <div className={s.toolbar} style={{ flexWrap: 'wrap' }}>
        <div className={s.searchWrap}>
          <span className={s.searchIc}>🔍</span>
          <input className={s.formInput} type="text" placeholder="제목 · 매체 검색..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={s.newsTabs}>
          {([['', `전체 ${news.length}`], ['published', `게시 ${counts.published}`], ['draft', `임시저장 ${counts.draft}`], ['hidden', `숨김 ${counts.hidden}`]] as [NewsStatus | '', string][]).map(([v, label]) => (
            <button key={v} className={`${s.newsTab} ${statusFilter === v ? s.newsTabOn : ''}`} onClick={() => setStatusFilter(v)}>{label}</button>
          ))}
        </div>
      </div>

      <div className={s.card} style={{ overflowX: 'auto' }}>
        <table className={s.table}>
          <thead><tr><th>뉴스</th><th>관련 게임</th><th>게재일</th><th>상태</th><th>관리</th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={5}><div className={s.emptyS}>{news.length ? '조건에 맞는 뉴스가 없습니다' : '등록된 뉴스가 없습니다'}</div></td></tr>
            )}
            {list.map((n) => {
              const g = gameOf(n.game_id)
              return (
                <tr key={n.id}>
                  <td style={{ minWidth: 280 }}>
                    <div className={s.gameCell}>
                      <NewsImage src={n.image_url} fallback={g?.cover_url} alt="" className={s.newsThumb} />
                      <div style={{ minWidth: 0 }}>
                        <div className={s.gameName}>
                          {n.is_pinned && <span title="메인 고정">📌 </span>}
                          <a href={n.source_url} target="_blank" rel="noopener noreferrer">{n.title}</a>
                        </div>
                        <div className={s.gameDev}>{n.media}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '0.75rem' }}>{g?.title ?? '—'}</span></td>
                  <td><span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.75rem' }}>{formatNewsDate(n.published_at) || '—'}</span></td>
                  <td><span className={`${s.badge} ${STATUS_BADGE[n.status]}`}>{NEWS_STATUS_LABEL[n.status]}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }} onClick={() => openEditor(n)}>수정</button>
                    {n.status === 'published' ? (
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }}
                        onClick={() => quickPatch(n, { status: 'hidden' }, '🙈 뉴스를 숨겼어요')}>숨김</button>
                    ) : (
                      <button className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} style={{ marginRight: 4 }}
                        onClick={() => quickPatch(n, { status: 'published' }, '✅ 뉴스를 게시했어요')}>게시</button>
                    )}
                    <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }}
                      onClick={() => quickPatch(n, { is_pinned: !n.is_pinned }, n.is_pinned ? '고정을 해제했어요' : '📌 메인에 고정했어요')}>
                      {n.is_pinned ? '고정 해제' : '고정'}
                    </button>
                    <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => remove(n)}>삭제</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** 편집 중인 내용을 공개 카드 형태로 */
function previewData(d: Draft, game: Game | null) {
  return {
    title: d.title || '기사 제목',
    media: d.media || '매체명',
    source_url: d.source_url || '#',
    summary: d.summary || null,
    published_at: d.published_at || null,
    image_url: d.image_url || null,
    image_source: d.image_source,
    is_pinned: d.is_pinned,
    game: game ? { id: game.id, title: game.title, cover_url: game.cover_url } : null,
  }
}
