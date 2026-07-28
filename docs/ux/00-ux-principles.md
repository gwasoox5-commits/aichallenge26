# UX 설계 원칙

> **Version 1.1** — See `04-v1.1-appendix.md` for D-01, D-06, U-01~U-07, G-01~G-06

## 1. 역할 정의

| UI 표기 | 내부 Role | 비유 |
|---------|-----------|------|
| **게임 마스터 (GM)** | INSTRUCTOR | 보드게임 진행자 · 환경·속도·이벤트 통제 |
| **CEO (교육생)** | TRAINEE | 한 팀의 경영자 · 현재 단계 의사결정만 수행 |

ERP 용어(전표, 원장, MES, SCM)는 **CEO 화면에 노출하지 않는다.**  
회계·생산 로직은 백엔드에 두고, CEO에게는 **교육 언어**로 번역한다.

## 2. 교육 흐름 = UX의 심장

```
[GM] 반기 시작 → Step 1 활성화
[CEO] Step 1 의사결정 제출
[GM] 완료 현황 확인 → "다음 단계" 클릭
… Step 7(반기 결산) …
[GM] "반기 마감" → 다음 반기
```

모든 화면은 이 루프를 **한눈에 읽을 수 있게** 배치한다.

## 3. 시간 UX

- 1년 = **상반기 + 하반기** (총 3년 = 6반기)
- CEO·GM 공통 헤더: `3년차 · 하반기 · ④ 원재료 구매`
- "Period 3", "FiscalPeriod" 등 내부 ID는 UI에 쓰지 않음

## 4. CEO UX 원칙

1. **한 번에 하나** — 현재 Step만 입력 가능, 나머지는 잠금+미리보기
2. **지금 할 일** — Dashboard 최상단 CTA 하나
3. **왜 하는지** — 각 Step 상단에 1~2문장 학습 목표
4. **결과는 스토리** — 숫자表 대신 "현금 ○○만원 남음" + 간단 그래프
5. **보고서는 학습 탭** — "우리 회사 현황" 아래에 재무제표 (전문 메뉴 X)

## 5. GM UX 원칙

1. **컨트롤 룸 하나** — 80% 업무가 GM Desk 한 화면에서 끝남
2. **경제 환경 실시간** — Desk 우측 패널, 슬라이더 즉시 반영 + CEO Feed
3. **진행 = 버튼 하나** — "다음 단계로"가 가장 눈에 띄는 Primary Action
4. **참가자 그리드** — 팀별 Step 완료 여부를 보드게임 점수판처럼
5. **개입은 예외** — Override·이벤트는 Secondary, 감사 로그 자동

## 6. 금지 패턴 (Anti-patterns)

| ❌ ERP式 | ✅ 교육式 |
|----------|-----------|
| 좌측 12개 모듈 메뉴 | 상단 Step 타임라인 + 3탭 |
| 차변/대변 입력 | "결정 제출" → 자동 반영 |
| Admin Dashboard | GM Desk (게임 진행실) |
| Session Management | 수업/게임 목록 |
| Journal Entry List | (CEO 비노출) |

## 7. 공통 컴포넌트

| Component | 용도 |
|-----------|------|
| `HalfYearBanner` | 3년차 · 상반기 |
| `StepTimeline` | 7 Step 진행 바 |
| `DecisionCTA` | CEO 현재 Step 버튼 |
| `TeamStatusGrid` | GM 팀 완료 현황 |
| `EconomyLivePanel` | GM 실시간 경제 슬라이더 |
| `WorldNewsTicker` | 이벤트·경제 변화 뉴스 |
