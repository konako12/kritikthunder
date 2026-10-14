import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/admin-auth'
import { pickNewsFields } from '../validate'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/admin/news/:id — 수정 · 숨김 · 고정 (보낸 필드만)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { fields, error: invalid } = pickNewsFields(await req.json(), { partial: true })
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  if (!Object.keys(fields!).length) return NextResponse.json({ error: '수정할 내용이 없어요' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('news')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE /api/admin/news/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('news').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
