# Scenario Library

> Version **1.1** | D-04 `recommendedPeriod` metadata  
> Minimum **53 events** | Categories: 14  
> Apply via Event Engine — GM edits & approves; Fire **NORMAL** (D-15)

## v1.1 — Event Metadata Schema (D-04)

Every event template MUST include:

```json
{
  "eventId": "EVT-001",
  "recommendedPeriod": ["Y1H2", "Y2H1", "Y2H2", "Y3H1", "Y3H2"],
  "avoidPeriod": ["Y1H1"],
  "minYear": 1,
  "maxSeverityInAvoid": 3,
  "suggestedOnStep": ["MATERIAL", "SALES"]
}
```

**Default by category**

| Category | avoidPeriod | recommendedPeriod |
|----------|-------------|-------------------|
| 환율, 금리, 원자재 | Y1H1 | Y1H2+ |
| 전쟁, 팬데믹, 자연재해 | Y1H1 | Y2H1+ |
| AI, ESG, 탄소세 | Y1H1 | Y2H2+ |
| 정부 정책, 관세 | — | Y1H2+ ( mild ) |

## 사용법

1. Scenario Editor 타임라인에 `eventTemplateId` 배치  
2. 또는 GM Desk Quick Event / AI Generator → Library 저장  
3. Fire 시 **Normal** default · Best/Worst는 교육 토론·What-if용  

## 변수 키 (Economy Engine)

`exchangeRate` `interestRateLoan` `interestRateDeposit` `rawMaterialIndex` `marketDemandIndex` `marketSupplyIndex` `logisticsCostMultiplier` `tariffRate` `corporateTaxRate` `carbonTaxRate` `businessCycleIndex`

## Region IDs

`EU` `ASIA` `ME` `AFRICA` `OCEANIA` `NA` `SA`

---

# Category: 환율 (FX)

---

### EVT-001 | 원화 급격 약세

**recommendedPeriod (D-04)**: `Y1H2`, `Y2H1+` · **avoidPeriod**: `Y1H1` · severity: 3

**배경**  
글로벌 달러 강세로 수입 원자재·장비 비용이 상승한다.

**영향 산업**  
GENERAL_MANUFACTURING, LOGISTICS, CHEMICAL

**영향 변수**  
| Variable | Normal |
|----------|--------|
| exchangeRate | +12% |
| rawMaterialIndex | +6% |
| logisticsCostMultiplier | ×1.05 |

**Best** (확률 20%)  
국내 조달 비중 확대 성공, exchangeRate +8%만 반영.  
**Normal** (60%)  
위 표.  
**Worst** (20%)  
+ exchangeRate +18%, rawMaterial +12%, NA/ASIA supply −10%

**교육 포인트**  
- 환율은 구매·COGS·마진에 동시 영향  
- 헷지·조달 다변화 개념  

**토론 질문**  
- 수입 지역 비중을 줄일 것인가, 가격 전가할 것인가?  
- 차입 통화 가정(교육용)을 팀이 어떻게 반영했는가?

---

### EVT-002 | 엔화·위안 동반 약세 (아시아)

**배경**  
아시아 통화 약세로 아시아 경쟁사 수출 가격이 유리해진다.

**영향 산업**  
GENERAL_MANUFACTURING, AUTOMOTIVE

**영향 변수**  
| Variable | Normal |
|----------|--------|
| exchangeRate | +5% |
| marketDemandIndex (ASIA) | −8% |
| marketSupplyIndex | +10% |

**Best** / **Normal** / **Worst**  
- Best: ASIA export opportunity +5% demand  
- Normal: 위 표  
- Worst: price war, demand −15%, margin squeeze  

**교육 포인트**  
- 경쟁 환율 vs 본사 functional currency  
- 지역별 mix  

**토론 질문**  
- 아시아 판매 가격을 인하할 것인가?

---

### EVT-003 | 원화 강세 (수출 불리)

**배경**  
원화 appreciation, 수출 지역 가격 경쟁력 하락.

**영향 산업**  
GENERAL_MANUFACTURING, STEEL

**영향 변수**  
exchangeRate −10%, marketDemandIndex (EU, NA) −6%

**Best** / **Normal** / **Worst**  
Best: domestic demand offset; Worst: export −20%, inventory buildup  

**교육 포인트**  
수출·수입 mix, C/F 환차 (교육용 단순화)

