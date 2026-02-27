'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Game, Journalist, Report } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import s from './admin.module.css'

type Page = 'dashboard' | 'games' | 'add' | 'featured' | 'journalists' | 'reports'

interface Props {
  initGames: Game[]
  initJournalists: Journalist[]
  initReports: Report[]
  featuredGameId: number
}

const PLATFORMS = ['PS5', 'PS4', 'Xbox', 'PC', 'Switch', 'Mobile']
const GENRES = ['액션 RPG', 'RPG', '액션', '전략', '인디', '스포츠', '슈팅', '어드벤처', '시뮬레이션']
const RATINGS = ['전체이용가', '12세이용가', '15세이용가', '청소년이용불가']

function scoreChipClass(score: number | null) {
  if (score === null) return s.chipGray
  if (score >= 90) return s.chipG
  if (score >= 75) return s.chipY
  return s.chipR
}

function statusBadge(status: Game['status']) {
  const map: Record<Game['status'], { cls: string; label: string }> = {
    published: { cls: s.bGreen, label: '공개' },
    draft:     { cls: s.bGray,  label: '임시저장' },
    upcoming:  { cls: s.bBlue,  label: '출시예정' },
  }
  return map[status]
}

export default function AdminClient({ initGames, initJournalists, initReports, featuredGameId: initFeatId }: Props) {
  const router = useRouter()
  const [page, setPage] = useState<Page>('dashboard')
  const [games, setGames] = useState<Game[]>(initGames)
  const [journalists, setJournalists] = useState<Journalist[]>(initJournalists)
  const [reports, setReports] = useState<Report[]>(initReports)
  const [featuredId, setFeaturedId] = useState(initFeatId)
  const [tmpFeatId, setTmpFeatId] = useState(initFeatId)

  // 검색/필터
  const [gSearch, setGSearch] = useState('')
  const [gStatus, setGStatus] = useState('')

  // 게임 등록 폼
  const [fTitle, setFTitle]     = useState('')
  const [fDev, setFDev]         = useState('')
  const [fPub, setFPub]         = useState('')
  const [fYear, setFYear]       = useState('')
  const [fGenre, setFGenre]     = useState('')
  const [fRating, setFRating]   = useState('전체이용가')
  const [fStatus, setFStatus]   = useState<Game['status']>('published')
  const [fImg, setFImg]         = useState('')
  const [fDesc, setFDesc]       = useState('')
  const [fPlats, setFPlats]     = useState<string[]>([])
  const [fErrors, setFErrors]   = useState<Record<string, string>>({})

  // 이미지 업로드 (add form)
  const [fFile, setFFile] = useState<File | null>(null)
  const [fPreview, setFPreview] = useState('')

  // 편집 모달
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState('')

  // 토스트
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  // 확인 다이얼로그
  const [confirm, setConfirm] = useState<{ title: string; desc: string; onOk: () => void } | null>(null)

  const filtered = games.filter((g) => {
    const q = gSearch.toLowerCase()
    const matchQ = !q || g.title.toLowerCase().includes(q) || g.developer.toLowerCase().includes(q)
    const matchS = !gStatus || g.status === gStatus
    return matchQ && matchS
  })

  async function apiCall(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? '오류가 발생했습니다')
    }
    return res.status === 204 ? null : res.json()
  }

  async function uploadGameCover(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('game-covers').upload(filename, file)
    if (error) { showToast('이미지 업로드 실패: ' + error.message); return null }
    return supabase.storage.from('game-covers').getPublicUrl(filename).data.publicUrl
  }

  function handleFileSelect(
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (url: string) => void,
  ) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('JPG, PNG, WebP 파일만 지원합니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function addGame() {
    const errs: Record<string, string> = {}
    if (!fTitle.trim()) errs.title = '제목을 입력해주세요'
    if (!fDev.trim())   errs.dev   = '개발사를 입력해주세요'
    if (!fYear)         errs.year  = '출시연도를 입력해주세요'
    if (!fGenre)        errs.genre = '장르를 선택해주세요'
    if (!fPlats.length) errs.plat  = '플랫폼을 하나 이상 선택해주세요'
    setFErrors(errs)
    if (Object.keys(errs).length) return

    try {
      let coverUrl: string | null = fImg.trim() || null
      if (fFile) {
        coverUrl = await uploadGameCover(fFile)
        if (!coverUrl) return
      }
      const data = await apiCall('/api/games', 'POST', {
        title: fTitle.trim(), developer: fDev.trim(),
        publisher: fPub.trim() || fDev.trim(),
        year: Number(fYear), genre: fGenre, platforms: fPlats,
        age_rating: fRating, status: fStatus,
        cover_url: coverUrl, description: fDesc.trim() || null,
      })
      setGames([data, ...games])
      resetForm()
      showToast(`✅ "${data.title}" 게임이 등록됐어요!`)
    } catch (e: unknown) {
      showToast(`⚠️ ${(e as Error).message}`)
    }
  }

  function resetForm() {
    setFTitle(''); setFDev(''); setFPub(''); setFYear(''); setFGenre('')
    setFRating('전체이용가'); setFStatus('published'); setFImg(''); setFDesc('')
    setFPlats([]); setFErrors({}); setFFile(null); setFPreview('')
  }

  async function deleteGame(id: number, title: string) {
    setConfirm({
      title: '게임을 삭제할까요?',
      desc: `"${title}"을 삭제하면 관련 리뷰도 제거됩니다.`,
      onOk: async () => {
        await apiCall(`/api/games/${id}`, 'DELETE')
        setGames(games.filter((g) => g.id !== id))
        showToast(`🗑️ "${title}"이 삭제됐어요`)
      },
    })
  }

  async function saveEdit() {
    if (!editGame) return
    try {
      let coverUrl = editGame.cover_url
      if (editFile) {
        const uploaded = await uploadGameCover(editFile)
        if (!uploaded) return
        coverUrl = uploaded
      }
      const data = await apiCall(`/api/games/${editGame.id}`, 'PATCH', {
        title: editGame.title, developer: editGame.developer,
        year: editGame.year, genre: editGame.genre, status: editGame.status,
        cover_url: coverUrl,
      })
      setGames(games.map((g) => (g.id === data.id ? data : g)))
      setEditGame(null); setEditFile(null); setEditPreview('')
      showToast(`✅ "${data.title}" 정보가 수정됐어요`)
    } catch (e: unknown) { showToast(`⚠️ ${(e as Error).message}`) }
  }

  async function approveJournalist(id: number) {
    await apiCall(`/api/admin/journalists/${id}`, 'PATCH', { status: 'approved' })
    setJournalists(journalists.map((j) => j.id === id ? { ...j, status: 'approved' } : j))
    showToast('✅ 기자가 승인됐어요')
  }
  async function removeJournalist(id: number, name: string) {
    setConfirm({
      title: '계정을 삭제할까요?',
      desc: `${name} 기자의 계정을 삭제합니다.`,
      onOk: async () => {
        await apiCall(`/api/admin/journalists/${id}`, 'DELETE')
        setJournalists(journalists.filter((j) => j.id !== id))
        showToast(`🗑️ "${name}" 계정이 삭제됐어요`)
      },
    })
  }

  async function resolveReport(id: number) {
    await apiCall(`/api/admin/reports/${id}`, 'DELETE')
    setReports(reports.filter((r) => r.id !== id))
    showToast('✅ 신고가 처리됐어요')
  }

  async function saveFeatured() {
    await apiCall('/api/admin/settings', 'PATCH', { key: 'featured_game_id', value: String(tmpFeatId) })
    setFeaturedId(tmpFeatId)
    const g = games.find((x) => x.id === tmpFeatId)
    showToast(`⭐ "${g?.title}"이 메인에 노출됩니다`)
  }

  const pending  = journalists.filter((j) => j.status === 'pending')
  const approved = journalists.filter((j) => j.status === 'approved')
  const featured = games.find((g) => g.id === featuredId)

  return (
    <div className={s.layout}>
      {/* SIDEBAR */}
      <aside className={s.sidebar}>
        <div className={s.sbLogo}>
          <span className={s.sbLogoText}>KRIT<span>IK</span></span>
          <span className={s.adminBadge}>Admin</span>
        </div>
        <nav className={s.sbNav}>
          <div className={s.sbGroupLabel}>대시보드</div>
          <button className={`${s.sbItem} ${page === 'dashboard' ? s.sbActive : ''}`} onClick={() => setPage('dashboard')}>
            <span>📊</span> 개요
          </button>
          <div className={s.sbGroupLabel}>콘텐츠</div>
          <button className={`${s.sbItem} ${page === 'games' ? s.sbActive : ''}`} onClick={() => setPage('games')}>
            <span>🎮</span> 게임 목록
          </button>
          <button className={`${s.sbItem} ${page === 'add' ? s.sbActive : ''}`} onClick={() => setPage('add')}>
            <span>➕</span> 게임 등록
          </button>
          <button className={`${s.sbItem} ${page === 'featured' ? s.sbActive : ''}`} onClick={() => setPage('featured')}>
            <span>⭐</span> 메인 노출 설정
          </button>
          <div className={s.sbGroupLabel}>사용자</div>
          <button className={`${s.sbItem} ${page === 'journalists' ? s.sbActive : ''}`} onClick={() => setPage('journalists')}>
            <span>✍️</span> 기자 계정 관리
            {pending.length > 0 && <span className={s.sbChip}>{pending.length}</span>}
          </button>
          <div className={s.sbGroupLabel}>신고</div>
          <button className={`${s.sbItem} ${page === 'reports' ? s.sbActive : ''}`} onClick={() => setPage('reports')}>
            <span>🚨</span> 리뷰 신고
            {reports.length > 0 && <span className={s.sbChip}>{reports.length}</span>}
          </button>
        </nav>
        <div className={s.sbFooter}>
          <div className={s.sbUser}>
            <div className={s.sbAvatar}>관</div>
            <div>
              <div className={s.sbUserName}>관리자</div>
              <div className={s.sbUserEmail}>admin@kritik.kr</div>
            </div>
          </div>
          <button
            className={s.logoutBtn}
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/login')
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className={s.main}>
        <div className={s.topbar}>
          <div className={s.topbarLeft}>
            <span className={s.crumb}>KRITIK</span>
            <span className={s.crumbSep}>/</span>
            <span className={s.crumbPage}>
              {{ dashboard: '대시보드', games: '게임 목록', add: '게임 등록',
                 featured: '메인 노출 설정', journalists: '기자 계정 관리', reports: '리뷰 신고' }[page]}
            </span>
          </div>
          <div className={s.topbarRight}>
            <Link href="/" target="_blank" className={`${s.btn} ${s.btnGhost}`}>사이트 보기 ↗</Link>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setPage('add')}>+ 게임 등록</button>
          </div>
        </div>

        <div className={s.content}>

          {/* ── 대시보드 ── */}
          {page === 'dashboard' && (
            <div>
              <div className={s.statRow}>
                <div className={s.statCard}>
                  <div className={s.statTop}><div className={`${s.statIcon} ${s.siBlue}`}>🎮</div><span className={s.statChange}>전체</span></div>
                  <div className={s.statNum}>{games.length}</div>
                  <div className={s.statLabel}>등록된 게임</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statTop}><div className={`${s.statIcon} ${s.siGold}`}>✍️</div><span className={s.statChange}>활동 중</span></div>
                  <div className={s.statNum}>{approved.length}</div>
                  <div className={s.statLabel}>활동 중인 기자</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statTop}><div className={`${s.statIcon} ${s.siGreen}`}>📝</div><span className={`${s.statChange} ${s.warn}`}>대기 {pending.length}명</span></div>
                  <div className={s.statNum}>{pending.length}</div>
                  <div className={s.statLabel}>승인 대기 기자</div>
                </div>
                <div className={s.statCard}>
                  <div className={s.statTop}><div className={`${s.statIcon} ${s.siRed}`}>🚨</div><span className={`${s.statChange} ${s.warn}`}>미처리</span></div>
                  <div className={s.statNum}>{reports.length}</div>
                  <div className={s.statLabel}>신고 건수</div>
                </div>
              </div>

              <div className={s.dashGrid}>
                <div className={s.card}>
                  <div className={s.cardHead}>
                    <span className={s.cardTitle}>최근 등록 게임</span>
                    <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setPage('games')}>전체 보기</button>
                  </div>
                  <table className={s.table}>
                    <thead><tr><th>게임</th><th>점수</th><th>상태</th></tr></thead>
                    <tbody>
                      {games.slice(0, 5).map((g) => {
                        const sb = statusBadge(g.status)
                        return (
                          <tr key={g.id}>
                            <td><div className={s.gameCell}>
                              {g.cover_url && <img src={g.cover_url} className={s.gameThumb} alt={g.title} />}
                              <div><div className={s.gameName}>{g.title}</div><div className={s.gameDev}>{g.developer}</div></div>
                            </div></td>
                            <td><span className={`${s.chip} ${scoreChipClass(g.critic_score)}`}>{g.critic_score ?? 'TBD'}</span></td>
                            <td><span className={`${s.badge} ${sb.cls}`}>{sb.label}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className={s.card}>
                    <div className={s.cardHead}>
                      <span className={s.cardTitle}>승인 대기 기자</span>
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setPage('journalists')}>전체 보기</button>
                    </div>
                    <div className={s.dashPending}>
                      {pending.length === 0 ? (
                        <div className={s.emptyS}>✅ 대기 없음</div>
                      ) : pending.map((j) => (
                        <div key={j.id} className={s.pendingRow}>
                          <div className={s.pendingInfo}>
                            <div className={s.jAvatar}>{j.name[0]}</div>
                            <div><div className={s.jName}>{j.name}</div><div className={s.jMedia}>{j.media}</div></div>
                          </div>
                          <div className={s.pendingBtns}>
                            <button className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} onClick={() => approveJournalist(j.id)}>승인</button>
                            <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => removeJournalist(j.id, j.name)}>거절</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {featured && (
                    <div className={s.card} style={{ marginTop: '1.2rem' }}>
                      <div className={s.cardHead}>
                        <span className={s.cardTitle}>메인 노출 게임</span>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setPage('featured')}>변경</button>
                      </div>
                      <div className={s.featCur}>
                        {featured.cover_url && <img src={featured.cover_url} alt={featured.title} className={s.featCurImg} />}
                        <div>
                          <div className={s.featCurLabel}>메인 노출 중</div>
                          <div className={s.featCurTitle}>{featured.title}</div>
                          <div className={s.featCurSub}>{featured.developer} · {featured.year}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 게임 목록 ── */}
          {page === 'games' && (
            <div>
              <div className={s.toolbar}>
                <div className={s.searchWrap}>
                  <span className={s.searchIc}>🔍</span>
                  <input className={s.formInput} type="text" placeholder="게임 검색..."
                    value={gSearch} onChange={(e) => setGSearch(e.target.value)} />
                </div>
                <select className={s.formSelect} value={gStatus} onChange={(e) => setGStatus(e.target.value)}>
                  <option value="">전체 상태</option>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="upcoming">출시예정</option>
                </select>
                <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => setPage('add')}>+ 등록</button>
              </div>
              <div className={s.card}>
                <table className={s.table}>
                  <thead><tr><th>게임</th><th>장르</th><th>플랫폼</th><th>연도</th><th>점수</th><th>상태</th><th>관리</th></tr></thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={7}><div className={s.emptyS}>🔍 검색 결과가 없습니다</div></td></tr>
                    )}
                    {filtered.map((g) => {
                      const sb = statusBadge(g.status)
                      return (
                        <tr key={g.id}>
                          <td><div className={s.gameCell}>
                            {g.cover_url && <img src={g.cover_url} className={s.gameThumb} alt={g.title} />}
                            <div><div className={s.gameName}>{g.title}</div><div className={s.gameDev}>{g.developer}</div></div>
                          </div></td>
                          <td><span style={{ fontSize: '0.78rem' }}>{g.genre}</span></td>
                          <td>{g.platforms.map((p) => <span key={p} className={`${s.badge} ${s.bGray}`} style={{ marginRight: 2, fontSize: '0.58rem' }}>{p}</span>)}</td>
                          <td><span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.78rem' }}>{g.year}</span></td>
                          <td><span className={`${s.chip} ${scoreChipClass(g.critic_score)}`}>{g.critic_score ?? 'TBD'}</span></td>
                          <td><span className={`${s.badge} ${sb.cls}`}>{sb.label}</span></td>
                          <td>
                            <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginRight: 4 }} onClick={() => { setEditGame(g); setEditFile(null); setEditPreview(g.cover_url ?? '') }}>수정</button>
                            <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => deleteGame(g.id, g.title)}>삭제</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 게임 등록 ── */}
          {page === 'add' && (
            <div style={{ maxWidth: 620 }}>
              <div className={s.card}>
                <div className={s.cardHead}><span className={s.cardTitle}>새 게임 등록</span></div>
                <div className={s.cardBody}>
                  <div className={s.formSectionTitle}>기본 정보</div>
                  <div className={s.formGrid}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>게임 제목 <span className={s.req}>*</span></label>
                      <input className={s.formInput} value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="예) Elden Ring" />
                      {fErrors.title && <span className={s.formError}>{fErrors.title}</span>}
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>개발사 <span className={s.req}>*</span></label>
                      <input className={s.formInput} value={fDev} onChange={(e) => setFDev(e.target.value)} placeholder="예) FromSoftware" />
                      {fErrors.dev && <span className={s.formError}>{fErrors.dev}</span>}
                    </div>
                  </div>
                  <div className={s.formGrid}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>배급사</label>
                      <input className={s.formInput} value={fPub} onChange={(e) => setFPub(e.target.value)} placeholder="예) Bandai Namco" />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>출시연도 <span className={s.req}>*</span></label>
                      <input className={s.formInput} type="number" value={fYear} onChange={(e) => setFYear(e.target.value)} placeholder="2024" />
                      {fErrors.year && <span className={s.formError}>{fErrors.year}</span>}
                    </div>
                  </div>
                  <div className={s.formGrid3}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>장르 <span className={s.req}>*</span></label>
                      <select className={s.formSelect} value={fGenre} onChange={(e) => setFGenre(e.target.value)}>
                        <option value="">선택</option>
                        {GENRES.map((g) => <option key={g}>{g}</option>)}
                      </select>
                      {fErrors.genre && <span className={s.formError}>{fErrors.genre}</span>}
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>이용등급</label>
                      <select className={s.formSelect} value={fRating} onChange={(e) => setFRating(e.target.value)}>
                        {RATINGS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>상태</label>
                      <select className={s.formSelect} value={fStatus} onChange={(e) => setFStatus(e.target.value as Game['status'])}>
                        <option value="published">공개</option>
                        <option value="draft">임시저장</option>
                        <option value="upcoming">출시예정</option>
                      </select>
                    </div>
                  </div>

                  <div className={s.formSectionTitle} style={{ marginTop: '1rem' }}>플랫폼 <span className={s.req}>*</span></div>
                  <div className={s.platWrap}>
                    {PLATFORMS.map((p) => (
                      <label key={p} className={`${s.platLbl} ${fPlats.includes(p) ? s.platOn : ''}`}>
                        <input type="checkbox" checked={fPlats.includes(p)}
                          onChange={(e) => setFPlats(e.target.checked ? [...fPlats, p] : fPlats.filter((x) => x !== p))} />
                        {p}
                      </label>
                    ))}
                  </div>
                  {fErrors.plat && <span className={s.formError}>{fErrors.plat}</span>}

                  <div className={s.formSectionTitle} style={{ marginTop: '1rem' }}>미디어</div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>커버 이미지</label>
                    {(fPreview || fImg) && (
                      <div className={s.imgPreviewWrap}>
                        <img className={s.imgPreview} src={fPreview || fImg} alt="미리보기" />
                        <button className={s.imgRemove} onClick={() => { setFFile(null); setFPreview(''); setFImg('') }}>제거</button>
                      </div>
                    )}
                    <label className={s.uploadBtn}>
                      파일 업로드
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFileSelect(f, setFFile, setFPreview); setFImg('') } }} />
                    </label>
                    <div className={s.uploadHint}>JPG, PNG, WebP · 최대 5MB</div>
                    <div className={s.uploadOr}>또는 URL 직접 입력</div>
                    <input className={s.formInput} value={fImg} onChange={(e) => { setFImg(e.target.value); setFFile(null); setFPreview('') }} placeholder="https://..." disabled={!!fFile} />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>게임 소개</label>
                    <textarea className={`${s.formInput} ${s.formTextarea}`} value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3} placeholder="게임에 대한 간략한 소개..." />
                  </div>

                  <div className={s.formActions}>
                    <button className={`${s.btn} ${s.btnPrimary}`} onClick={addGame}>게임 등록하기</button>
                    <button className={`${s.btn} ${s.btnGhost}`} onClick={resetForm}>초기화</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 메인 노출 설정 ── */}
          {page === 'featured' && (
            <div>
              {featured && (
                <div className={s.card} style={{ marginBottom: '1.5rem' }}>
                  <div className={s.cardHead}><span className={s.cardTitle}>현재 메인 노출 게임</span></div>
                  <div className={s.featCur} style={{ margin: '1rem 1.2rem' }}>
                    {featured.cover_url && <img src={featured.cover_url} alt={featured.title} className={s.featCurImg} />}
                    <div>
                      <div className={s.featCurLabel}>현재 노출 중</div>
                      <div className={s.featCurTitle}>{featured.title}</div>
                      <div className={s.featCurSub}>{featured.developer} · {featured.year}</div>
                    </div>
                  </div>
                </div>
              )}
              <div className={s.card}>
                <div className={s.cardHead}>
                  <span className={s.cardTitle}>노출 게임 변경</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted-light)' }}>게임을 클릭해서 선택하세요</span>
                </div>
                <div className={s.featGrid}>
                  {games.filter((g) => g.status === 'published').map((g) => (
                    <div key={g.id} className={`${s.fcard} ${tmpFeatId === g.id ? s.fcardSel : ''}`} onClick={() => setTmpFeatId(g.id)}>
                      {tmpFeatId === g.id && <div className={s.fcardChk}>✓</div>}
                      {g.cover_url && <img src={g.cover_url} alt={g.title} />}
                      <div className={s.fcardBody}>
                        <div className={s.fcardTitle}>{g.title}</div>
                        <div className={s.fcardDev}>{g.developer}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={s.featActions}>
                  <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setTmpFeatId(featuredId)}>취소</button>
                  <button className={`${s.btn} ${s.btnPrimary}`} onClick={saveFeatured}>저장하기</button>
                </div>
              </div>
            </div>
          )}

          {/* ── 기자 계정 관리 ── */}
          {page === 'journalists' && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>
                승인 대기 <span style={{ color: 'var(--orange)' }}>({pending.length}명)</span>
              </div>
              <div className={s.jGrid}>
                {pending.length === 0 && <div className={s.emptyS} style={{ gridColumn: '1/-1' }}>✅ 승인 대기 없음</div>}
                {pending.map((j) => (
                  <div key={j.id} className={s.jCard}>
                    <div className={s.jCardTop}>
                      <div className={`${s.jAvatar} ${s.avP}`}>{j.name[0]}</div>
                      <div><div className={s.jName}>{j.name}</div><div className={s.jMedia}>{j.media}</div></div>
                      <span className={`${s.badge} ${s.bOrange}`} style={{ marginLeft: 'auto' }}>대기</span>
                    </div>
                    <div className={s.jRows}>
                      <div className={s.jRow}><span className={s.jKey}>이메일</span><span>{j.email}</span></div>
                      <div className={s.jRow}><span className={s.jKey}>신청일</span><span>{j.joined_at}</span></div>
                    </div>
                    <div className={s.jBtns}>
                      <button className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} style={{ flex: 1 }} onClick={() => approveJournalist(j.id)}>✓ 승인</button>
                      <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} style={{ flex: 1 }} onClick={() => removeJournalist(j.id, j.name)}>✕ 거절</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className={s.divider} />
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>
                승인된 기자 <span style={{ color: 'var(--text-muted-light)' }}>({approved.length}명)</span>
              </div>
              <div className={s.jGrid}>
                {approved.map((j) => (
                  <div key={j.id} className={s.jCard}>
                    <div className={s.jCardTop}>
                      <div className={`${s.jAvatar} ${s.avA}`}>{j.name[0]}</div>
                      <div><div className={s.jName}>{j.name}</div><div className={s.jMedia}>{j.media}</div></div>
                      <span className={`${s.badge} ${s.bGreen}`} style={{ marginLeft: 'auto' }}>승인</span>
                    </div>
                    <div className={s.jRows}>
                      <div className={s.jRow}><span className={s.jKey}>이메일</span><span>{j.email}</span></div>
                      <div className={s.jRow}><span className={s.jKey}>리뷰 수</span><span>{j.review_count}편</span></div>
                    </div>
                    <div className={s.jBtns}>
                      <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} style={{ flex: 1 }} onClick={() => removeJournalist(j.id, j.name)}>계정 정지</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 리뷰 신고 ── */}
          {page === 'reports' && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>
                미처리 신고 <span style={{ color: 'var(--red-admin)' }}>({reports.length}건)</span>
              </div>
              {reports.length === 0 && <div className={s.emptyS}>🎉 처리할 신고가 없습니다</div>}
              {reports.map((r) => (
                <div key={r.id} className={s.rCard}>
                  <div className={s.rCardTop}>
                    <div className={s.rCardMeta}>
                      <span className={`${s.badge} ${s.bRed}`}>{r.reason}</span>
                      <span style={{ fontWeight: 700 }}>{r.game_title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted-light)' }}>@{r.user_nickname}</span>
                      <span className={`${s.badge} ${s.bOrange}`}>신고 {r.report_count}건</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted-light)', fontFamily: "'DM Mono',monospace" }}>{r.reported_at}</span>
                  </div>
                  <div className={s.rCardBody}>{r.review_text}</div>
                  <div className={s.rCardFoot}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted-light)' }}>신고된 리뷰 내용</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => resolveReport(r.id)}>🗑️ 리뷰 삭제</button>
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => resolveReport(r.id)}>무시하기</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 편집 모달 */}
      {editGame && (
        <div className={s.modalBg} onClick={(e) => { if (e.target === e.currentTarget) setEditGame(null) }}>
          <div className={s.modal}>
            <div className={s.modalHead}>
              <span className={s.modalTitle}>게임 정보 수정</span>
              <button className={s.modalClose} onClick={() => setEditGame(null)}>✕</button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>게임 제목</label>
                  <input className={s.formInput} value={editGame.title} onChange={(e) => setEditGame({ ...editGame, title: e.target.value })} />
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>개발사</label>
                  <input className={s.formInput} value={editGame.developer} onChange={(e) => setEditGame({ ...editGame, developer: e.target.value })} />
                </div>
              </div>
              <div className={s.formGrid}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>장르</label>
                  <select className={s.formSelect} value={editGame.genre} onChange={(e) => setEditGame({ ...editGame, genre: e.target.value })}>
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>출시연도</label>
                  <input className={s.formInput} type="number" value={editGame.year} onChange={(e) => setEditGame({ ...editGame, year: Number(e.target.value) })} />
                </div>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>상태</label>
                <select className={s.formSelect} value={editGame.status} onChange={(e) => setEditGame({ ...editGame, status: e.target.value as Game['status'] })}>
                  <option value="published">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="upcoming">출시예정</option>
                </select>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>커버 이미지</label>
                {(editPreview) && (
                  <div className={s.imgPreviewWrap}>
                    <img className={s.imgPreview} src={editPreview} alt="미리보기" />
                    <button className={s.imgRemove} onClick={() => { setEditFile(null); setEditPreview(''); setEditGame({ ...editGame, cover_url: null }) }}>제거</button>
                  </div>
                )}
                <label className={s.uploadBtn}>
                  파일 업로드
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setEditFile, setEditPreview) }} />
                </label>
                <div className={s.uploadHint}>JPG, PNG, WebP · 최대 5MB</div>
                <div className={s.uploadOr}>또는 URL 직접 입력</div>
                <input className={s.formInput} value={editGame.cover_url ?? ''} onChange={(e) => { setEditGame({ ...editGame, cover_url: e.target.value || null }); setEditFile(null); setEditPreview(e.target.value) }} placeholder="https://..." disabled={!!editFile} />
              </div>
            </div>
            <div className={s.modalFoot}>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setEditGame(null)}>취소</button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={saveEdit}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 다이얼로그 */}
      {confirm && (
        <div className={s.confirmBg} onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className={s.confirmBox}>
            <div className={s.confirmIcon}>⚠️</div>
            <div className={s.confirmTitle}>{confirm.title}</div>
            <div className={s.confirmDesc}>{confirm.desc}</div>
            <div className={s.confirmBtns}>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setConfirm(null)}>취소</button>
              <button className={`${s.btn} ${s.btnDanger}`} onClick={() => { confirm.onOk(); setConfirm(null) }}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <div className={s.toast}>{toast}</div>}
    </div>
  )
}
