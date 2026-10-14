'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Journalist } from '@/lib/types'
import { createClient } from '@/lib/supabase-client'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import { isValidSourceUrl, normalizeSourceUrl, normalizeScoreDisplay, sourceDomain, SCORE_DISPLAY_MAX, gameTitleMatches } from '@/lib/utils'
import { VERDICT_MAX, verdictError, verdictLength } from '@/lib/review-verdict'
import s from './cms.module.css'

interface GameBasic {
  id: number
  title: string
  title_original: string | null
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
  review_text: string | null
  source_url: string | null
  score_display: string | null
  verdict?: string | null
  verdict_type?: 'own' | 'quote' | null
  is_hidden?: boolean
  published_at: string
}

const VERDICT_GUIDE = '리뷰의 핵심 판단을 한 문장으로 직접 작성해주세요'
const BODY_MIN = 50

/** 한줄평 · 원문 링크 · 전문 검증 — 문제가 없으면 null */
function checkContent(verdict: string, sourceUrl: string, body: string): string | null {
  const vErr = verdictError(verdict)
  if (vErr) return vErr
  if (!isValidSourceUrl(sourceUrl)) return '원문 링크는 http:// 또는 https://로 시작해야 해요'
  if (!sourceUrl.trim() && body.trim().length < BODY_MIN) return `원문 링크가 없으면 전문을 ${BODY_MIN}자 이상 입력해주세요`
  return null
}

