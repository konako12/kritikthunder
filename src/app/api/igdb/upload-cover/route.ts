import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// POST /api/igdb/upload-cover  { cover_id: string }
// IGDB 고해상도 커버를 다운로드해서 Supabase Storage에 저장 후 공개 URL 반환
export async function POST(req: NextRequest) {
  const { cover_id } = await req.json()
  if (!cover_id || typeof cover_id !== 'string') {
    return NextResponse.json({ error: 'cover_id 필요' }, { status: 400 })
  }

  try {
    const imgUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover_id}.jpg`
    const imgRes = await fetch(imgUrl)
    if (!imgRes.ok) throw new Error('IGDB 커버 이미지 다운로드 실패')

    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const filename = `igdb-${cover_id}-${Date.now()}.jpg`

    const supabase = createAdminClient()
    const { error } = await supabase.storage
      .from('game-covers')
      .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = supabase.storage
      .from('game-covers')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
