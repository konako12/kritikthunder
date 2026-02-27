'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  journalist: Journalist
  initialReviews: CriticReviewRow[]
}

type Tab = 'write' | 'myReviews' | 'profile'

function scoreCls(n: number, s: Record<string, string>) {
  if (n >= 90) return s.scoreGreat
  if (n >= 75) return s.scoreGood
  return s.scoreBad
}

export default function CmsClient({ games, journalist, initialReviews }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('write')

  // ── 리뷰 목록 (서버 초기값 + 클라이언트 갱신)
  const [myReviews, setMyReviews] = useState<CriticReviewRow[]>(initialReviews)
  const [reviewCount, setReviewCount] = useState(journalist.review_count)

  // ── 리뷰 작성 폼
  const [selGame, setSelGame] = useState<GameBasic | null>(null)
  const [gameSearch, setGameSearch] = useState('')
  const [gameDropOpen, setGameDropOpen] = useState(false)
  const [score, setScore] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // ── 리뷰 수정 상태
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editScore, setEditScore] = useState('')
  const [editText, setEditText] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const scoreNum = Number(score)
  const filteredGames = gameSearch.trim()
    ? games.filter((g) => g.title.toLowerCase().includes(gameSearch.toLowerCase()))
    : games

  // ── 로그아웃
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // ── 리뷰 등록
  async function submitReview() {
    if (!selGame) { setErrorMsg('게임을 선택해주세요'); return }
    if (!score || scoreNum < 0 || scoreNum > 100) { setErrorMsg('점수를 0~100 사이로 입력해주세요'); return }
    if (reviewText.trim().length < 50) { setErrorMsg('리뷰를 50자 이상 입력해주세요'); return }

    setSubmitting(true)
    setErrorMsg('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('critic_reviews')
      .insert({
        game_id: selGame.id,
        media: journalist.media,
        reviewer_name: journalist.name,
        score: scoreNum,
        review_text: reviewText.trim(),
        published_at: publishDate,
      })
      .select()
      .single()

    setSubmitting(false)

    if (error) { setErrorMsg(error.message); return }

    // 로컬 상태 업데이트 (트리거가 DB의 critic_score + review_count 자동 갱신)
    setMyReviews((prev) => [data, ...prev])
    setReviewCount((c) => c + 1)
    setSuccessMsg(`✅ "${selGame.title}" 리뷰가 등록됐습니다. 메타스코어가 자동 업데이트됩니다.`)
    setSelGame(null)
    setScore('')
    setReviewText('')
    setPublishDate(new Date().toISOString().slice(0, 10))
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // ── 수정 시작
  function startEdit(r: CriticReviewRow) {
    setEditingId(r.id)
    setEditScore(String(r.score))
    setEditText(r.review_text)
    setEditDate(r.published_at)
  }

  // ── 수정 저장
  async function saveEdit(reviewId: number) {
    const n = Number(editScore)
    if (!editScore || n < 0 || n > 100) { alert('점수를 0~100 사이로 입력해주세요'); return }
    if (editText.trim().length < 50) { alert('리뷰를 50자 이상 입력해주세요'); return }

    setEditSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('critic_reviews')
      .update({ score: n, review_text: editText.trim(), published_at: editDate })
      .eq('id', reviewId)
      .select()
      .single()

    setEditSubmitting(false)

    if (error) { alert(error.message); return }

    setMyReviews((prev) => prev.map((r) => (r.id === reviewId ? data : r)))
    setEditingId(null)
  }

  // ── 수정 취소
  function cancelEdit() {
    setEditingId(null)
  }

  // ── 삭제
  async function deleteReview(reviewId: number, gameTitle: string) {
    if (!window.confirm(`"${gameTitle}" 리뷰를 삭제하시겠습니까?\n삭제하면 메타스코어가 자동으로 재계산됩니다.`)) return

    const supabase = createClient()
    const { error } = await supabase
      .from('critic_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) { alert(error.message); return }

    setMyReviews((prev) => prev.filter((r) => r.id !== reviewId))
    setReviewCount((c) => Math.max(c - 1, 0))
  }

  return (
    <div className={s.layout}>
      {/* ── SIDEBAR ── */}
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

        <nav className={s.sbNav}>
          <button
            className={`${s.sbItem} ${tab === 'write' ? s.sbActive : ''}`}
            onClick={() => setTab('write')}
          >
            <span>✍️</span> 리뷰 작성
          </button>
          <button
            className={`${s.sbItem} ${tab === 'myReviews' ? s.sbActive : ''}`}
            onClick={() => setTab('myReviews')}
          >
            <span>📋</span> 내 리뷰 ({myReviews.length})
          </button>
          <button
            className={`${s.sbItem} ${tab === 'profile' ? s.sbActive : ''}`}
            onClick={() => setTab('profile')}
          >
            <span>👤</span> 내 프로필
          </button>
        </nav>

        <div className={s.sbFooter}>
          <div className={s.sbUser}>
            <div className={s.sbAvatar}>{journalist.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.sbUserName}>{journalist.name}</div>
              <div className={s.sbUserMedia}>{journalist.media}</div>
            </div>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
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
                        {selGame.cover_url && (
                          <img src={selGame.cover_url} alt={selGame.title} className={s.selectedGameImg} />
                        )}
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
                              <div
                                key={g.id}
                                className={s.gameDropItem}
                                onMouseDown={() => { setSelGame(g); setGameSearch(''); setGameDropOpen(false) }}
                              >
                                {g.cover_url && (
                                  <img src={g.cover_url} alt={g.title} className={s.gameDropImg} />
                                )}
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
                      <div className={`${s.scorePreview} ${scoreCls(scoreNum, s)}`}>{scoreNum}</div>
                    )}
                  </div>
                  <div className={s.scoreQuickBtns}>
                    {[100, 95, 90, 85, 80, 75, 70].map((n) => (
                      <button key={n} className={`${s.scoreQuick} ${scoreCls(n, s)}`} onClick={() => setScore(String(n))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 리뷰 텍스트 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>
                    리뷰 본문 * <span className={s.charCount}>{reviewText.length}자</span>
                  </div>
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

                <button className={s.submitBtn} onClick={submitReview} disabled={submitting}>
                  {submitting ? '등록 중...' : '리뷰 게재하기'}
                </button>
              </div>

              {/* 오른쪽: 미리보기 */}
              <div className={s.previewPanel}>
                <div className={s.previewTitle}>미리보기</div>
                <div className={s.previewCard}>
                  <div className={s.previewCardTop}>
                    <div className={s.previewInfo}>
                      <span className={s.previewMedia}>{journalist.media}</span>
                      <span className={s.previewReviewer}>{journalist.name}</span>
                    </div>
                    <div className={`${s.previewScore} ${score ? scoreCls(scoreNum, s) : s.scoreTbd}`}>
                      {score || '—'}
                    </div>
                  </div>
                  {selGame && (
                    <div className={s.previewGame}>
                      {selGame.cover_url && (
                        <img src={selGame.cover_url} alt={selGame.title} className={s.previewGameImg} />
                      )}
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
              {myReviews.length === 0 && (
                <div className={s.emptyS}>📝 작성한 리뷰가 없습니다</div>
              )}
              {myReviews.map((r) => {
                const game = games.find((g) => g.id === r.game_id)
                const isEditing = editingId === r.id
                const cls = r.score >= 90 ? s.csGreat : r.score >= 75 ? s.csGood : s.csBad

                return (
                  <div key={r.id} className={s.myReviewCard}>
                    {isEditing ? (
                      /* ── 인라인 수정 폼 ── */
                      <div className={s.editForm}>
                        <div className={s.editFormTop}>
                          <div className={s.myRLeft}>
                            {game?.cover_url && (
                              <img src={game.cover_url} alt={game.title} className={s.myRImg} />
                            )}
                            <div>
                              <div className={s.myRGame}>{game?.title ?? `게임 #${r.game_id}`}</div>
                              <div className={s.myRMeta}>{r.media}</div>
                            </div>
                          </div>
                          <button className={s.cancelEditBtn} onClick={cancelEdit}>취소</button>
                        </div>

                        <div className={s.editRow}>
                          <div className={s.editField}>
                            <label className={s.editLabel}>점수 (0–100)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                              <input
                                type="number" min={0} max={100}
                                className={`${s.formInput} ${s.scoreInput}`}
                                value={editScore}
                                onChange={(e) => setEditScore(e.target.value)}
                              />
                              {editScore && (
                                <div className={`${s.scorePreview} ${scoreCls(Number(editScore), s)}`}>
                                  {editScore}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={s.editField}>
                            <label className={s.editLabel}>게재 날짜</label>
                            <input
                              type="date" className={s.formInput}
                              value={editDate} onChange={(e) => setEditDate(e.target.value)}
                              style={{ maxWidth: 180 }}
                            />
                          </div>
                        </div>

                        <div className={s.editField}>
                          <label className={s.editLabel}>리뷰 본문 <span className={s.charCount}>{editText.length}자</span></label>
                          <textarea
                            className={s.reviewTextarea}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={6}
                          />
                        </div>

                        <button
                          className={s.saveEditBtn}
                          onClick={() => saveEdit(r.id)}
                          disabled={editSubmitting}
                        >
                          {editSubmitting ? '저장 중...' : '저장하기'}
                        </button>
                      </div>
                    ) : (
                      /* ── 일반 리뷰 카드 ── */
                      <>
                        <div className={s.myRTop}>
                          <div className={s.myRLeft}>
                            {game?.cover_url && (
                              <img src={game.cover_url} alt={game.title} className={s.myRImg} />
                            )}
                            <div>
                              <div className={s.myRGame}>{game?.title ?? `게임 #${r.game_id}`}</div>
                              <div className={s.myRMeta}>{r.media} · {r.published_at}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div className={`${s.myRScore} ${cls}`}>{r.score}</div>
                            <div className={s.reviewActions}>
                              <button
                                className={s.editBtn}
                                onClick={() => startEdit(r)}
                                title="수정"
                              >
                                ✏️
                              </button>
                              <button
                                className={s.deleteBtn}
                                onClick={() => deleteReview(r.id, game?.title ?? `게임 #${r.game_id}`)}
                                title="삭제"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className={s.myRText}>{r.review_text}</div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 내 프로필 ── */}
          {tab === 'profile' && (
            <div style={{ maxWidth: 480 }}>
              <div className={s.profileCard}>
                <div className={s.profileAvatar}>{journalist.name[0]}</div>
                <div className={s.profileName}>{journalist.name}</div>
                <div className={s.profileMedia}>{journalist.media}</div>
                <div className={s.profileStats}>
                  <div className={s.profileStat}>
                    <div className={s.profileStatNum}>{reviewCount}</div>
                    <div className={s.profileStatLabel}>작성 리뷰</div>
                  </div>
                  <div className={s.profileStat}>
                    <div className={`${s.profileStatNum} ${s.approved}`}>승인됨</div>
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
              <button className={s.profileLogoutBtn} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
