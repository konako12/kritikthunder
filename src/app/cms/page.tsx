export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import CmsClient from './CmsClient'

export default async function CmsPage() {
  const supabase = await createClient()

  // ── 1. 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 2. 승인된 기자 확인 (이메일 기반 연동)
  const { data: journalist } = await supabase
    .from('journalists')
    .select('*')
    .eq('email', user.email!)
    .eq('status', 'approved')
    .maybeSingle()

  // 기자가 아니면 관리자 페이지로
  if (!journalist) redirect('/admin')

  // ── 3. 이 기자의 리뷰 목록 (서버에서 미리 로드)
  const [gamesRes, reviewsRes] = await Promise.all([
    supabase
      .from('games')
      .select('id,title,cover_url,developer,year')
      .eq('status', 'published')
      .order('title'),
    supabase
      .from('critic_reviews')
      .select('*')
      .eq('reviewer_name', journalist.name)
      .order('published_at', { ascending: false }),
  ])

  return (
    <CmsClient
      games={gamesRes.data ?? []}
      journalist={journalist}
      initialReviews={reviewsRes.data ?? []}
    />
  )
}
