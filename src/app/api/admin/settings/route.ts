import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// PATCH /api/admin/settings — 설정 변경 (메인 노출 게임 등)
export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { key, value } = await req.json()

  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
