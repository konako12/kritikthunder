export interface Game {
  id: number
  title: string
  developer: string
  publisher: string | null
  year: number
  genre: string
  platforms: string[]
  critic_score: number | null
  status: 'published' | 'draft' | 'upcoming'
  cover_url: string | null
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
  review_text: string
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
  status: 'pending' | 'approved'
  joined_at: string
  created_at: string
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
