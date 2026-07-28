# 04. Game Flow 설계

> Phase 0-4 | **Version 1.1** — D-01, D-10, D-11

## 4.1 시간 구조

```
Session (3 years)
 └── FiscalPeriod × 6  (Year 1 H1, H2 … Year 3 H2)
      └── GameStep × 7  (각 Period마다 동일 순서)
```

| Period | Year | Half | Label |
|--------|------|------|-------|
| 1 | 1 | H1 | Y1 상반기 |
| 2 | 1 | H2 | Y1 하반기 |
| 3 | 2 | H1 | Y2 상반기 |
| 4 | 2 | H2 | Y2 하반기 |
| 5 | 3 | H1 | Y3 상반기 |
| 6 | 3 | H2 | Y3 하반기 |

**v1.1**: Step1 = sub-phase 1A(연초)·1B(연중); GM advance once. Skip=zero (D-10). FiscalSnapshot per period (D-11).

---

## 4.2 Step 정의

| Order | Step | CEO 입력 | 회계 처리 |
|-------|------|----------|-----------|
| 1 | LOAN | 차입·예금 | 차입금/예금부채·현금 |
| 2 | FACILITY | 토지·기계 | 유형자산·현금 |
| 3 | HIRING | 부서별 인원 | — (인건비는 결산) |
| 4 | MATERIAL | 지역별 원재료 | 재고·매입채무·현금 |
| 5 | PRODUCTION | 생산량 | 재고 이동·제조원가 |
| 6 | SALES | 지역별 판매 | 매출·매출원가·재고 |
| 7 | SETTLEMENT | 조회 only | 감가·이자·세금·결산 |

---

## 4.3 비즈니스 룰 (엑셀 참고 → 플랫폼 규칙)

| 항목 | 규칙 |
|------|------|
| 통화 단위 | 만원 |
| 초기 현금 | 10,000 (1억) |
| BOM | 원재료 4 → 완제품 1 |
| 부서 | 구매 30/인·생산 10/인·영업 10/인 (capacity) |
| 기계 | Large 600만/30대/80만, Small 300만/10대/40만 |
| 토지 | 3,000만/필지, max 4 |
| 물류 | 원재료 5만/단위, 완제품 10만/단위 |
| 금리 | 차입 10%, 예금 5% (Admin 변경 가능) |

**차이점 (플랫폼)**  
- 엑셀 셀 검증 → Service Layer Validation  
- 수동 OK → Admin Step advance + auto Journal  
- 시트3장 → 실시간 B/S·P/L·C/F

---

## 4.4 Game Engine 상태机

```mermaid
stateDiagram-v2
  state Session {
    [*] --> DRAFT
    DRAFT --> RUNNING: start
    RUNNING --> PAUSED: pause
    PAUSED --> RUNNING: resume
    RUNNING --> COMPLETED: end
  }
  state Period {
    OPEN --> CLOSED: closePeriod
  }
  state Step {
    LOAN --> FACILITY --> HIRING --> MATERIAL
    MATERIAL --> PRODUCTION --> SALES --> SETTLEMENT
  }
```

---

## 4.5 Period Close 파이프라인

```
1. 모든 Company SETTLEMENT viewed (optional gate)
2. Admin closePeriod
3. DepreciationService.run(period)
4. InterestService.run(period)
5. PayrollService.run(period)
6. TaxService.run(period)
7. MarketClearingService.run(period)  // 잔여 수요
8. EconomicSnapshot.create
9. EventEngine.onPeriodEnd
10. periodIndex++, step=LOAN
11. Year-end? → AnnualAIAnalysis.enqueue
```

---

## 4.6 CEO Decision 생명주기

```
DRAFT (client) → SUBMITTED → VALIDATED → POSTED → LOCKED
```

- POSTED: JournalEntry 생성
- LOCKED: Step advance 후 수정 불가
- Admin override: REVISED + adjustment entry

---

## 4.7 동기화 모델

| 항목 | 방식 |
|------|------|
| Step | Session-level singleton |
| Decisions | Company-level |
| Economy/Market | Session-level |
| Events | Session-level effect, Company-level target optional |

---

## 4.8 교육 시나리오 예시

**Scenario A (기본)**  
- Y1: 안정 성장, 이벤트 없음  
- Y2 H1: 환율 급등 이벤트  
- Y2 H2: 원자재 부족  
- Y3: AI 혁명 + 탄소세  

Scenario Editor가 Period/Half에 action 바인딩 → Session load 시 스케줄 등록

---

## 4.9 Game Flow ↔ Module 매핑

| Step | Modules |
|------|---------|
| LOAN | Accounting, ERP |
| FACILITY | ERP, Simulation |
| HIRING | ERP |
| MATERIAL | SCM, Accounting |
| PRODUCTION | MES, Accounting |
| SALES | SCM, Accounting |
| SETTLEMENT | Accounting, Education |

Game Engine = orchestrator (packages/application)
