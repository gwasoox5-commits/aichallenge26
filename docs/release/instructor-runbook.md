# BSP 강사 운영 런북 (Instructor Runbook)

> **대상**: GM(강사) · **버전**: V1 GA P8  
> **목표**: 3년 6반기(42 Step) 교육을 하루 수업 안에서 운영

---

## 1. 수업 시작 (Class Start)

1. Admin으로 `/gm` 접속 → 로그인 (`bsp-admin-dev` 또는 운영 비밀번호)
2. **세션 생성** 또는 **데모 세션 불러오기**
3. Join Code를 학생에게 공유 (화면 또는 슬라이드)
4. **경제 환경** 탭에서 반기 초기 프리셋 확인 (기본: 중립)
5. **일시정지 해제** 상태 확인 → `▶ 진행 중`

**체크**: Realtime Indicator가 `연결됨`인지 확인

---

## 2. 학생 참가 (Join)

1. 학생은 `/join` 접속
2. Join Code 입력 → **세션 확인**
3. 팀 이름 입력 → **게임 참가**
4. **Play 화면으로 이동** 클릭

**GM 확인**: 팀 관리 테이블에 팀이 나타나는지, 제출률 분모가 증가하는지

---

## 3. 팀 구성 (Team Formation)

- V1: Join 시 자동으로 1팀 = 1 CEO 계정
- 팀당 3~5명이면 **1명 CEO + 나머지 관찰·토론** 권장
- 팀 이름 중복 시 Join API 오류 → 다른 이름 사용

---

## 4. Step 진행 (Step Progress)

### GM 루프 (매 Step)

```
CEO 입력 대기 → 제출률 확인 → (미제출 처리) → 다음 Step
```

1. **CEO Command Dashboard**에서 학생이 "지금 해야 할 일"을 확인하도록 안내
2. Step 제한 시간 내 CEO **검증 → 제출**
3. GM **운영 요약** 패널에서 제출률 확인
4. 미제출 팀: **Zero Submit** 또는 **강제제출** (사유 입력 필수)
5. **▶ 다음 Step** (권장 조작 버튼 또는 조작 그룹)
6. **감사 로그**에서 Step 진행 기록 확인

### Step 1 (자금) 특이사항

- 1A(연초 차입·예금) + 1B(연중 차입·상환) — **한 번에 제출**
- GM은 Step 1 완료 후 한 번만 advance

### Step 7 (결산)

- CEO는 입력 불가 — GM만 **반기 종료 (결산)** 실행

---

## 5. 일시정지 (Pause)

- 토론·휴식 시 **⏸ Pause** → CEO 제출 차단
- 재개: **▶ Resume**
- Pause/Resume은 **감사 로그**에 기록됨

---

## 6. 경제 환경 변경 (Economy Change)

1. **경제 제어** 탭 이동
2. 슬라이더 또는 프리셋(호황/침체 등) 선택
3. 적용 시점 선택: 즉시 / 다음 Step / 다음 반기
4. CEO 화면 **경제 환경**·**최근 변화**에 반영 (Realtime)

**수업 팁**: Year 2부터 환율·원자재 이벤트 본격 도입

---

## 7. 이벤트 (Events)

1. **이벤트 제어** 탭
2. 프리셋 이벤트 발동 또는 예약
3. CEO **활성 이벤트** 패널에서 영향 설명 확인
4. 이벤트 종료 시 **End Event**

---

## 8. 토론 질문 (Discussion)

| 시점 | GM 질문 예시 |
|------|-------------|
| Step 1 후 | "차입을 늘리면 ROE와 리스크 중 무엇이 바뀌나?" |
| Step 4 후 | "원자재 가격 상승을 구매 결정에 어떻게 반영했나?" |
| Step 6 후 | "매출과 현금, 어느 쪽이 더 중요한가?" |
| 반기 결산 후 | "P/L 한 줄로 이번 반기를 설명해 보세요" |

---

## 9. 반기 결산 (Settlement)

1. Step 6까지 모든 팀 제출 → **다음 Step**으로 Step 7 진입
2. **반기 종료 (결산)** 실행
3. CEO 재무제표·Journal Locked 확인
4. **순위** 발표 + 토론 (5분)

---

## 10. 다음 반기 / 게임 종료

- P1~P5: **다음 반기 시작**
- P6 결산 후: **게임 종료**
- Final Report·발표 (팀당 5분)

---

## 11. 디브리핑 (Debrief)

1. 최종 순위 (동기 부여용 — 학습 평가와 분리 안내)
2. 팀별 전략·이벤트 대응 회고
3. Excel Rule Book과 숫자 대조 (선택)
4. **감사 로그** export/스크린샷으로 운영 기록 보관

---

## 12. 문제 해결 (일반)

| 증상 | 조치 |
|------|------|
| CEO 제출 불가 | Step 잠금 / Pause / 이미 제출 / Step 불일치 |
| Realtime 끊김 | 새로고침 · 서버 `npm run dev` (`tsx server.ts`) 확인 |
| 미제출 1팀 | Zero Submit → 다음 Step |
| 잘못 advance | Reopen Step (주의: 결정 삭제) |

---

## 12-A. 장애 복구 (Disaster Recovery)

> **상세 절차**: [`p7-production-readiness.md` §10 Disaster Recovery Guide](./p7-production-readiness.md#10-disaster-recovery-guide)

| 상황 | 강사 1차 조치 | 상세 문서 |
|------|---------------|-----------|
| **DB 재시작 / 데이터 손상** | 수업 일시 중단 → Pause → 운영팀 연락 | P7 §10.1 · Backup/Restore |
| **서버 재시작** | `npm run dev` 재실행 → GM/CEO 새로고침 | P7 §10.2 |
| **WebSocket 끊김** | Realtime Indicator 확인 → 새로고침 (자동 재연결) | P7 §10.3 · P6 review |
| **중복 Submit** | Audit Log에서 DECISION_SUBMIT 중복 확인 → GM 문의 | P7 §10.4 |
| **결산(Settlement) 중 장애** | **반기 종료 재실행 금지** → Audit + DB 상태 확인 후 운영팀 | P7 §10.5 |
| **Event 적용 중 장애** | Event History 확인 → 미적용 시 GM 재발동 | P7 §10.6 |

### 백업·복구 (운영팀)

```bash
# 백업 (수업 전후)
npm run bsp:backup
# → backups/bsp-backup-<timestamp>.sql

# 복구 (staging / 장애 후)
npm run bsp:restore -- backups/bsp-backup-YYYY-MM-DD.sql
```

**강사는 복구 명령을 직접 실행하지 않습니다.** Pause → 학생 안내 → 운영팀에 세션 ID·Join Code 전달.

---

## 13. 하루 3년 6반기 현실적 일정 (참고)

| 구간 | 시간 | 내용 |
|------|------|------|
| 오전 | 3h | Year 1 (P1~P2) + 규칙 익히기 |
| 오후 1 | 3h | Year 2 (P3~P4) |
| 오후 2 | 2h | Year 3 (P5~P6) + 디브리핑 |

**42 Step × ~8분 ≈ 5.6h** (토론·휴식 제외) — **하루 전체 8h**면 가능하나 빠듯함.  
Pilot 권장: **1년 2반기(14 Step)** 또는 **2일 과정**.
