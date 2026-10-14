import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getAdminUser } from '@/lib/admin-auth'
import { pickNewsFields } from './validate'

// POST /api/admin/news — 뉴스 등록
export async function POST(req: NextRequest) {
  const { user, denied } = await getAdminUser()
  if (denied) return denied

  const { fields, error: invalid } = pickNewsFields(await req.json(), { partial: false })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('news')
    .insert([{ ...fields, source_type: 'manual', created_by: user.id, created_by_email: user.email }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
