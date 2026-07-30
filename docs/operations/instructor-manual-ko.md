# 제조 경영 시뮬레이션 — 강사(GM) 운영 설명서

> **대상**: 강사 · GM · 운영 관리자  
> **접속**: `/admin/login` → `/admin` (역할: GM 또는 PLATFORM_ADMIN)

---

## 1. 강사의 역할

강사(GM)는 시뮬레이션 **진행자**입니다.

- 세션을 만들고 참가 코드를 배포합니다.  
- Step을 열고 닫으며, 팀 제출을 확인합니다.  
- 필요 시 경제 환경·뉴스·이벤트를 반영합니다.  
- 반기 결산을 실행하고, 디브리프로 수업을 마무리합니다.

학습자(CEO)는 `/join` → `/play`만 사용합니다. 강사는 **Admin 콘솔**에서 운영합니다.

---

## 2. Admin 콘솔 구성

좌측 메뉴와 용도:

| 메뉴 | 경로 | 용도 |
|------|------|------|
| **운영 개요** | `/admin` | KPI·빠른 조작·팀 테이블·참가 URL |
| **세션 생성** | `/admin/sessions/new` | Wizard로 새 세션 |
| **세션 관리** | `/admin/sessions` | 목록·아카이브·삭제·경제 이력 |
| **팀 현황** | `/admin/teams` | 팀별 제출·재무·팀 삭제 |
| **회계 감사** | `/admin/accounting-audit` | Journal·Trial Balance 검증 |
| **게임 진행** | `/admin/control` | Step·Pause·Lock·결산·이벤트/경제 |
| **이벤트 스튜디오** | `/admin/event-studio` | AI 시나리오 → 뉴스·경제 패치 발행 |
| **뉴스 Intelligence** | `/admin/intelligence` | 실뉴스 → AI 분석 → Publish |
| **경제 시나리오** | `/admin/world` | World Engine·진화·Event Chain |
| **디브리프** | `/admin/debrief` | 순위·강사용 AI 분석·내보내기 |
| **운영 로그** | `/admin/audit` | GM 조작 감사 로그 |
| **시스템 점검** | `/admin/pilot-check` | API·DB·Realtime 사전 점검 |
| **API 연동** | `/admin/integrations` | OpenAI·뉴스 등 연동 상태 |

### 공통 UI

- **상단 세션 선택**: 활성 세션(브라우저에 기억됨) — Event Studio·Intelligence·경제 시나리오 Session ID와 연동  
- **Realtime Indicator**: `연결됨` 확인 권장  
- **⏸ Pause** 표시: 세션 일시정지 중

---

## 3. 수업 전 준비

### 3-1. 시스템 점검

1. `/admin/pilot-check`에서 DB·OpenAI·뉴스·WebSocket 상태 확인  
2. `/admin/integrations`에서 필요 API 키 연동 확인  
3. Admin 로그인 후 Realtime **연결됨** 확인

### 3-2. 세션 생성 (Wizard)

**경로**: `/admin/sessions/new`

| 단계 | 설정 |
|------|------|
| 1 · 기본 정보 | 세션명, 교육명, 강사명, 메모 |
| 2 · 게임 설정 | 기간(1년2반기/2년4반기/3년6반기), **Step 제한시간(초)**, 자동 진행·뉴스·World·Intelligence 토글 |
| 3 · 초기 경제 | Preset(기본/고금리/수요 약세 등) |
| 4 · 팀 설정 | **참가 정원(팀 수)** — 팀명은 학습자가 Join 시 입력 |
| 5 · 완료 | **Join Code·참가 URL** 복사 → 학습자 배포 |

**데모**: 운영 개요에서 **데모 세션(5팀)** 생성 가능(pilot 허용 시)

### 3-3. 학습자 안내

- 참가 URL: `/join` (또는 `?code=XXXXX`)  
- **1팀 1 CEO** 제출 권장, 팀원은 토론  
- 참가자용 설명서: `docs/operations/participant-manual-ko.md`

---

## 4. 게임 진행 (핵심)

**주요 화면**: `/admin`(운영 개요) 또는 `/admin/control`(게임 진행)

### 4-1. Step 구조