/** DB 오류 메시지 — 한줄평 칸이 아직 없으면 안내로 */
function dbError(message: string): string {
  return /verdict/.test(message) && /column/.test(message)
    ? '한줄평 기능 준비 중이에요. 관리자에게 문의해주세요. (SQL 012 미적용)'
    : message
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
  const [verdict, setVerdict] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [scoreDisplay, setScoreDisplay] = useState('')
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // ── 리뷰 수정 상태
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editScore, setEditScore] = useState('')
  const [editVerdict, setEditVerdict] = useState('')
  const [editText, setEditText] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editScoreDisplay, setEditScoreDisplay] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  const scoreNum = Number(score)
  const filteredGames = gameSearch.trim()
    ? games.filter((g) => gameTitleMatches(g, gameSearch))
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
    const contentErr = checkContent(verdict, sourceUrl, reviewText)
    if (contentErr) { setErrorMsg(contentErr); return }

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
        verdict: verdict.trim(),
        verdict_type: 'own', // 기자 한줄평은 항상 직접 작성
        review_text: reviewText.trim() || null,
        source_url: normalizeSourceUrl(sourceUrl),
        // 원래 점수 표기는 입력했을 때만 전송
        ...(normalizeScoreDisplay(scoreDisplay) && { score_display: normalizeScoreDisplay(scoreDisplay) }),
        published_at: publishDate,
      })
      .select()
      .single()

    setSubmitting(false)

    if (error) { setErrorMsg(dbError(error.message)); return }

    // 로컬 상태 업데이트 (트리거가 DB의 critic_score + review_count 자동 갱신)
    setMyReviews((prev) => [data, ...prev])
    setReviewCount((c) => c + 1)
    setSuccessMsg(`✅ "${selGame.title}" 리뷰가 등록됐습니다. 메타스코어가 자동 업데이트됩니다.`)
    setSelGame(null)
    setScore('')
    setVerdict('')
    setReviewText('')
    setSourceUrl('')
    setScoreDisplay('')
    setPublishDate(new Date().toISOString().slice(0, 10))
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // ── 수정 시작
  function startEdit(r: CriticReviewRow) {
    setEditingId(r.id)
    setEditScore(String(r.score))
    setEditVerdict(r.verdict ?? '')
    setEditText(r.review_text ?? '')
    setEditDate(r.published_at)
    setEditSourceUrl(r.source_url ?? '')
    setEditScoreDisplay(r.score_display ?? '')
  }

  // ── 수정 저장
  async function saveEdit(reviewId: number) {
    const n = Number(editScore)
    if (!editScore || n < 0 || n > 100) { alert('점수를 0~100 사이로 입력해주세요'); return }
    const contentErr = checkContent(editVerdict, editSourceUrl, editText)
    if (contentErr) { alert(contentErr); return }

    setEditSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('critic_reviews')
      .update({
        score: n,
        verdict: editVerdict.trim(),
        verdict_type: 'own',
        review_text: editText.trim() || null,
        published_at: editDate,
        source_url: normalizeSourceUrl(editSourceUrl),
        ...((normalizeScoreDisplay(editScoreDisplay) || myReviews.find((x) => x.id === reviewId)?.score_display)
          && { score_display: normalizeScoreDisplay(editScoreDisplay) }),
      })
      .eq('id', reviewId)
      .select()
      .single()

    setEditSubmitting(false)

    if (error) { alert(dbError(error.message)); return }

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
                  <div className={s.formCardTitle} style={{ marginTop: '1rem' }}>
                    원래 점수 표기 <span className={s.charCount}>선택 · 비우면 &quot;{score || '96'}/100&quot;으로 표시</span>
                  </div>
                  <input
                    className={s.formInput}
                    value={scoreDisplay}
                    maxLength={SCORE_DISPLAY_MAX}
                    onChange={(e) => setScoreDisplay(e.target.value)}
                    placeholder="예) 9.5/10, 5/5, A-"
                    style={{ maxWidth: 200 }}
                  />
                </div>

                {/* 한줄평 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>
                    한줄평 *
                    <span className={`${s.charCount} ${verdictLength(verdict) > VERDICT_MAX ? s.charOver : ''}`}>
                      {verdictLength(verdict)} / {VERDICT_MAX}자
                    </span>
                  </div>
                  <div className={s.verdictGuide}>{VERDICT_GUIDE}</div>
                  <textarea
                    className={s.verdictTextarea}
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value)}
                    placeholder="예) 전투의 긴장감은 시리즈 최고지만, 후반부 이야기는 힘이 빠진다."
                    rows={2}
                  />
                </div>

                {/* 원문 기사 링크 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>
                    원문 기사 링크 <span className={s.charCount}>선택 · 있으면 카드의 "전문 읽기"가 원문으로 연결돼요</span>
                  </div>
                  <input
                    type="url"
                    className={s.formInput}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {!isValidSourceUrl(sourceUrl) && (
                    <div className={s.fieldError}>http:// 또는 https://로 시작하는 주소를 입력해주세요</div>
                  )}
                </div>

                {/* 전문 */}
                <div className={s.formCard}>
                  <div className={s.formCardTitle}>
                    전문 {sourceUrl.trim() ? <span className={s.charCount}>선택 · 원문 링크가 있어 비워도 돼요</span> : '*'}
                    <span className={s.charCount}>{reviewText.length}자</span>
                  </div>
                  <textarea
                    className={s.reviewTextarea}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={sourceUrl.trim()
                      ? '원문 기사가 있으면 비워도 돼요. 쓰면 KRITIK 리뷰 페이지에 함께 실립니다.'
                      : `원문 링크가 없으면 필수예요. KRITIK 리뷰 페이지에 실릴 전문을 작성해주세요 (최소 ${BODY_MIN}자)...`}
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
                  <div className={s.previewVerdict}>
                    {verdict.trim() || <span style={{ opacity: 0.4 }}>한줄평이 여기 표시됩니다...</span>}
                  </div>
                  <div className={s.previewLink}>{sourceUrl.trim() ? '전문 읽기 ↗' : '전문 보기'}</div>
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
                          <div className={s.editField}>
                            <label className={s.editLabel}>원래 점수 표기 (선택)</label>
                            <input
                              className={s.formInput} maxLength={SCORE_DISPLAY_MAX}
                              value={editScoreDisplay} onChange={(e) => setEditScoreDisplay(e.target.value)}
                              placeholder={`비우면 ${editScore || '96'}/100`}
                              style={{ maxWidth: 160 }}
                            />
                          </div>
                        </div>

                        <div className={s.editField}>
                          <label className={s.editLabel}>
                            한줄평 *{' '}
                            <span className={`${s.charCount} ${verdictLength(editVerdict) > VERDICT_MAX ? s.charOver : ''}`}>
                              {verdictLength(editVerdict)} / {VERDICT_MAX}자
                            </span>
                          </label>
                          <div className={s.verdictGuide}>{VERDICT_GUIDE}</div>
                          <textarea
                            className={s.verdictTextarea}
                            value={editVerdict}
                            onChange={(e) => setEditVerdict(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div className={s.editField}>
                          <label className={s.editLabel}>
                            전문 {editSourceUrl.trim() ? '(원문 링크가 있어 선택)' : '* (원문 링크가 없으면 필수)'}{' '}
                            <span className={s.charCount}>{editText.length}자</span>
                          </label>
                          <textarea
                            className={s.reviewTextarea}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={6}
                          />
                        </div>

                        <div className={s.editField}>
                          <label className={s.editLabel}>원문 기사 링크 (선택)</label>
                          <input
                            type="url" className={s.formInput}
                            value={editSourceUrl} onChange={(e) => setEditSourceUrl(e.target.value)}
                            placeholder="https://..."
                          />
                          {!isValidSourceUrl(editSourceUrl) && (
                            <div className={s.fieldError}>http:// 또는 https://로 시작하는 주소를 입력해주세요</div>
                          )}
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
                              {!r.is_hidden && (
                                <button
                                  className={s.editBtn}
                                  onClick={() => startEdit(r)}
                                  title="수정"
                                >
                                  ✏️
                                </button>
                              )}
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
                        {r.is_hidden && (
                          <div className={s.hiddenNote}>관리자가 이 리뷰를 숨겼어요. 공개 화면과 점수 평균에서 빠져 있고, 수정할 수 없어요.</div>
                        )}
                        {r.verdict ? (
                          <div className={s.myRVerdict}>{r.verdict}</div>
                        ) : (
                          <div className={s.noVerdict}>
                            한줄평 없음 — 지금은 전문 앞부분이 대신 보여요.
                            {!r.is_hidden && <button className={s.addLinkBtn} onClick={() => startEdit(r)}>+ 한줄평 쓰기</button>}
                          </div>
                        )}
                        {r.review_text && <div className={s.myRText}>{r.review_text}</div>}
                        <div className={s.myRSource}>
                          {r.source_url ? (
                            <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                              원문 보기 ↗ <span className={s.myRSourceDomain}>{sourceDomain(r.source_url)}</span>
                            </a>
                          ) : !r.is_hidden && (
                            <button className={s.addLinkBtn} onClick={() => startEdit(r)}>+ 원문 링크 추가</button>
                          )}
                        </div>
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
              <div style={{ marginTop: '1rem' }}>
                <ChangePasswordForm />
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