**토론 질문**  
국내 시장으로 pivot?

---

### EVT-004 | 급격한 환율 변동성 확대

**배경**  
FX volatility, 단기 hedging 비용 상승.

**영향 산업**  
GENERAL_MANUFACTURING, FINANCE (교육 비유)

**영향 변수**  
exchangeRate +8%, logisticsCostMultiplier ×1.15

**Best** / **Normal** / **Worst**  
Best: fixed contract; Normal: above; Worst: +20% spike mid-half  

**교육 포인트**  
불확실성下的 의사결정

**토론 질문**  
Safety stock vs FX exposure?

---

# Category: 금리

---

### EVT-005 | 기준금리 인상

**배경**  
중앙은행 긴축, 차입 비용 상승.

**영향 변수**  
interestRateLoan +3%p, interestRateDeposit +1%p, marketDemandIndex −5%

**Best** / **Normal** / **Worst**  
Best: low debt teams; Worst: +5%p loan, credit crunch L01 tighter  

**교육 포인트**  
Step1 차입과 Step7 이자비용 연결

**토론 질문**  
고부채 팀의 대응은?

---

### EVT-006 | 금리 인하 (경기 부양)

**배경**  
경기 침체 대응 금리 cut.

**영향 변수**  
interestRateLoan −2%p, marketDemandIndex +8%

**Best** / **Normal** / **Worst**  
Worst: stagflation, demand flat, rawMat +10%

**교육 포인트**  
레버리지 timing

**토론 질문**  
지금 투자(CAPEX) 확대?

---

### EVT-007 | 신용경색

**배경**  
은행 대출 축소, 차입 한도 압박.

**영향 변수**  
interestRateLoan +4%p; Rule override: loanMid max 5,000만 (교육 옵션)

**Best** / **Normal** / **Worst**  
Worst: no new loan, rollover only

**교육 포인트**  
유동성 crisis

**토론 질문**  
현금 burn rate 계산?

---

### EVT-008 | 예금 금리 프리미엄

**배경**  
정부 예금 우대, Step1 예금 유인.

**영향 변수**  
interestRateDeposit +2%p

**Best** / **Normal** / **Worst**  
Best: high deposit + low need cash; Worst: opportunity cost on CAPEX

**교육 포인트**  
중도 인출 불가 규칙 재확인

**토론 질문**  
얼마를 묶을 것인가?

---

# Category: 원자재

---

### EVT-009 | 원자재 가격 급등

**배경**  
commodity super cycle.

**영향 변수**  
rawMaterialIndex +25%

**Best** / **Normal** / **Worst**  
Best: long contract; Worst: +40%, shortage

**교육 포인트**  
Step4 구매·Step5 COGS

**토론 질문**  
재고 선매 vs just-in-time?

---

### EVT-010 | 석유·에너지 shock

**배경**  
유가 상승, 물류·에너지비 전가.

**영향 변수**  
rawMaterialIndex +15%, logisticsCostMultiplier ×1.25

**교육 포인트**  
물류 5/10만과 연결

**토론 질문**  
판매가 전가 가능?

---

### EVT-011 | 원자재 가격 급락

**배경**  
수요 둔화로 raw material collapse.

**영향 변수**  
rawMaterialIndex −20%

**Best** / **Normal** / **Worst**  
Worst: inventory write-down (교육 narrative)

**교육 포인트**  
고재고 팀의 loss vs 저재고 팀

**토론 질문**  
저점 매수 vs 필요분만?

---

### EVT-012 | 희토류·핵심 소재 제약

**배경**  
battery/semiconductor input shortage (교육 비유).

**영향 변수**  
rawMaterialIndex +18%, marketSupplyIndex −15%

**교육 포인트**  
BOM 4:1 bottleneck

**토론 질문**  
생산량 cut vs 대체 supplier?

---

# Category: 공급망

---

### EVT-013 | 항만 파업

**배경**  
major port strike, inbound delay.

**영향 변수**  
logisticsCostMultiplier ×1.3, marketSupplyIndex −12%

**Best** / **Normal** / **Worst**  
Worst: one-half delivery miss, production cap −30%

**교육 포인트**  
Step4→5 lead time

**토론 질문**  
domestic vs import mix?

---

### EVT-014 | Suez/운하 차단 (교육 시나리오)

**배경**  
해운 route disruption.

