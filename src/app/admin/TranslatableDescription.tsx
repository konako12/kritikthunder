'use client'

import { useState } from 'react'
import s from './admin.module.css'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

const HANGUL = /[가-힣]/g
const LATIN = /[A-Za-z]/g

/**
 * 게임 소개 입력칸 + "한국어로 번역"(DeepL) · "원문 보기" 토글.
 * 번역은 버튼을 눌렀을 때만 하고, 결과는 입력칸에 채워 관리자가 고친 뒤 저장한다.
 * 다른 게임을 불러오거나 폼을 초기화할 때는 부모가 key를 바꿔 원문 기억을 비운다.
 */
export default function TranslatableDescription({ value, onChange, placeholder }: Props) {
  const [original, setOriginal] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function translate() {
    const text = value.trim()
    if (!text) return
    // 이미 한국어인 글을 영어로 보고 다시 번역하지 않도록
    if ((text.match(HANGUL)?.length ?? 0) > (text.match(LATIN)?.length ?? 0)) {
      setMsg({ ok: false, text: '이미 한국어로 된 내용이에요. 영어 원문을 다시 번역하려면 "원문 보기"에서 원문으로 되돌린 뒤 눌러주세요.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.text) throw new Error(data.error ?? '번역하지 못했어요')
      setOriginal(text)
      onChange(data.text)
      setMsg({ ok: true, text: '번역했어요. 어색한 부분을 고친 뒤 저장해주세요.' })
    } catch (e) {
      // 실패하면 입력칸은 그대로(원문 유지)
      setMsg({ ok: false, text: `${(e as Error).message}. 원문은 그대로 두었어요.` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={s.descTools}>
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={translate} disabled={loading || !value.trim()}>
          {loading ? '번역 중...' : '한국어로 번역'}
        </button>
        {original !== null && (
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setShowOriginal((v) => !v)}>
            {showOriginal ? '원문 닫기' : '원문 보기'}
          </button>
        )}
      </div>
      <textarea
        className={`${s.formInput} ${s.formTextarea}`} rows={4} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      />
      {showOriginal && original !== null && (
        <div className={s.descOriginal}>
          <div className={s.descOriginalHead}>
            <span>영어 원문</span>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
              onClick={() => { onChange(original); setMsg({ ok: true, text: '원문으로 되돌렸어요.' }) }}>
              원문으로 되돌리기
            </button>
          </div>
          {original}
        </div>
      )}
      {msg && <div className={msg.ok ? s.newsNoticeOk : s.newsNoticeWarn}>{msg.text}</div>}
    </div>
  )
}
