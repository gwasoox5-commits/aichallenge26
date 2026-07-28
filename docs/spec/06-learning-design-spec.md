# Learning Design Specification

> **Supreme principles**: `00-v1-development-principles.md`  
> Version **1.1** | D-01, D-03, D-05, D-06, D-14, U-06 reflected

## 핵심 철학

> **이 플랫폼은 정답을 찾는 게임이 아니라, 동일한 경영환경에서도 서로 다른 의사결정이 서로 다른 재무성과를 만들어내는 과정을 학습하는 교육 플랫폼이다.**

교육 설계의 목적은 **Step별 개념 습득**과 **의사결정 근거 설명**이다. 순위·점수는 동기 부여이지 학습 평가의 전부가 아니다.

---

## 0. 전체 학습 아크 (3년 · 6반기)

| Year | Half | 교육 초점 | GM Facilitation |
|------|------|-----------|-----------------|
| 1 | H1 | Value Chain 기초 · 첫 결산 | 규칙·화면 익숙, 이벤트 최소 |
| 1 | H2 | 현금 vs 이익 · 재고 | 첫 Live Ranking 토론 |
| 2 | H1 | CAPEX·인력·구조조정 | 이벤트 본격 (환율·원자재) |
| 2 | H2 | 시장·가격·점유율 | 경쟁·관세 시나리오 |
| 3 | H1 | 리스크·ESG·AI | 복합 이벤트 |
| 3 | H2 | 통합·전략·회고 | Final Report + 발표 |

### 반기 내 7 Step — 학습 순서의 의미

```
자금(유동성) → 설비(능력) → 인력(실행) → 구매(투입) → 생산(변환) → 판매(가치실현) → 결산(피드백)
```

교육생은 **매 반기 이 순환을 반복**하며, 숫자가 쌓일수록 인과관계를 설명할 수 있어야 한다.

### 학습 평가 (교육자 관점, 순위와 별도)

| 시점 | 방법 |
|------|------|
| Step 제출 후 | 2분 페어 셰어: "왜 이렇게 결정했는가?" |
| Step 7 | 팀별 3분: P/L 한 줄 해석 |
| 반기 마감 | GM 토론 질문 1~2개 |
| 게임 종료 | KPI + 이벤트 대응 발표 (5분/팀) |

---

### v1.1 — D-05, D-14 Ranking in classroom

- GM announces: "순위는 동기용, 학습 평가는 토론·발표"
- P1~P2: operating leaderboard only; celebrate **Improvement MVP**
- P3+: full ranking with delta vs prior half

---

## Step 1 — 자금 조달 (LOAN / STEP1_FINANCE)

### v1.1 — 2-Phase facilitation (D-01)

| Phase | GM says | CEO does |
|-------|---------|----------|
| **1A 연초** | "연초 차입·예금을 결정하세요" | loanEarly, deposit |
| **1B 연중** | "연중 추가 차입·상환을 생각하세요" | loanMid, loanRepayment (D-03) |

Same Step — GM advances once both phases done.

### v1.1 — D-03 Repayment teaching

- `loanRepayment` in Phase 1B: "차입 상환도 자금 결정"
- Step7: no new input — review interest + repayment outcome

### 학습 목표

- **차입과 자기자본의 차이** — 소유 vs 채무, 재무 레버리지
- **부채비율 이해** — 차입 한도(자기자본 이하)의 의미
- **이자비용 이해** — 차입 10% vs 예금 5%, 반기 결산 시점 인식
- **유동성 관리** — 현금을 설비·구매에 쓸 여력 남기기

### 참가자가 고민해야 하는 질문

- 이번 반기에 얼마나 차입·예금할 것인가?
- 차입을 늘리면 생산·판매 여력은 늘지만, 이자 부담은?
- 예금은 중도 인출 불가 — 얼마나 묶을 수 있는가?
- 남은 현금으로 Step 2~4를 버틸 수 있는가?

### 강사(GM)가 던질 질문