**영향 변수**  
logistics ×1.5, EU/ME lead time +1 period narrative

**교육 포인트**  
global supply chain risk

**토론 질문**  
multi-sourcing ROI?

---

### EVT-015 | Tier-2 공급사 부도

**배경**  
supplier bankruptcy.

**영향 변수**  
marketSupplyIndex −20%, rawMaterialIndex +10%

**Best** / **Normal** / **Worst**  
Best: dual source; Worst: force majeure

**교육 포인트**  
counterparty risk

**토론 질문**  
inventory buffer 정책?

---

### EVT-016 | Just-in-Time 붕괴

**배경**  
industry-wide JIT failure.

**영향 변수**  
logistics ×1.2, rawMaterialIndex +8%, production capacity temp −15%

**교육 포인트**  
재고의 전략적 가치

**토론 질문**  
working capital vs service level?

---

# Category: 전쟁

---

### EVT-017 | 지역 분쟁 — 에너지·물류

**배경**  
regional conflict, energy & shipping risk.

**영향 변수**  
rawMaterialIndex +20%, logistics ×1.4, marketDemandIndex −10%

**교육 포인트**  
geopolitical risk

**토론 질문**  
exit market vs stay?

---

### EVT-018 | 제재·수출 통제

**배경**  
export controls on tech/components.

**영향 변수**  
tariffRate +15%, NA/EU supply −25%

**교육 포인트**  
compliance & supply

**토론 질문**  
alternative sourcing regions?

---

### EVT-019 | 난민·노동 이동 (물류 인력)

**배경**  
logistics labor shortage from crisis.

**영향 변수**  
logistics ×1.35, marketSupplyIndex −8%

**교육 포인트**  
humanitarian + business link (교육 sensitivity)

**토론 질문**  
cost pass-through ethics?

---

# Category: 관세

---

### EVT-020 | 미·중 관세 25%

**배경**  
US tariffs on imports (교육 시나리오).

**영향 변수**  
tariffRate +25%, rawMaterialIndex +10%, marketDemandIndex (NA) −5%

**Best** / **Normal** / **Worst**  
Best: localize; Worst: retaliatory tariff spiral

**교육 포인트**  
trade war

**토론 질문**  
see Event Engine spec example

---

### EVT-021 | RCEP 관세 인하

**배경**  
Asia trade pact, tariff cut.

**영향 변수**  
tariffRate −8%, ASIA demand +6%

**교육 포인트**  
FTA opportunity

**토론 질문**  
shift procurement to ASIA?

---

### EVT-022 | 보복 관세

**배경**  
retaliatory tariffs on exports.

**영향 변수**  
tariffRate +12%, EU/NA demand −8%

**교육 포인트**  
export dependency

**토론 질문**  
market diversification?

---

### EVT-023 | 반덤핑 관세

**배경**  
anti-dumping duty on low-price exports.

**영향 변수**  
tariffRate +18%, marketDemandIndex −6%

**교육 포인트**  
pricing strategy

**토론 질문**  
volume vs price?

---

# Category: 탄소세

---

### EVT-024 | 탄소세 도입

**배경**  
carbon tax on production emissions.

**영향 변수**  
carbonTaxRate new (교육: 5만/생산단위), corporateTax neutral

**교육 포인트**  
Step5 carbon line

**토론 질문**  
cut production vs pay tax?

---

### EVT-025 | CBAM (탄소국경조정)

**배경**  
EU CBAM on imports.

**영향 변수**  
carbonTaxRate +50%, EU sales max price −5%

**교육 포인트**  
export carbon cost

**토론 질문**  
EU exit vs green invest?

---

### EVT-026 | 배출권 가격 급등

**배경**  
ETS price spike.

**영향 변수**  
carbonTaxRate ×2, machine op cost +5%

**교육 포인트**  
OPEX vs environment

**토론 질문**  
efficiency invest timing?

---

# Category: ESG

---

### EVT-027 | ESG 투자자 boycott

**배경**  
ESG rating downgrade sector.

**영향 변수**  
marketDemandIndex −7%, interestRateLoan +1%p (risk premium narrative)

**교육 포인트**  
non-financial → financial

**토론 질문**  
ESG disclosure value?

---

### EVT-028 | 친환경 조달 의무

**배경**  
green procurement mandate.

**영향 변수**  
rawMaterialIndex +12% (green premium), ASIA supply +5%

