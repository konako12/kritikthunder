# 비밀번호 재설정 메일 (한국어)

Supabase 대시보드 → **Authentication → Emails → Templates → Reset Password** 에 아래 내용을 붙여넣으세요.

## 1. 먼저 확인할 설정

**Authentication → URL Configuration**

| 항목 | 값 |
| --- | --- |
| Site URL | 실제 서비스 주소 (예: `https://kritik.example`) — 로컬 개발 중이면 `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**`, `https://<실제 도메인>/**` |

메일 본문의 링크는 `{{ .SiteURL }}`을 기준으로 만들어지므로 Site URL이 실제 주소와 같아야 합니다.

## 2. Subject (제목)

```
[KRITIK] 비밀번호 재설정 안내
```

## 3. Message body (본문, HTML)

```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0f172a;">
  <div style="font-size:28px;font-weight:700;letter-spacing:0.04em;margin-bottom:24px;">
    KRIT<span style="color:#2563eb;">IK</span>
  </div>

  <h2 style="font-size:18px;margin:0 0 16px;">비밀번호 재설정 안내</h2>

  <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 24px;">
    안녕하세요, KRITIK입니다.<br />
    <strong>{{ .Email }}</strong> 계정의 비밀번호 재설정 요청을 받았어요.<br />
    아래 버튼을 눌러 새 비밀번호를 설정해주세요.
  </p>

  <p style="margin:0 0 24px;">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
       style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      비밀번호 재설정하기
    </a>
  </p>

  <p style="font-size:13px;line-height:1.7;color:#64748b;margin:0 0 8px;">
    · 이 링크는 한 번만 사용할 수 있고, 1시간이 지나면 만료돼요.<br />
    · 링크가 만료됐다면 로그인 화면의 “비밀번호를 잊으셨나요?”에서 다시 요청해주세요.
  </p>

  <p style="font-size:13px;line-height:1.7;color:#64748b;margin:0 0 24px;">
    비밀번호 재설정을 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다.
    비밀번호는 바뀌지 않아요.
  </p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;" />
  <p style="font-size:12px;color:#94a3b8;margin:0;">
    본 메일은 발신 전용입니다. · KRITIK — 국내 게임 전문 평점 서비스
  </p>
</div>
```

## 참고

- 링크는 `/auth/confirm`(token_hash 방식)으로 연결됩니다. 메일을 요청한 기기와 다른 기기(예: PC에서 요청 → 휴대폰에서 메일 열기)에서도 동작합니다.
- 템플릿을 바꾸지 않고 기본 영문 템플릿(`{{ .ConfirmationURL }}`)을 그대로 써도 `/auth/callback`에서 처리되지만, 이 경우 **메일을 요청한 같은 브라우저**에서 열어야 합니다.
- 만료 시간(기본 1시간)은 **Authentication → Providers → Email → Email OTP Expiration**에서 바꿀 수 있습니다. 바꾸면 본문의 “1시간” 문구도 함께 고쳐주세요.