- "차입금 2,000만을 쓰면 ROE는 올라갈 수 있지만, 무엇이 위험해지나?"
- "예금 1,000만을 넣은 팀과 넣지 않은 팀, 하반기 결산에서 무엇이 달라질까?"
- "자기자본 이하만 차입할 수 있다는 규칙은 왜 있을까?"

### 자주 하는 실수

- **과도한 차입** → Step 2~4 현금 부족, 이자비용 과다
- **과도한 예금** → 운영 자금 고갈 (중도 인출 불가)
- **연초·연중 차입 구분 무시** → 한도(1억) 초과
- 차입=수익으로 착각 (이자비용 미고려)

### 토론 포인트

- 공격적(레버리지) vs 보수적(현금 보유) 전략
- 금리 인상 이벤트 시 사전 대비 (Event: 금리)
- "이익은 좋은데 왜 파산하나?" — 현금 관점 예고

### 연결 Step / Event

- **다음**: Step 2 CAPEX 현금 제약
- **Event**: 금리 인상, 신용경색

---

## Step 2 — 설비 투자 (FACILITY / STEP2_INVESTMENT)

### 학습 목표

- **CAPEX** — 자본적 지출 vs 비용( OPEX ) 구분
- **생산능력** — 토지·기계와 max 생산량, BOM 역산(재료 4→1)
- **고정비** — 기계 가동비(대형 80만/소형 40만), 감가상각(결산)
- **투자 타이밍** — 일찍 투자 vs 점진적 확장

### 참가자가 고민해야 하는 질문

- Big vs Small 기계 — 단위당 CAPEX·capacity·가동비 trade-off?
- 토지 4필지 한도 — 지금 몇 필지까지?
- 필지당 Big 2 or Small 4 — 조합은?
- Step 5 생산 목표에 맞는 capacity인가?

### 강사가 던질 질문

- "기계만 사고 토지가 부족하면?"
- "생산능력 20개인데 원재료는 80개까지 필요 — 왜 4배인가?" (BOM)
- "가동비를 내고도 기계를 가동하지 않으면?"

### 자주 하는 실수

- **현금 전액 CAPEX** → Step 4 구매 불가
- **토지·기계 비율 위반** (필지당 한도)
- **과잉 투자** — 1반기 수요 대비 capacity 과대
- Small만 많이 → capacity 대비 가동비 inefficiency

### 토론 포인트

- Lead time: 1년차 H1 투자 → H2·2년차 수확
- AI/기술 이벤트 시 기존 설비 stranded asset?
- ESG: 노후 설비 vs 친환경 설비 (향후 확장)

### 연결

- **이전**: Step 1 현금
- **다음**: Step 3 인력·Step 5 capacity ceiling

---

## Step 3 — 인력 채용 (HIRING / STEP3_HR)

### 학습 목표

- **인건비 vs 처리량** — 구매 30/생산 10/영업 10 (인·반기)
- **병목(Bottleneck)** — 3부서 capacity 중 최소값이 전체 제약
- **고정비 성격** — 인건비는 결산 시 인식, 채용=반기 commitment
- **구조조정**(2년차~) — 전환·퇴사, 유연성 vs 비용

### 참가자가 고민해야 하는 질문

- 구매·생산·영업 인원을 어디에 몇 명?
- Step 4~6 중 어디가 병목이 될까?
- 2년차부터: 전환 vs 신규 채용 vs 퇴사?

### 강사가 던질 질문

- "구매 인원 1명 vs 3명 — Step 4에서 무엇이 달라지나?"
- "생산 인원은 많은데 기계가 없으면?"
- "영업 인원 0명이면 Step 6에서?"

### 자주 하는 실수

- **한 부서만 과채용** → 다른 Step capacity unused
- **인건비 underestimation** — 결산 P/L shock
- 구조조정 규칙(30/100 단위) 미숙지
- 인력=즉시 매출 증가로 오해

### 토론 포인트