| Step | 명칭 | CEO 입력 | GM 조작 |
|------|------|----------|-----------|
| 1 | 자금조달 | 1A+1B 한 번에 제출 | 완료 후 **다음 Step** 1회 |
| 2 | 설비투자 | O | 다음 Step |
| 3 | 인력채용 | O | 다음 Step |
| 4 | 원재료구매 | O (시장 배분) | 다음 Step |
| 5 | 생산 | O | 다음 Step |
| 6 | 판매 | O (시장 배분) | 다음 Step |
| 7 | 결산 | **없음** | **반기 종료(결산)** |

### 4-2. 매 Step GM 루프

```
CEO 입력 대기 → 제출률 확인 → (미제출 처리) → 다음 Step
```

1. 학습자에게 CEO 대시보드·학습 체크리스트 확인 안내  
2. Step 제한 시간 내 제출 유도  
3. **제출률** 확인 (운영 개요 / 게임 진행)  
4. 미제출 팀: **Zero Submit** 또는 **Force Submit** (사유 필수)  
5. **▶ 다음 Step**  
6. 필요 시 **운영 로그**에서 기록 확인

### 4-3. GM 조작 요약

| 조작 | 효과 |
|------|------|
| **⏸ Pause / ▶ Resume** | CEO 제출 전체 차단/재개 |
| **🔒 Lock / 🔓 Unlock** | 현재 Step 제출만 차단/허용 |
| **Zero Submit** | 미제출 팀에 zero decision (D-10) |
| **Force Submit** | 미제출 팀 강제 제출 |
| **↩ Reopen Step** | 이전 Step 복귀 (**해당 Step 결정 삭제** — 주의) |
| **▶ 다음 Step** | Step 진행 (Step 7에서는 불가) |
| **반기 종료(결산)** | Step 7에서만 — P/L·B/S 확정 |
| **다음 반기 시작** | P1~P5 결산 후 |
| **게임 종료** | P6(3년차 후반기) 결산 후 |

> 모든 GM 조작은 **확인 다이얼로그 + 사유 입력**이 필요합니다.

### 4-4. 권장 조작 버튼

게임 진행 화면에서 상황별 **주황색 권장 버튼**이 제안됩니다.

- Pause 중 → Resume  
- Step 7 → 반기 결산  
- 미제출 존재 → Zero Submit  
- 그 외 → 다음 Step  

### 4-5. Step 진행 불가 조건

- 세션 **PAUSE**  
- **Step 잠금** (Unlock 필요)  
- **HALF_YEAR_END / GAME_END**  
- Step 7에서는 **다음 Step 대신 결산**만 가능

---

## 5. 경제·이벤트·뉴스 반영

### 5-1. 게임 진행 > 경제 제어 (V1)

- 슬라이더로 환율·금리·원자재·수요 등 조정  
- Preset(호황/침체 등) + **적용 시점**(즉시 / 다음 Step / 다음 반기)  
- CEO 화면 Realtime 반영

### 5-2. 게임 진행 > 이벤트 제어 (V1)

- 프리셋 이벤트 카탈로그 발동·예약·종료

### 5-3. 이벤트 스튜디오 (V2.1a)

**경로**: `/admin/event-studio`

```
자연어 입력 → AI 분석 → 3 시나리오 비교 → 경제 변수 Preview
→ 선택 정책 → 발행 시점·뉴스 공개 수준 → GM 승인 → 발행
```

- Session ID는 **상단 활성 세션**과 일치해야 Publish 가능  
- OpenAI 미연동 시 **샘플/Fixture** 모드

### 5-4. 뉴스 Intelligence (V2.3)

**경로**: `/admin/intelligence`

```
키워드 뉴스 검색 → 기사 선택 → AI 분석 → 시나리오 → Preview
→ Publish Workflow → 학습자 뉴스 + 경제 반영
```

- **AI 컨설턴트·품질 점수**는 GM 전용(학습자 비공개)  
- 라이브러리 저장·복제·JSON import 지원  
- 데모 모드: Publish 비활성 가능

### 5-5. 경제 시나리오 / World Engine (V3)

**경로**: `/admin/world`

1. 활성 세션 선택(Session ID 자동 입력)  
2. **시작 시나리오** 선택 (Stable Growth, Recession, AI Boom 등)  
3. **시나리오 적용** — World 초기화  
4. **반기 진행 시뮬** — Evolution Proposal 생성  
5. Proposal **승인(approve)** → **발행(publish)** (V2.4 Publish 경로)  
6. **처음부터 재적용** — 같은 프로필도 force 초기화

