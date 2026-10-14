export interface Game {
  id: number
  title: string
  /** 원어(주로 영어) 제목 — title은 화면용 한국어 제목 */
  title_original: string | null
  developer: string
  publisher: string | null
  year: number
  release_date: string | null
  genre: string
  platforms: string[]
  critic_score: number | null
  status: 'published' | 'draft' | 'upcoming'
  cover_url: string | null
  /** 메인 히어로 배너 전용 이미지 (없으면 cover_url) — SQL 011 */
  hero_image_url?: string | null
  /** 히어로 이미지 초점: 'left' | 'center' | 'right' 또는 '0%'~'100%' — SQL 011 */
  hero_focus?: string | null
  description: string | null
  age_rating: string
  created_at: string
}

export interface CriticReview {
  id: number
  game_id: number
  media: string
  reviewer_name: string
  score: number
  /** 전문 — 원문 링크가 없는 리뷰는 필수, 있으면 비어 있을 수 있음 (SQL 012) */
  review_text: string | null
  source_url: string | null
  score_display: string | null
  /** 한줄평 (100자) — 기자 본인의 문장. 기존 리뷰는 비어 있음 (SQL 012) */
  verdict?: string | null
  /** own: 기자가 CMS에서 직접 작성 · quote: 관리자가 원문 문장 인용 (SQL 012) */
  verdict_type?: 'own' | 'quote' | null
  /** 관리자가 숨긴 리뷰 — 공개 화면에서 빠짐 (SQL 012) */
  is_hidden?: boolean
  hidden_at?: string | null
  published_at: string
  created_at: string
}

export interface UserReview {
  id: number
  game_id: number
  nickname: string
  stars: number
  review_text: string
  created_at: string
}

export interface Journalist {
  id: number
  name: string
  media: string
  email: string
  review_count: number
  status: 'pending' | 'approved' | 'rejected'
  article_links: string[]
  bio: string | null
  joined_at: string
  created_at: string
  /** 010_journalist_reapply.sql — 실행 전 데이터에는 없을 수 있음 */
  rejection_reason?: string | null
  rejected_at?: string | null
  apply_count?: number
  last_applied_at?: string | null
}

export interface Report {
  id: number
  user_review_id: number | null
  game_title: string
  user_nickname: string
  review_text: string
  reason: string
  report_count: number
  status: 'pending' | 'resolved'
  reported_at: string
  created_at: string
}

export type NewsStatus = 'draft' | 'published' | 'hidden'
export type NewsImageSource = 'original' | 'upload' | 'game_cover'

export interface News {
  id: number
  title: string
  media: string
  source_url: string
  summary: string | null
  published_at: string | null
  image_url: string | null
  image_source: NewsImageSource | null
  original_image_url: string | null
  game_id: number | null
  status: NewsStatus
  is_pinned: boolean
  sort_order: number
  source_type: 'manual'
  created_by: string | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

/** 공개 화면용 — 관련 게임 정보 포함 */
export interface NewsWithGame extends News {
  game: { id: number; title: string; cover_url: string | null } | null
}
