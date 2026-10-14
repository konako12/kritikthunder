export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'
import CmsClient from './CmsClient'

export default async function CmsPage() {
  const supabase = await createClient()

  // ── 1. 인증 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── 2. 승인 기자가 아니면 규칙대로 (관리자 → /admin, 대기 → /pending, 거절 → /rejected, 그 외 → /no-access)
  const { destination, journalist: found } = await resolveDestination(user)
  if (destination !== '/cms') redirect(destination)

  // 기자 정보 전체 — 가입 때 저장된 이메일 그대로 조회 (대소문자 차이로 못 찾는 일 방지)
  const { data: journalist } = await createAdminClient()
    .from('journalists')
    .select('*')
    .eq('email', found!.email)
    .single()
  if (!journalist) redirect('/no-access')

  // ── 3. 이 기자의 리뷰 목록 (서버에서 미리 로드)
  //    관리자가 숨긴 리뷰도 본인에게는 보여야 해서 service_role로 조회 (공개 읽기 정책은 숨긴 리뷰 제외)
  const [gamesRes, reviewsRes] = await Promise.all([
    supabase
      .from('games')
      .select('id,title,title_original,cover_url,developer,year')
      .eq('status', 'published')
      .order('title'),
    createAdminClient()
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
