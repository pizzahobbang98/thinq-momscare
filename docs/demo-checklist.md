# ThinQ Mom 시연 체크리스트

발표 **당일·직전**에 확인하는 실무 체크리스트입니다.  
상세 대본은 [demo-script.md](./demo-script.md)를 참고하세요.

---

## 1. 시연 전 준비

### 환경 · 인프라

- [ ] 로컬 또는 배포 서버 실행 확인 (`npm run dev` 또는 Vercel 배포 URL)
- [ ] `.env.local` / Vercel 환경변수 확인
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_DEMO_WIFE_ID`
  - [ ] `OPENAI_API_KEY`
  - [ ] ThinQ PAT 관련 키 (공기청정기)
  - [ ] ElevenLabs (TTS, 선택)
- [ ] Supabase 프로젝트 **일시정지 아님** 확인
- [ ] OpenAI API 키 유효 · 잔량 확인
- [ ] Whisper/STT (`/api/voice`) 동작 확인
- [ ] TTS (`/api/tts`, 브리핑) 동작 확인 (실패 시 텍스트 fallback 가능)
- [ ] ThinQ **공기청정기** 발표장 Wi-Fi 연결 · ThinQ 앱에서 기기 ONLINE 확인
- [ ] 3D 시뮬레이션 페이지(별도 팀) 연결 · `thinq-mom-demo-scene-change` 이벤트 수신 확인

### 브라우저 · 기기

- [ ] 시연용 브라우저 **마이크 권한** 허용 (또는 텍스트/칩 대체 준비)
- [ ] 모바일 뷰 **375px** (iPhone 13 mini 기준) 레이아웃 확인
- [ ] `/hub`, `/wife`, `/husband` 각각 접속 확인
- [ ] 온보딩 완료 상태 · 임신 주차 · 태명 설정 확인
- [ ] 3기기 동시 접속 테스트 (Hub / wife / husband)

### 데이터 · 데모 시드

- [ ] 온보딩 또는 setup API로 **데모 seed** 반영 여부 확인 (7일 mode_runs 등)
- [ ] Supabase `mode_runs` 최근 데이터 존재 확인 (wife/husband 카드 fallback용)

---

## 2. Hub 확인

### 초기 화면 (패널 닫힘)

- [ ] `/hub` — **ThinQ ON 이미지만** 중앙 표시
- [ ] 텍스트 · 버튼 · 발화 예시 · 로그 **없음**
- [ ] 이미지 탭 시 bottom sheet / 패널 **열림**

### 패널 내부

- [ ] 마이크 버튼 표시
- [ ] 텍스트 입력 · **텍스트로 실행** 버튼
- [ ] 시연용 발화 예시 (입덧 / 수면 / 휴양지 × 3문장)
- [ ] 실행 결과 카드 · 3D scene 상태 · 시연 체크리스트 (접기 가능)

---

## 3. 입덧모드 테스트

**발화:** `나 지금 입덧이 너무 심해`

- [ ] Hub 패널에서 칩 또는 텍스트로 실행
- [ ] 결과: **NAUSEA_MODE** / UI **입덧모드**
- [ ] 공기청정기 **actual action** 결과 표시 (성공 또는 “실제 기기 연결 확인 필요”)
- [ ] DevTools → `localStorage.getItem('thinq-mom-demo-scene')` === **`NAUSEA_SCENE`**
- [ ] CustomEvent `thinq-mom-demo-scene-change` 발생 확인 (3D 팀 연동 시)
- [ ] `/wife` → 오늘의 케어 카드 업데이트
- [ ] `/husband` → 오늘의 추천 (담백한 메뉴 등 **행동 제안**)

**예비 발화 (동일 모드 확인):**

- [ ] “음식 냄새 때문에 아무것도 못 먹겠어”
- [ ] “속이 계속 울렁거려”
- [ ] “밥 냄새가 역겨워”

---

## 4. 수면모드 테스트

**발화:** `나 이제 잘 준비 할래`

- [ ] 결과: **SLEEP_MODE** / UI **수면모드**
- [ ] 공기청정기 수면 관련 actual action
- [ ] `localStorage` **`SLEEP_SCENE`**
- [ ] `/wife` 케어 카드 · `/husband` “조용한 환경” 제안

**예비 발화:**

- [ ] “요즘 잠을 제대로 못 자”
- [ ] “너무 피곤해서 눕고 싶어”
- [ ] “몸이 천근만근이야”

---

## 5. 휴양지모드 테스트

**발화:** `바다 보면서 쉬고 싶어`

- [ ] 결과: **TRAVEL_MODE** / UI **휴양지모드**
- [ ] `localStorage` **`RESORT_SCENE`**
- [ ] `/wife` · `/husband` 휴양·기분 전환 관련 문구

**예비 발화:**

- [ ] “여행 가고 싶다, 너무 답답해”
- [ ] “호텔에서 휴가 보내는 기분 내고 싶어”
- [ ] “발리 가고 싶다”

---

## 6. 아내 화면 확인

- [ ] `/wife` **홈** 탭
- [ ] 임신 주차 · 태명 표시
- [ ] **오늘의 케어** 카드 — 최신 Hub 실행 반영
- [ ] `wife_card` 없을 때 `reply` / mode fallback 문구
- [ ] Realtime 또는 30초 polling으로 갱신 (실패 시 새로고침)
- [ ] mode_runs 조회 실패 시에도 **“아직 오늘 실행된 케어가 없어요.”** 등 fallback

---

## 7. 남편 화면 확인

- [ ] `/husband` **홈** 탭
- [ ] **오늘의 추천** — `husband_card` 또는 mode fallback
- [ ] 아내 **증상·세부 발화 직접 노출 없음**
- [ ] 입덧 / 수면 / 휴양지 각각 행동 중심 문구 확인
- [ ] Realtime · polling · fallback 동작

---

## 8. 초음파 갤러리 확인

- [ ] `/wife` → 초음파 갤러리 카드
- [ ] 이미지 업로드 (데모용 파일 준비)
- [ ] 임신 주차 · 과일 비유 · 감성 메시지 표시
- [ ] **의료 진단 아님** 안내 가능
- [ ] TTS 실패 시 텍스트 메시지 fallback

---

## 9. AI 자동 다이어리 확인

- [ ] `/wife` → AI 자동 다이어리 카드
- [ ] **생성** 버튼 → 최근 7일 맥락 반영
- [ ] `mode_runs` · 케어 기록이 다이어리에 반영
- [ ] API/Supabase 실패 시 로컬 fallback 카피 표시

---

## 10. 실패 시 대체 플랜

각 상황별 **발표 멘트**와 **대체 조작**을 미리 숙지합니다.

### 마이크 실패

**멘트:**

> “시연장 음성 환경이 불안정할 수 있어, 동일한 발화를 **텍스트**로 실행해보겠습니다.”

**대체:**

- Hub 패널 → **시연용 발화 칩** 클릭  
- 또는 텍스트 입력 → **텍스트로 실행**

---

### 공기청정기 연결 실패

**멘트:**

> “실제 기기 연결 상태는 별도 확인이 필요하지만, 서비스 흐름상 **어떤 케어가 실행되는지**는 동일하게 확인할 수 있습니다.”

**대체:**

- 결과 카드의 **“실제 기기 연결 확인 필요”** 표시를 그대로 설명
- mock/planned 기기 · 3D scene · wife/husband 업데이트는 계속 시연

---

### 3D 시뮬레이션 미연결

**멘트:**

> “현재 Hub에서는 **scene 값**이 전달되고 있으며, 3D 화면은 이 값을 받아 장면을 전환하는 구조입니다.”

**대체:**

- DevTools → `localStorage['thinq-mom-demo-scene']` 값 화면 공유
- Hub 패널 **3D 장면 연동 상태** 접기 섹션 확인

---

### Supabase 저장 실패

**멘트:**

> “저장 연결이 지연되어도 **실행 결과는 화면에서** 확인할 수 있고, 연결이 복구되면 기록 기반 화면에 반영되는 구조입니다.”

**대체:**

- Hub 결과 카드 · wife/husband **mode fallback** 카피로 설명
- 패널 “기록 저장은 지연됐지만…” 안내 카드 활용

---

### OpenAI / GPT 지연

**멘트:**

> “AI 응답이 지연될 경우를 대비해 **키워드 기반 fallback**으로 동일한 케어 흐름을 확인할 수 있습니다.”

**대체:**

- 시연용 **고정 예시 문장** 사용 (입덧 / 수면 / 휴양지 칩)
- UNKNOWN 나오면 다른 예시 문장으로 재시도

---

### 초음파 / TTS 실패

**멘트:**

> “음성 생성이 실패해도 **성장 기록**과 **아기 메시지**는 텍스트로 저장됩니다.”

**대체:**

- 갤러리 카드의 텍스트·과일 비유만으로 시연
- 다이어리는 생성 실패 시 seed/fallback 카피 설명

---

## 11. 발표 직전 최종 5분 체크

- [ ] Hub 첫 화면 → 이미지만 (텍스트 없음)
- [ ] 입덧모드 1회 실행 → NAUSEA_SCENE
- [ ] `/wife` 케어 카드 1 glance
- [ ] `/husband` 추천 1 glance
- [ ] 마이크 또는 텍스트 대체 경로 1회 리허설
- [ ] Vercel / Supabase / ThinQ 앱 상태 최종 확인

---

## 12. localStorage 키 참고 (3D 연동)

| Key | 설명 |
|-----|------|
| `thinq-mom-demo-scene` | NAUSEA_SCENE / SLEEP_SCENE / RESORT_SCENE |
| `thinq-mom-demo-mode` | NAUSEA_MODE / SLEEP_MODE / TRAVEL_MODE |
| `thinq-mom-demo-mode-label` | 입덧모드 / 수면모드 / 휴양지모드 |
| `thinq-mom-demo-simulation-text` | 장면 설명 문구 |
| `thinq-mom-demo-updated-at` | ISO 타임스탬프 |

**CustomEvent:** `thinq-mom-demo-scene-change` (detail에 mode, sceneName 등)

**scene 변경 없음:** AIR_ON, AIR_OFF, MORNING_BRIEFING, UNKNOWN

---

*문서 버전: STEP 7 — ThinQ Mom 발표 리허설용*
