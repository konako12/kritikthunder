'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Game, CriticReview, UserReview } from '@/lib/types'
import { scoreClass, formatDate, initial } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'
import s from './page.module.css'

interface Props {
  game: Game
  criticReviews: CriticReview[]
  userReviews: UserReview[]
  avgStars: number
}

type Tab = 'critic' | 'user' | 'write'

export default function GameDetailClient({ game, criticReviews, userReviews: initUserReviews, avgStars: initAvgStars }: Props) {
  const [tab, setTab] = useState<Tab>('critic')
  const [userReviews, setUserReviews] = useState(initUserReviews)
  const [avgStars, setAvgStars] = useState(initAvgStars)

  // 리뷰 작성 폼
  const [selectedStars, setSelectedStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [nickname, setNickname] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // 점수 분포
  const distCounts = [5, 4, 3, 2, 1].map(
    (star) => userReviews.filter((r) => r.stars === star).length
  )
  const maxDist = Math.max(...distCounts, 1)

  async function submitReview() {
    if (!selectedStars) { setError('별점을 선택해주세요'); return }
    if (!nickname.trim()) { setError('닉네임을 입력해주세요'); return }
    if (reviewText.trim().length < 20) { setError('리뷰를 20자 이상 입력해주세요'); return }

    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('user_reviews')
      .insert({ game_id: game.id, nickname: nickname.trim(), stars: selectedStars, review_text: reviewText.trim() })
      .select()
      .single()

    setSubmitting(false)

    if (err) { setError(err.message); return }

    const newReviews = [data, ...userReviews]
    setUserReviews(newReviews)
    setAvgStars(newReviews.reduce((s, r) => s + r.stars, 0) / newReviews.length)
    setSuccess(true)

    setTimeout(() => {
      setSuccess(false)
      setNickname('')
      setReviewText('')
      setSelectedStars(0)
      setTab('user')
    }, 2500)
  }

  const criticAvg =
    criticReviews.length > 0
      ? Math.round(criticReviews.reduce((sum, r) => sum + r.score, 0) / criticReviews.length)
      : game.critic_score

  return (
    <div className={s.root}>
      {/* HEADER */}
      <header className={s.header}>
        <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
        <nav>
          <Link href="/games">게임</Link>
          <Link href="/reviews">리뷰</Link>
          <Link href="/ranking">랭킹</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </header>

      {/* HERO */}
      <div className={s.hero}>
        {game.cover_url && (
          <img className={s.heroImg} src={game.cover_url} alt={game.title} />
        )}
        <div className={s.heroGradient} />
        <div className={s.heroContent}>
          {game.cover_url && (
            <img className={s.gameCover} src={game.cover_url} alt={game.title} />
          )}
          <div className={s.gameMeta}>
            <h1>{game.title}</h1>
            <div className={s.subtitle}>
              {game.developer} · {game.publisher ?? game.developer} · {game.year}
            </div>
            <div className={s.tags}>
              {game.platforms.map((p) => (
                <span key={p} className={`${s.tag} ${s.platform}`}>{p}</span>
              ))}
              <span className={s.tag}>{game.genre}</span>
              <span className={s.tag}>{game.age_rating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className={s.container}>
        {/* SCORE BAND */}
        <div className={s.scoreBand}>
          <div className={s.scoreBlock}>
            <div className={s.scoreLabel}>전문가 평균</div>
            {criticAvg !== null ? (
              <div className={`${s.scoreNumber} ${scoreClass(criticAvg)}`} style={{ background: 'none', color: criticAvg >= 90 ? 'var(--score-great)' : criticAvg >= 75 ? 'var(--gold)' : 'var(--red)' }}>
                {criticAvg}
              </div>
            ) : (
              <div className={s.scoreNumberTbd}>TBD</div>
            )}
            <div className={s.scoreSub}>리뷰 {criticReviews.length}개 기준</div>
            {criticAvg !== null && (
              <div className={s.scoreBarWrap}>
                <div className={s.scoreBarBg}>
                  <div
                    className={`${s.scoreBarFill} ${s.fillGreen}`}
                    style={{ width: `${criticAvg}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className={s.scoreDivider} />
          <div className={s.scoreBlock}>
            <div className={s.scoreLabel}>유저 평균</div>
            <div className={s.starsDisplay}>
              {[1,2,3,4,5].map((i) => (
                <span key={i} className={`${s.star} ${i <= Math.floor(avgStars) ? s.filled : ''}`}>★</span>
              ))}
            </div>
            <div className={s.scoreSub}>
              {avgStars > 0 ? `${avgStars.toFixed(1)} / 5 ·` : ''} 유저 {userReviews.length}명
            </div>
            <div className={s.scoreBarWrap}>
              <div className={s.scoreBarBg}>
                <div
                  className={`${s.scoreBarFill} ${s.fillGold}`}
                  style={{ width: `${(avgStars / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={s.grid}>
          {/* LEFT */}
          <div>
            {/* TABS */}
            <div className={s.tabBar}>
              {([
                ['critic', `전문가 리뷰 (${criticReviews.length})`],
                ['user',   `유저 리뷰 (${userReviews.length})`],
                ['write',  '리뷰 작성'],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`${s.tabBtn} ${tab === key ? s.tabBtnActive : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 전문가 리뷰 */}
            {tab === 'critic' && (
              <div>
                <div className={s.sectionHeader}>
                  <span className={s.sectionTitle}>전문가 리뷰</span>
                  <span className={s.sectionCount}>국내 게임 전문지 기자</span>
                </div>
                {criticReviews.length === 0 && (
                  <div className={s.emptyMsg}>아직 전문가 리뷰가 없습니다.</div>
                )}
                {criticReviews.map((r) => (
                  <div key={r.id} className={s.reviewCard}>
                    <div className={s.reviewTop}>
                      <div className={s.reviewerInfo}>
                        <span className={s.mediaLogoText}>{r.media}</span>
                        <span className={s.reviewerName}>{r.reviewer_name}</span>
                      </div>
                      <div className={`${s.criticScore} ${
                        r.score >= 90 ? s.csGreat : r.score >= 75 ? s.csGood : s.csBad
                      }`}>{r.score}</div>
                    </div>
                    <div className={s.reviewText}>{r.review_text}</div>
                    <div className={s.reviewDate}>{r.published_at}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 유저 리뷰 */}
            {tab === 'user' && (
              <div>
                <div className={s.sectionHeader}>
                  <span className={s.sectionTitle}>유저 리뷰</span>
                  <span className={s.sectionCount}>{userReviews.length}명 참여</span>
                </div>
                {userReviews.length === 0 && (
                  <div className={s.emptyMsg}>아직 유저 리뷰가 없습니다. 첫 리뷰를 남겨보세요!</div>
                )}
                {userReviews.map((r) => (
                  <div key={r.id} className={s.userReviewCard}>
                    <div className={s.userTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className={s.userAvatar}>{initial(r.nickname)}</div>
                        <div>
                          <div className={s.userNickname}>{r.nickname}</div>
                          <div className={s.userStars}>
                            {[1,2,3,4,5].map((i) => (
                              <span key={i} className={`${s.userStar} ${i <= r.stars ? s.userStarOn : ''}`}>★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className={s.reviewDate}>{formatDate(r.created_at)}</span>
                    </div>
                    <div className={s.userReviewText}>{r.review_text}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 리뷰 작성 */}
            {tab === 'write' && (
              <div className={s.reviewFormWrap}>
                {success ? (
                  <div className={s.successMsg}>
                    <div className={s.successCheck}>✓</div>
                    <div>리뷰가 등록되었습니다!</div>
                    <div className={s.successSub}>소중한 의견 감사합니다</div>
                  </div>
                ) : (
                  <>
                    <div className={s.formTitle}>유저 리뷰 작성</div>
                    {error && <div className={s.formError}>{error}</div>}
                    <div className={s.formField}>
                      <label>별점 선택</label>
                      <div className={s.starPicker}>
                        {[1,2,3,4,5].map((i) => (
                          <span
                            key={i}
                            className={`${s.starPick} ${i <= (hoverStars || selectedStars) ? s.starPickOn : ''}`}
                            onMouseEnter={() => setHoverStars(i)}
                            onMouseLeave={() => setHoverStars(0)}
                            onClick={() => setSelectedStars(i)}
                          >★</span>
                        ))}
                      </div>
                    </div>
                    <div className={s.formField}>
                      <label>닉네임</label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임을 입력해주세요"
                      />
                    </div>
                    <div className={s.formField}>
                      <label>리뷰</label>
                      <textarea
                        rows={4}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="이 게임에 대한 솔직한 리뷰를 남겨주세요 (최소 20자)"
                      />
                    </div>
                    <button className={s.submitBtn} onClick={submitReview} disabled={submitting}>
                      {submitting ? '등록 중...' : '리뷰 등록하기'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div>
            <div className={s.infoCard}>
              <div className={s.infoTitle}>게임 정보</div>
              {[
                ['개발사', game.developer],
                ['배급사', game.publisher ?? game.developer],
                ['출시연도', `${game.year}년`],
                ['플랫폼', game.platforms.join(' / ')],
                ['장르', game.genre],
                ['이용등급', game.age_rating],
              ].map(([k, v]) => (
                <div key={k} className={s.infoRow}>
                  <span className={s.infoKey}>{k}</span>
                  <span className={s.infoVal}>{v}</span>
                </div>
              ))}
            </div>

            {userReviews.length > 0 && (
              <div className={s.infoCard}>
                <div className={s.infoTitle}>유저 별점 분포</div>
                {[5,4,3,2,1].map((star, idx) => (
                  <div key={star} className={s.distRow}>
                    <div className={s.distStars}>
                      {'★'.repeat(star)}{'☆'.repeat(5 - star)}
                    </div>
                    <div className={s.distBarBg}>
                      <div
                        className={s.distBarFill}
                        style={{ width: `${(distCounts[idx] / maxDist) * 100}%` }}
                      />
                    </div>
                    <span className={s.distCount}>{distCounts[idx]}</span>
                  </div>
                ))}
              </div>
            )}

            {criticReviews.length > 0 && (
              <div className={s.infoCard}>
                <div className={s.infoTitle}>참여 전문지</div>
                <div className={s.mediaList}>
                  {[...new Set(criticReviews.map((r) => r.media))].map((media) => (
                    <span key={media} className={s.mediaLogoText}>{media}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