**교육 포인트**  
cost of compliance

**토론 질문**  
premium pass-through?

---

### EVT-029 | 인권·노동 감사 실패

**배경**  
supply chain labor scandal.

**영향 변수**  
marketDemandIndex −10%, brand narrative

**교육 포인트**  
reputation risk

**토론 질문**  
supplier audit cost?

---

### EVT-030 | 녹색 보조금

**배경**  
government green capex subsidy.

**영향 변수**  
Rule: Small machine −10% cost (1 period), carbonTax −50%

**교육 포인트**  
policy incentive

**토론 질문**  
accelerate CAPEX?

---

# Category: AI

---

### EVT-031 | AI 생산성 혁명

**배경**  
AI automation boosts productivity.

**영향 변수**  
production capacity +15% (temp), headcount need − narrative

**Best** / **Normal** / **Worst**  
Worst: skill gap, only +5%

**교육 포인트**  
productivity vs employment

**토론 질문**  
hire less or produce more?

---

### EVT-032 | AI 경쟁사 등장

**배경**  
AI-native competitor, lower cost.

**영향 변수**  
marketSupplyIndex +15%, marketDemandIndex −8%

**교육 포인트**  
competitive dynamics

**토론 질문**  
price match or differentiate?

---

### EVT-033 | AI 규제 강화

**배경**  
AI compliance cost.

**영향 변수**  
corporateTax +2%p narrative, production cap −5%

**교육 포인트**  
regulation & innovation

**토론 질문**  
invest in compliant AI?

---

### EVT-034 | 생성형 AI 수요 폭발

**배경**  
new product category demand surge.

**영향 변수**  
marketDemandIndex +20%, rawMaterialIndex +10%

**Best** / **Normal** / **Worst**  
Best: first mover; Worst: capacity miss

**교육 포인트**  
capacity planning

**토론 질문**  
Step2 past invest enough?

---

# Category: 기술혁신

---

### EVT-035 | 스마트팩토리 보급

**배경**  
Industry 4.0 adoption wave.

**영향 변수**  
Small machine efficiency +20%, Big op cost −10%

**교육 포인트**  
tech & CAPEX

**토론 질문**  
Big vs Small mix change?

---

### EVT-036 | 신소재 등장 (BOM 변경 narrative)

**배경**  
new material reduces BOM 4→3 (교육 optional GM flag)

**영향 변수**  
rawMaterialIndex −5%, production +10% (if adopted)

**교육 포인트**  
innovation adoption

**토론 질문**  
early adopter risk?

---

### EVT-037 | 특허 만료 — generic competition

**배경**  
price erosion.

**영향 변수**  
marketDemandIndex flat, max sale price −15%

**교육 포인트**  
margin compression

**토론 질문**  
cost leadership?

---

### EVT-038 | R&D tax credit

**배경**  
government R&D incentive.

**영향 변수**  
corporateTaxRate −3%p (narrative), future demand +5% H+1

**교육 포인트**  
fiscal policy

**토론 질문**  
invest now for later?

---

# Category: 자연재해

---

### EVT-039 | 대지진 — 공장 가동 중단

**배경**  
earthquake, production halt 半기.

**영향 변수**  
production capacity −40% (1 period), logistics ×1.2

**교육 포인트**  
business continuity

**토론 질문**  
insurance vs redundancy?

---

### EVT-040 | 홍수 — 공급망 침수

**배경**  
flood destroys supplier region.

**영향 변수**  
marketSupplyIndex −25%, rawMaterialIndex +15%

**교육 포인트**  
disaster recovery

**토론 질문**  
alternate regions in Step4?

---

### EVT-041 | 가뭄 — 농산 원료 (비유)

**배경**  
agri-input shortage, chemical upstream.

**영향 변수**  
rawMaterialIndex +12%

**교육 포인트**  
secondary supply chain

**토론 질문**  
substitution?

---

### EVT-042 | 태풍 — 항만 closure

**배경**  
typhoon season port close.

**영향 variables**  
logistics ×1.4 (1 period)

**교육 포인트**  
seasonality

**토론 질문**  
timing purchases?

---

# Category: 팬데믹

---

### EVT-043 | 팬데믹 — 수요 crash

**배경**  
pandemic demand shock.

**영향 변수**  
marketDemandIndex −30%, logistics ×1.1

