'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Journalist } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import s from './cms.module.css'

interface GameBasic {
  id: number
  title: string
  cover_url: string | null
  developer: string
  year: number
}

interface CriticReviewRow {
  id: number
  game_id: number
  media: string
  reviewer_name: string
  score: number
  review_text: string
  published_at: string
}

interface Props {
  games: GameBasic[]
  journalists: Journalist[]
}

type Tab = 'write' | 'myReviews' | 'profile'

export default function CmsClient({ games, journalists }: Props) {
  const [tab, setTab] = useState<Tab>('write')

  // 현재 로그인된 기자 (실제 서비스에서는 Supabase Auth 세션 사용)
  const [journalist, setJournalist] = useState<Journalist | null>(
    journalists.length > 0 ? journalists[0] : null
  )

  // 리뷰 목록
  const [myReviews, setMyReviews] = useState<CriticReviewRow[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)

  // 리뷰 작성 폼
  const [selGame, setSelGame] = useState<GameBasic | null>(null)
  const [gameSearch, setGameSearch] = useState('')
  const [gameDropOpen, setGameDropOpen] = useState(false)
  const [score, setScore] = useState('')
  const [scoreHover, setScoreHover] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 점수 미리보기 색상
  const scoreNum = Number(score)
  function scoreCls(n: number) {
    if (n >= 90) return s.scoreGreat
    if (n >= 75) return s.scoreGood
    return s.scoreBad
  }

  const filteredGames = gameSearch.trim()
    ? games.filter((g) => g.title.toLowerCase().includes(gameSearch.toLowerCase()))
    : games

  async function loadMyReviews() {
    if (!journalist) return
    setLoadingReviews(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('critic_reviews')
      .select('*')
      .eq('reviewer_name', journalist.name)
      .order('published_at', { ascending: false })
    setMyReviews(data ?? [])
    setLoadingReviews(false)
  }

  async function submitReview() {
    if (!journalist) { setErrorMsg('기자 계정을 선택해주세요'); return }
    if (!selGame) { setErrorMsg('게임을 선택해주세요'); return }
    if (!score || scoreNum < 0 || scoreNum > 100) { setErrorMsg('점수를 0~100 사이로 입력해주세요'); return }
    if (reviewText.trim().length < 50) { setErrorMsg('리뷰를 50자 이상 입력해주세요'); return }

    setSubmitting(true)
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.from('critic_reviews').insert({
      game_id: selGame.id,
      media: journalist.media,
      reviewer_name: journalist.name,
      score: scoreNum,
      review_text: reviewText.trim(),
      published_at: publishDate,
    })

    setSubmitting(false)

    if (error) { setErrorMsg(error.message); return }

    setSuccessMsg(`✅ "${selGame.title}" 리뷰가 등록됐습니다!`)
    setSelGame(null)
    setScore('')
    setReviewText('')
    setPublishDate(new Date().toISOString().slice(0, 10))

    setTimeout(() => setSuccessMsg(''), 3000)
  }

  return (
    <div className={s.layout}>
      {/* SIDEBAR */}
      <aside className={s.sidebar}>
        <div className={s.sbLogo}>
          <div>
            <div className={s.sbLogoTop}>
              <span className={s.sbLogoText}>KRIT<span>IK</span></span>
              <span className={s.cmsBadge}>CMS</span>
            </div>
            <div className={s.sbLogoSub}>기자 리뷰 작성 시스템</div>
          </div>
        </div>

        {/* 기자 선택 (실제 서비스에서는 Supabase Auth로 대체) */}
        <div className={s.journalistSelect}>
          <div className={s.jsLabel}>현재 기자 계정</div>
          <select
            className={s.jsSelect}
            value={journalist?.id ?? ''}
            onChange={(e) => {
              const j = journalists.find((x) => x.id === Number(e.target.value))
              setJournalist(j ?? null)
            }}
          >
            <option value="">기자 선택...</option>
            {journalists.map((j) => (
              <option key={j.id} value={j.id}>{j.name} ({j.media})</option>
            ))}
          </select>
        </div>

        <nav className={s.sbNav}>
          <button
            className={`${s.sbItem} ${tab === 'write' ? s.sbActive : ''}`}
            onClick={() => setTab('write')}
          >
            <span>✍️</span> 리뷰 작성
          </button>
          <button
            className={`${s.sbItem} ${tab === 'myReviews' ? s.sbActive : ''}`}
            onClick={() => { setTab('myReviews'); loadMyReviews() }}
          >
            <span>📋</span> 내 리뷰
          </button>
          <button
            className={`${s.sbItem} ${tab === 'profile' ? s.sbActive : ''}`}
            onClick={() => setTab('profile')}
          >
            <span>👤</span> 내 프로필
          </button>
        </nav>

        <div className={s.sbFooter}>
          {journalist ? (
            <div className={s.sbUser}>
              <div className={s.sbAvatar}>{journalist.name[0]}</div>
              <div>
                <div className={s.sbUserName}>{journalist.name}</div>
                <div className={s.sbUserMedia}>{journalist.media}</div>
              </div>
            </div>
          ) : (
            <div className={s.sbUserEmpty}>기자를 선택해주세요</div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className={s.main}>
        <div className={s.topbar}>
          <div className={s.topbarLeft}>
            <span className={s.crumb}>KRITIK CMS</span>
            <span className={s.crumbSep}>/</span>
            <span className={s.crumbPage}>
              {{ write: '리뷰 작성', myReviews: '내 리뷰', profile: '내 프로필' }[tab]}
            </span>
          </div>
          <div className={s.topbarRight}>
            <Link href="/" className={`${s.btn} ${s.btnGhost}`}>사이트 보기 ↗</Link>
            <Link href="/admin" className={`${s.btn} ${s.btnGhost}`}>Admin ↗</Link>
          </div>
        </div>

        <div className={s.content}>

          {/* ── 리뷰 작성 ── */}
          {tab === 'write' && (
            <div className={s.writeGrid}>
              {/* 왼쪽: 폼 */}
              <div>
                {successMsg && <div className={s.successBanner}>{successMsg}</div>}
                {errorMsg   && <div className={s.errorBanner}>{errorMsg}</div>}

                {/* 게임 선택 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>게임 선택 *</div>
                  <div className={s.gameSelectWrap}>
                    {selGame ? (
                      <div className={s.selectedGame}>
                        {selGame.cover_url && <img src={selGame.cover_url} alt={selGame.title} className={s.selectedGameImg} />}
                        <div className={s.selectedGameInfo}>
                          <div className={s.selectedGameTitle}>{selGame.title}</div>
                          <div className={s.selectedGameSub}>{selGame.developer} · {selGame.year}</div>
                        </div>
                        <button className={s.clearGameBtn} onClick={() => setSelGame(null)}>✕ 변경</button>
                      </div>
                    ) : (
                      <div className={s.gameSearchBox}>
                        <input
                          type="text"
                          className={s.formInput}
                          placeholder="게임 이름으로 검색..."
                          value={gameSearch}
                          onChange={(e) => { setGameSearch(e.target.value); setGameDropOpen(true) }}
                          onFocus={() => setGameDropOpen(true)}
                          onBlur={() => setTimeout(() => setGameDropOpen(false), 200)}
                        />
                        {gameDropOpen && filteredGames.length > 0 && (
                          <div className={s.gameDrop}>
                            {filteredGames.slice(0, 8).map((g) => (
                              <div key={g.id} className={s.gameDropItem} onMouseDown={() => { setSelGame(g); setGameSearch(''); setGameDropOpen(false) }}>
                                {g.cover_url && <img src={g.cover_url} alt={g.title} className={s.gameDropImg} />}
                                <div>
                                  <div className={s.gameDropTitle}>{g.title}</div>
                                  <div className={s.gameDropSub}>{g.developer} · {g.year}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 점수 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>점수 (0 – 100) *</div>
                  <div className={s.scoreInputWrap}>
                    <input
                      type="number" min={0} max={100}
                      className={`${s.formInput} ${s.scoreInput}`}
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="예) 92"
                    />
                    {score && (
                      <div className={`${s.scorePreview} ${scoreCls(scoreNum)}`}>
                        {scoreNum}
                      </div>
                    )}
                  </div>
                  <div className={s.scoreQuickBtns}>
                    {[100,95,90,85,80,75,70].map((n) => (
                      <button key={n} className={`${s.scoreQuick} ${scoreCls(n)}`} onClick={() => setScore(String(n))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 리뷰 텍스트 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>리뷰 본문 * <span className={s.charCount}>{reviewText.length}자</span></div>
                  <textarea
                    className={s.reviewTextarea}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="게임에 대한 전문적인 리뷰를 작성해주세요 (최소 50자)..."
                    rows={10}
                  />
                </div>

                {/* 게재 날짜 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>게재 날짜</div>
                  <input
                    type="date"
                    className={s.formInput}
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </div>

                <button className={s.submitBtn} onClick={submitReview} disabled={submitting || !journalist}>
                  {submitting ? '등록 중...' : '리뷰 게재하기'}
                </button>
              </div>

              {/* 오른쪽: 미리보기 */}
              <div className={s.previewPanel}>
                <div className={s.previewTitle}>미리보기</div>
                <div className={s.previewCard}>
                  <div className={s.previewCardTop}>
                    <div className={s.previewInfo}>
                      <span className={s.previewMedia}>{journalist?.media ?? '— 매체 —'}</span>
                      <span className={s.previewReviewer}>{journalist?.name ?? '— 기자명 —'}</span>
                    </div>
                    <div className={`${s.previewScore} ${score ? scoreCls(scoreNum) : s.scoreTbd}`}>
                      {score || '—'}
                    </div>
                  </div>
                  {selGame && (
                    <div className={s.previewGame}>
                      {selGame.cover_url && <img src={selGame.cover_url} alt={selGame.title} className={s.previewGameImg} />}
                      <div>
                        <div className={s.previewGameTitle}>{selGame.title}</div>
                        <div className={s.previewGameSub}>{selGame.developer}</div>
                      </div>
                    </div>
                  )}
                  <div className={s.previewText}>
                    {reviewText || <span style={{ opacity: 0.4 }}>리뷰 내용이 여기 표시됩니다...</span>}
                  </div>
                  <div className={s.previewDate}>{publishDate}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── 내 리뷰 ── */}
          {tab === 'myReviews' && (
            <div>
              {loadingReviews && <div className={s.loading}>로딩 중...</div>}
              {!loadingReviews && myReviews.length === 0 && (
                <div className={s.emptyS}>📝 작성한 리뷰가 없습니다</div>
              )}
              {myReviews.map((r) => {
                const game = games.find((g) => g.id === r.game_id)
                const n = r.score
                const cls = n >= 90 ? s.csGreat : n >= 75 ? s.csGood : s.csBad
                return (
                  <div key={r.id} className={s.myReviewCard}>
                    <div className={s.myRTop}>
                      <div className={s.myRLeft}>
                        {game?.cover_url && <img src={game.cover_url} alt={game.title} className={s.myRImg} />}
                        <div>
                          <div className={s.myRGame}>{game?.title ?? `게임 #${r.game_id}`}</div>
                          <div className={s.myRMeta}>{r.media} · {r.published_at}</div>
                        </div>
                      </div>
                      <div className={`${s.myRScore} ${cls}`}>{r.score}</div>
                    </div>
                    <div className={s.myRText}>{r.review_text}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 내 프로필 ── */}
          {tab === 'profile' && journalist && (
            <div style={{ maxWidth: 480 }}>
              <div className={s.profileCard}>
                <div className={s.profileAvatar}>{journalist.name[0]}</div>
                <div className={s.profileName}>{journalist.name}</div>
                <div className={s.profileMedia}>{journalist.media}</div>
                <div className={s.profileStats}>
                  <div className={s.profileStat}>
                    <div className={s.profileStatNum}>{journalist.review_count}</div>
                    <div className={s.profileStatLabel}>작성 리뷰</div>
                  </div>
                  <div className={s.profileStat}>
                    <div className={`${s.profileStatNum} ${journalist.status === 'approved' ? s.approved : s.pending}`}>
                      {journalist.status === 'approved' ? '승인됨' : '대기 중'}
                    </div>
                    <div className={s.profileStatLabel}>계정 상태</div>
                  </div>
                </div>
                <div className={s.profileInfo}>
                  <div className={s.profileInfoRow}>
                    <span>이메일</span><span>{journalist.email}</span>
                  </div>
                  <div className={s.profileInfoRow}>
                    <span>가입일</span><span>{journalist.joined_at}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
