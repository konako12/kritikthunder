import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'

// POST /api/games — 게임 등록 (admin)
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('games')
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