**Best** / **Normal** / **Worst**  
Best: essential goods +10%; Worst: −45%

**교육 포인트**  
black swan

**토론 질문**  
fixed cost burden?

---

### EVT-044 | lockdown — 생산 중단

**배경**  
factory shutdown.

**영향 변수**  
production capacity −50%, payroll narrative fixed

**교육 포인트**  
fixed vs variable cost

**토론 질문**  
cash runway?

---

### EVT-045 | vaccine recovery — V-shape

**배경**  
reopening surge.

**영향 변수**  
marketDemandIndex +25%, rawMaterialIndex +8%

**교육 포인트**  
recovery timing

**토론 질문**  
inventory for surge?

---

# Category: 경쟁사

---

### EVT-046 | 신규 저가 경쟁사 진입

**배경**  
new entrant, price war.

**영향 변수**  
marketSupplyIndex +20%, max sale price −10%

**교육 포인트**  
competitive strategy

**토론 질문**  
margin vs share?

---

### EVT-047 | 경쟁사 M&A — 시장 집중

**배경**  
consolidation.

**영향 변수**  
marketDemandIndex −5%, pricing power narrative for leaders

**교육 포인트**  
market structure

**토론 질문**  
follow price leader?

---

### EVT-048 | 경쟁사 기술 leap

**배경**  
competitor launches superior product.

**영향 변수**  
marketDemandIndex −12% unless CAPEX invested

**교육 포인트**  
innovation race

**토론 질문**  
catch-up CAPEX in Step2?

---

### EVT-049 | 경쟁사 파산 — share available

**배경**  
competitor exit.

**영향 변수**  
marketDemandIndex +15% for agile teams

**교육 포인트**  
opportunity from distress

**토론 질문**  
capacity to capture?

---

# Category: 정부 정책

---

### EVT-050 | 법인세 인상

**배경**  
fiscal consolidation.

**영향 변수**  
corporateTaxRate +5%p

**교육 포인트**  
Step7 tax line

**토론 질문**  
pre-tax vs after-tax decision?

---

### EVT-051 | 제조업 보조금

**배경**  
industrial policy subsidy.

**영향 변수**  
land/machine −10% cost cap (1 period), demand +5%

**교육 포인트**  
industrial policy

**토론 질문**  
accelerate Step2?

---

### EVT-052 | 최저임금·노동법 강화

**배경**  
labor cost up.

**영향 변수**  
payroll multiplier ×1.15 (settlement)

**교육 포인트**  
Step3 commitment

**토론 질문**  
automation vs hire?

---

### EVT-053 | 그린뉴딜 — infra boom

**배경**  
public infrastructure demand.

**영향 변수**  
marketDemandIndex +12%, rawMaterialIndex +8%, interestRateLoan −1%p

**Best** / **Normal** / **Worst**  
Best: +18% demand; Worst: inflation only

**교육 포인트**  
macro policy transmission

**토론 질문**  
align production mix?

---

## Library Index

| ID | Category | Title |
|----|----------|-------|
| EVT-001~004 | 환율 | … |
| EVT-005~008 | 금리 | … |
| EVT-009~012 | 원자재 | … |
| EVT-013~016 | 공급망 | … |
| EVT-017~019 | 전쟁 | … |
| EVT-020~023 | 관세 | … |
| EVT-024~026 | 탄소세 | … |
| EVT-027~030 | ESG | … |
| EVT-031~034 | AI | … |
| EVT-035~038 | 기술혈신 | … |
| EVT-039~042 | 자연재해 | … |
| EVT-043~045 | 팬데믹 | … |
| EVT-046~049 | 경쟁사 | … |
| EVT-050~053 | 정부 정책 | … |

**Total: 53 events**

## Scenario Pack (GM 추천 — D-04 tagged)

| Pack | Events | recommendedPeriod | avoidPeriod |
|------|--------|-------------------|-------------|
| Year1 Intro | EVT-006, EVT-011, EVT-051 | Y1H2 | disaster, severity>2 |
| Year2 Trade | EVT-001, EVT-020, EVT-013 | Y2H1, Y2H2 | — |
| Year3 Complex | EVT-031, EVT-024, EVT-043, EVT-046 | Y3H1, Y3H2 | — |
| **Y1H1 safe** | *(none)* | — | all severity>3 blocked |

See: `06-learning-design-spec.md` Year arc
