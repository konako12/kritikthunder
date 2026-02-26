# KRITIK — 국내 게임 전문 평점 서비스

Next.js 14 + Supabase 기반의 실서비스 게임 리뷰 플랫폼

## 빠른 시작

### 1. 패키지 설치

```bash
npm install
```

### 2. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 가입 후 새 프로젝트 생성
2. `supabase/schema.sql` 전체 내용을 **SQL Editor**에 붙여넣고 실행
   - 테이블, RLS 정책, 샘플 데이터 모두 포함됩니다

### 3. 환경 변수 설정

`.env.local.example`을 `.env.local`로 복사 후 값 입력:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Supabase Dashboard → Settings → API 에서 확인

### 4. 개발 서버 실행

```bash
npm run dev
```

→ http://localhost:3000

---

## 페이지 구성

| URL | 설명 |
|-----|------|
| `/` | 메인 홈 (히어로, TOP5, 최신 리뷰, 출시 예정) |
| `/games/[id]` | 게임 상세 (전문가/유저 리뷰, 리뷰 작성) |
| `/admin` | 어드민 대시보드 (게임 CRUD, 기자 관리, 신고 처리) |
| `/cms` | 기자 CMS (리뷰 작성, 내 리뷰 목록, 프로필) |

## 기술 스택

- **Frontend**: Next.js 14 App Router, TypeScript, CSS Modules
- **Backend**: Supabase (PostgreSQL + RLS + Storage)
- **폰트**: Bebas Neue, Noto Sans KR, DM Mono

## 배포 (Vercel)

```bash
npx vercel
```

환경 변수를 Vercel 대시보드에서 동일하게 입력해주세요.