패널: 10차원 World State, Risk Map, Forecast, Event Chain, Timeline

---

## 6. 디브리프

**경로**: `/admin/debrief`

| 섹션 | 내용 |
|------|------|
| 팀별 성과·순위 | 현금, 당기순이익, 반기 매출, 순위 |
| 강사용 분석 | 세션 요약, 팀 간 비교, 팀별 의사결정·주의·**토론 질문** |
| 내보내기 | CSV(순위), JSON(desk+analysis) |

- **강사용 AI 분석은 학습자에게 공개하지 마세요.**  
- API 실패 시 에러 메시지·재시도 버튼 표시  
- Realtime으로 팀 제출 시 자동 갱신

### 토론 질문 활용 예

- Step 1 후: 차입·ROE·유동성  
- Step 4 후: 원자재 가격·지역 다변화  
- Step 6 후: 매출 vs 현금·마진  
- 반기 결산 후: P/L 한 줄 설명, 전략 수정점

---

## 7. 전형적 수업 흐름

```
[사전] 시스템 점검
  ↓
세션 생성 → Join Code 배포
  ↓
학습자 /join 참가 → 팀 현황에서 확인
  ↓
(선택) 경제 Preset / World 시나리오 적용
  ↓
┌─ 반기 루프 ─────────────────────────┐
│  Step 1~6: CEO 제출 → GM 다음 Step   │
│  (토론) Pause / Lock 활용            │
│  (선택) 뉴스·이벤트 Publish          │
│  Step 7: GM 반기 결산                │
│  순위·토론 (5~10분 권장)             │
└─────────────────────────────────────┘
  ↓
다음 반기 또는 게임 종료
  ↓
디브리프 → CSV/JSON·운영 로그 보관
  ↓
세션 아카이브·삭제
```

### 권장 일정 (참고)

| 과정 | Step 수 | 순수 진행(토론 제외) |
|------|---------|----------------------|
| 1년 2반기 | 14 | ~2시간 |
| 2년 4반기 | 28 | ~4시간 |
| 3년 6반기 | 42 | ~5.5시간 |

Pilot·단일 수업: **1년 2반기** 또는 **2일 과정** 권장

---

## 8. 장애 대응

| 증상 | 1차 조치 |
|------|----------|
| CEO 제출 불가 | Pause / Step Lock / 이미 제출 / Step 불일치 확인 |
| Realtime 끊김 | 새로고침, `/admin/pilot-check` |
| 미제출 1팀 | Zero Submit → 다음 Step |
| 잘못 advance | Reopen Step (**결정 삭제** — 신중히) |
| 결산 중 오류 | **반기 종료 재실행 금지** → Pause → 로그 확인 |
| 디브리프 무한 로딩 | GM 토큰·세션 선택 확인, 재시도 |
| Intelligence Publish 실패 | Session ID·OpenAI·데모 모드 확인 |

상세: `docs/operations/troubleshooting.md`

---

## 9. 운영 시 주의사항

### 세션·보안

- GM은 **자신의 세션** 데이터만 Admin API에서 조회 가능(세션 스코핑 적용)  
- Join Code는 수업 전까지 비공개 권장

### 서버 재시작 (Railway 등)

- **활성 이벤트·일부 pending 경제 상태**는 메모리에 있어 재시작 시 사라질 수 있음  
- 재시작 후: 세션 Phase·경제 슬라이더·활성 이벤트 **한 번 확인**  
- DB에 저장되는 것: 팀 결정, stepLocked, 경제 패치 이력 등

### 감사·기록

- GM 조작은 **운영 로그**(`/admin/audit`)에 기록  
- 중요 결산·Force Submit은 사유를 구체적으로 입력

---

## 10. 관련 문서

| 문서 | 내용 |
|------|------|
| `participant-manual-ko.md` | 학습자 배포용 · **PDF: [`/manuals`](/manuals)** |
| `instructor-manual-ko.md` | 본 문서 원본 · **PDF: [`/manuals`](/manuals)** |
| `troubleshooting.md` | 장애 트리 |
| `pilot-checklist.md` | Pilot 전 점검 |
| `railway-quickstart-ko.md` | 배포·환경 변수 |

---

*본 설명서는 BSP Admin 콘솔(V1~V3) 기준으로 작성되었습니다. 메뉴명·기능은 버전에 따라 일부 다를 수 있습니다.*