- 인력 flex vs automation (AI 이벤트)
- 파업·인건비 상승 (Event: LABOR)
- 생산성 KPI와의 연결

### v1.1 — D-02

- 1년차: 구조조정 UI **숨김**; 2년차부터 전환·퇴사 필드 활성

### 연결

- **다음**: Step 4~6 capacity limits

---

## Step 4 — 원재료 구매 (MATERIAL / STEP4_PURCHASE)

### v1.1 — D-08

- V1: **즉시 구매** (지역 표시가); 입찰 교육은 GM 구두·시나리오·V2 bid module

### 학습 목표

- **조달·재고·물류** — 7지역, 단가·한도·물류 5만/단위
- **BOM 연계** — 4종 재료, Step 5 소모량 예측
- **환율·관세·원자재指数** — Economy/Event 반영
- **현금 vs 재고** — 재고는 자산, 현금 감소

### 참가자가 고민해야 하는 질문

- 어느 지역에서 얼마나? (단가 vs 물류 vs 한도)
- Step 5 생산량만큼만? safety stock?
- 브랜치 개설(신규 지역) 비용 worth it?
- 환율·원자재 이벤트 반영했는가?

### 강사가 던질 질문

- "가장 싼 지역만 사면?"
- "재료를 많이 사두면 B/S와 C/F에서 어떻게 보이나?"
- "구매 인원 capacity 60인데 100 단위 주문하면?"

### 자주 하는 실수

- **생산량 미고려 과구매** → 재고 cash trap
- **capacity 초과** 구매량
- **수입 지역 무시** — 환율↑ 시 cost shock
- 낙찰·한도 규칙 위반 → **V1: instant buy 한도·현금** (D-08)

### 토론 포인트

- Just-in-time vs buffer stock
- 공급망 disruption (Event: SUPPLY)
- 단일 공급원 vs 다변화

### 연결

- **Economy**: rawMaterialIndex, exchangeRate, tariff, logistics
- **다음**: Step 5 material constraint

---

## Step 5 — 생산 (PRODUCTION / STEP5_PRODUCTION)

### 학습 목표

- **BOM** — 재료 4개 = 제품 1개, min(restock) constraint
- **capacity 통합** — min(재료, 기계, 인력)
- **제조원가·가동비** — 기계 가동, carbon (Event)
- **재고 이동** — 원재료↓ 완제품↑ (B/S)

### 참가자가 고민해야 하는 질문

- max 생산량은? 실제 몇 개 생산?
- 기계 full 가동? — 가동비 vs idle
- Step 6 판매 계획과 lot size 맞춤?

### 강사가 던질 질문

- "재료는 80개분 있는데 30개만 생산 — 왜?"
- "가동비 80만 내고 0개 생산?"
- "생산성 KPI는 어떻게 계산되나?"

### 자주 하는 실수

- **max 초과 생산** 입력
- **재료 부족** — Step 4 underestimation
- **과생산** → Step 6 재고·물류비
- 기계 대수 ≠ 가동 대수 혼동

### 토론 포인트

- OEE·가동률 (교육용 단순화 설명)
- 탄소세·ESG 생산 제약
- AI automation productivity

### 연결

- **다음**: Step 6 FG inventory

---

## Step 6 — 판매 (SALES / STEP6_SALES)

### 학습 목표

- **수요·가격·지역** — 7지역, 상한가·판매한도
- **매출 vs 현금** — 물류 10만/개, C/F timing
- **매출원가** — Step 5와 연결, gross margin
- **시장점유율** — Live Ranking 운영 지표

### 참가자가 고민해야 하는 질문

- 어느 지역에 몇 개, 어떤 가격?
- 재고 전량 판매 vs hold?
- 수요 index↓ 시 가격 인하 vs volume?

### 강사가 던질 질문

- "마진이 높은 지역 vs volume 지역?"
- "판매하지 못한 재고의 carrying cost는?"
- "경쟁사 등장 이벤트 — 가격 war?"

### 자주 하는 실수

