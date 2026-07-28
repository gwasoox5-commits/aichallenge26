# Railway 배포 빠른 시작 (aichallenge26)

> 예상 비용: Trial $5 크레딧으로 테스트 → 이후 Hobby **$5/월**  
> 저장소: https://github.com/gwasoox5-commits/aichallenge26

## 1. Railway 가입 및 프로젝트 생성

1. https://railway.app 접속 → GitHub로 로그인
2. **New Project** → **Deploy from GitHub repo**
3. **`gwasoox5-commits/aichallenge26`** 선택, 브랜치 **`main`**

## 2. PostgreSQL 추가

1. 프로젝트 화면에서 **+ New** → **Database** → **PostgreSQL**
2. Postgres 서비스가 생성되면 Variables 탭에 `DATABASE_URL` 확인

## 3. 앱 서비스 환경 변수 설정

**앱 서비스**(GitHub에서 배포된 Next.js 서비스) → **Variables** → **Raw Editor**에 아래 붙여넣기.

`Postgres`는 PostgreSQL 서비스 이름입니다. 이름이 다르면 Railway가 보여주는 서비스명으로 바꾸세요.

```env
NODE_ENV=production
BSP_DATABASE_URL=${{Postgres.DATABASE_URL}}
BSP_AUTH_SECRET=여기에-32자-이상-랜덤-문자열-입력
BSP_ADMIN_PASSWORD=운영용-관리자-비밀번호-8자이상
BSP_DEMO_MODE=false
BSP_ALLOW_FIXTURE=false
BSP_PILOT_BOOTSTRAP=false
OPENAI_API_KEY=sk-...선택사항
OPENAI_MODEL=gpt-4.1-mini
BSP_NEWS_PROVIDER=fixture
```

### 비밀값 생성 (PowerShell)

```powershell
# BSP_AUTH_SECRET (32자+)
-join ((48..57 + 65..90 + 97..122 | Get-Random -Count 40 | ForEach-Object { [char]$_ }))

# BSP_ADMIN_PASSWORD (16자)
-join ((48..57 + 65..90 + 97..122 | Get-Random -Count 16 | ForEach-Object { [char]$_ }))
```

`OPENAI_API_KEY`는 Event Studio AI 기능에 필요합니다. 없으면 앱은 동작하지만 AI 생성은 제한됩니다.

## 4. 공개 URL 생성

앱 서비스 → **Settings** → **Networking** → **Generate Domain**

예: `https://aichallenge26-production.up.railway.app`

## 5. 배포 확인

배포가 끝나면 브라우저에서:

- 홈: `https://<도메인>/`
- 헬스: `https://<도메인>/api/health`
- 관리자: `https://<도메인>/admin/login`

`/api/health` 예시 (정상):

```json
{
  "status": "READY",
  "database": { "status": "READY" },
  "websocket": { "status": "READY" }
}
```

## 6. 첫 로그인

- URL: `/admin/login`
- 비밀번호: Variables에 설정한 **`BSP_ADMIN_PASSWORD`**

## 자동 설정 (repo에 포함됨)

| 파일 | 내용 |
|------|------|
| `railway.toml` | 빌드·시작·헬스체크·**DB 마이그레이션(preDeploy)** |
| `Dockerfile` | Docker 배포 대안 |

배포 시 자동 실행:

1. `npm ci && npm run bsp:generate && npm run build`
2. `npm run bsp:migrate:deploy` (pre-deploy)
3. `npm start` (WebSocket 포함 커스텀 서버)

## 문제 해결

| 증상 | 조치 |
|------|------|
| Build 실패 | Deployments → View Logs |
| Health 503 / DB FAILED | `BSP_DATABASE_URL`이 Postgres URL과 같은지 확인 |
| Admin 로그인 실패 | `BSP_ADMIN_PASSWORD` 재확인 |
| WebSocket 끊김 | `npm start`(tsx server) 사용 중인지 확인 — `next start` 사용 금지 |

자세한 내용: [railway.md](./railway.md), [post-deploy-checklist.md](./post-deploy-checklist.md)