- **영업 capacity 초과** 판매
- **재고 초과** 판매
- **단가 상한** 위반
- 매출=max profit 착각 (원가·물류 무시)

### 토론 포인트

- Price elasticity (교육용)
- Brand·ESG premium (향후)
- Export vs domestic mix

### 연결

- **다음**: Step 7 P/L 매출·COGS

---

## Step 7 — 반기 결산 (SETTLEMENT / STEP7_SETTLEMENT)

### v1.1 — D-03, D-11, U-02

| Item | Rule |
|------|------|
| CEO input | **None** — guided learning UI |
| 차입상환 | Step1 `loanRepayment` 결과 review |
| 잡수익 | GM `miscIncome` — discuss "교육 퀴즈" |
| Statements | **반기 scope** default (D-11); period selector |
| UI | P/L walkthrough checklist (U-02), not empty waiting |
| Y3 H2 | + "최종 전략" reflection prompt (D-06) |

### 학습 목표

- **손익계산서** — 매출→당기순이익, 비용 분류
- **재무상태표** — 자산·부채·자본, 이월
- **현금흐름표** — 이익≠현금, 이자·CAPEX·재고
- **피드백 루프** — 이번 반기 의사결정 → 숫자 연결 설명

### 참가자가 고민해야 하는 질문

- (입력 없음) — **해석** 중심
- 영업이익 vs 당기순이익 차이는?
- 현금 잔액 vs 이익잉여금?
- 다음 반기 Step 1에서 무엇을 바꿀까?

### 강사가 던질 질문

- "이번 반기 가장 큰 비용 항목은? 왜?"
- "현금은 줄었는데 이익은 났다/반대 — 이유?"
- "팀 순위와 ROE가 다른 이유?"
- "다음 반기 한 가지만 바꾼다면?"

### 자주 하는 실수

- **재무제표 숫자만 읽고 원인 설명 못함**
- 이자·감가·세금 surprise (Step 1·2에서 예고 필요)
- 순위=경영 잘함 단순화
- 결산=끝, 다음 반기 연계 없음

### 토론 포인트

- 반기 회고 10분 (GM 주도)
- AI Consultant 피드백 검토
- Event 대응 평가 ("그때 왜 그렇게 했나?")

### 연결

- **Financial Statement Screen**
- **Live Ranking** 갱신
- **Final Report** (P6)

---

## 부록 A — GM Facilitation Script (반기당)

| Step | GM 30초 브리핑 예시 |
|------|---------------------|
| 1 | "이번 반기 현금 계획을 세우세요. 이자는 결산에 나옵니다." |
| 2 | "생산 목표를 먼저 상상하고 설비를 고르세요." |
| 3 | "병목 부서를 찾으세요." |
| 4 | "Step 5 생산량을 머릿속으로 정하고 구매하세요." |
| 5 | "max는 시스템이 알려줍니다. 왜 그 숫자인지 설명할 수 있어야 합니다." |
| 6 | "재고를 남기면 B/S에 남습니다." |
| 7 | "3분 동안 P/L 한 줄씩 팀 발표 후 반기 마감합니다." |

---

## 부록 B — Learning ↔ Rule Book 매핑

| Step | Rule Book § | Decision Engine |
|------|-------------|-----------------|
| 1 | §1.6 Step1 | DecisionLoan |
| 2 | §1.6 Step2 | DecisionFacility |
| 3 | §1.6 Step3 | DecisionHire |
| 4 | §1.6 Step4 | DecisionPurchase |
| 5 | §1.6 Step5 | DecisionProduction |
| 6 | §1.6 Step6 | DecisionSales |
| 7 | §1.6 Step7 | SettlementRun |

---

## 부록 C — Event · Step 교육 연계

Event 발생 시 GM은 **해당 Step 토론 포인트**를 Scenario Library `discussionQuestions`와 Learning Design **강사 질문**을 조합해 사용한다.

See: `07-scenario-library.md`, `06-document-review.md`
