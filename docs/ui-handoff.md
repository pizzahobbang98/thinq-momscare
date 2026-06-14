# ThinQ Mom UI 개발자 인수인계 문서

## 1. 프로젝트 개요

ThinQ Mom은 임신을 준비하거나 임신중인 사용자와 배우자가 집 안에서 편안하게 생활할 수 있도록 AI 허브, LG ThinQ 공기청정기, 화면과 조명 연출을 연결하는 홈케어 서비스입니다.

현재 프로젝트는 **최종 시연용 MVP**입니다. 핵심은 기능을 더 늘리는 것이 아니라 아래 세 화면을 열어두고 상태와 케어 실행 결과가 자연스럽게 이어지는 모습을 보여주는 것입니다.

1. 핸드폰의 모바일 사용자 화면
2. 음성을 받는 허브 화면
3. 집 안 환경 변화를 보여주는 3D 홈 시뮬레이터

### 핵심 시연 흐름

```text
모바일에서 상태·역할·임신 주차 선택
        ↓
허브가 선택 내용을 읽고 사용자의 말을 해석
        ↓
공기청정기 명령 + 3D 장면 변경 + 음성 답변
        ↓
모바일 홈·디바이스 탭에 실행 결과 반영
        ↓
허브 대화와 실행 로그를 AI 다이어리로 정리
```

새 창을 계속 만드는 방식이 아닙니다. 모바일, 허브, 3D 화면을 각각 한 번 열고 **기존 창의 내용만 변경**하는 것이 현재 시연 기준입니다.

## 2. 최종 시연 화면 구조

| 화면 | 접근 URL | 주요 사용자 | 핵심 파일 |
| --- | --- | --- | --- |
| 모바일 사용자 화면 | `/` | 아내 또는 남편 | `app/page.tsx`, `components/mobile/MobileUserHome.tsx` |
| AI 허브 | `/hub` | 집 안에서 허브에 말하는 사용자 | `app/hub/page.tsx`, `app/hub/hub-page.tsx` |
| 3D 홈 시뮬레이터 | `/simulation-3d/index.html` | 시연 관람자 | `public/simulation-3d/index.html` |

모바일 화면은 현재 **홈 / 디바이스 2탭만 유지**합니다. 케어 탭과 메뉴 탭은 제거된 상태이며 현재 시연에서는 다시 만들지 않습니다.

`/wife`, `/husband`, `/onboarding`, `/select` 라우트도 저장소에 남아 있지만 최종 3화면 시연의 기본 화면은 아닙니다. 해당 파일을 수정하기 전에 실제 시연 범위인지 먼저 확인해야 합니다.

## 3. 화면별 안내

### 3.1 모바일 사용자 화면

#### 화면 목적

모바일은 전체 시연의 기준 화면입니다. 사용자가 임신 상태와 역할을 선택하고, 현재 케어 흐름과 AI 다이어리를 확인하며, 디바이스 탭에서 집 안 기기 표현을 확인합니다.

#### 접근 URL

- 로컬: `http://localhost:3000/`
- 배포: `https://배포주소/`

#### 주요 사용자

- 임신 준비중인 아내
- 임신 준비중인 남편
- 임신중인 아내
- 임신중인 남편

#### 주요 UI 구성

- 상단 상태 선택: `임신 준비중 / 임신중`
- 역할 선택: `아내 / 남편`
- 임신중일 때 선택한 임신 주차
- 현재 상태·역할 요약 카드
- 오늘의 케어 흐름
- 임신중 아내 전용 아기 성장 기록 요약
- 준비 기록 또는 AI 다이어리 카드
- 다이어리 캘린더
- 초음파 성장 갤러리
- 하단 `홈 / 디바이스` 2탭

#### 관련 파일

- `app/page.tsx`: `/` 진입점
- `components/mobile/MobileUserHome.tsx`: 모바일 전체 화면, 상태 선택, 홈 탭, 다이어리, 초음파 UI
- `components/mobile/DeviceStatusDashboard.tsx`: 디바이스 탭
- `components/diary/DiaryCalendarModal.tsx`: 다이어리 캘린더
- `components/ultrasound/UltrasoundUploadModal.tsx`: 초음파 업로드
- `components/ultrasound/PregnancyFruitImage.tsx`: 주차별 과일 비교 이미지
- `lib/pregnancy-calendar.ts`: 다이어리·검사·준비 캘린더 이벤트
- `lib/ultrasound-demo.ts`, `lib/ultrasound-storage.ts`: 초음파 시연 기록과 저장

#### UI 수정 시 주의사항

- `MobileUserHome.tsx`는 UI와 공유 상태 로직이 한 파일에 같이 있습니다.
- 카드 JSX와 Tailwind class를 바꾸는 것은 가능하지만 `updateState`, `refreshState`, 상태 변경 함수는 수정하지 않는 것이 안전합니다.
- 홈의 허브·3D 링크는 상대경로를 유지해야 합니다.
- 임신중 아내에게만 보이는 성장 기록 조건을 제거하면 다른 상태·역할 화면에 임신 콘텐츠가 섞일 수 있습니다.

### 3.2 허브 화면

#### 화면 목적

허브는 사용자의 음성 또는 텍스트를 받아 현재 상태와 역할에 맞는 케어를 선택하고, 음성으로 답변하면서 3D 화면과 실제 공기청정기를 변경합니다.

#### 접근 URL

- 로컬: `http://localhost:3000/hub`
- 배포: `https://배포주소/hub`

#### 주요 사용자

모바일에서 선택된 현재 사용자입니다. 허브 화면 자체가 별도의 역할을 선택하는 것이 아니라 `/api/demo-state`의 상태와 역할을 1초마다 읽습니다.

#### 주요 UI 구성

- 최소 허브 랜딩 화면
- 길게 눌러 말하는 음성 버튼
- 음성 인식·실행·답변 상태 표시
- 상태·역할별 예시 발화
- 모드 선택 카드와 실행 결과
- 공기청정기 연결 상태
- 최근 허브 대화 및 실행 로그
- 상세 허브 패널 또는 바텀시트

#### 관련 파일

- `app/hub/page.tsx`: `/hub` 진입점
- `app/hub/hub-page.tsx`: 허브 화면과 실행 흐름
- `app/api/voice/route.ts`: OpenAI 음성 인식
- `app/api/mother-together/execute/route.ts`: AI 모드 분류, 기기 실행, 로그 저장, TTS 생성
- `app/api/briefing/morning/route.ts`: “좋은 아침이야” 상태·역할·주차별 응답
- `lib/voice-intent.ts`: 허브의 빠른 케어 의도 해석
- `lib/ai-mode-router.ts`: 임신중 모드 키워드와 OpenAI fallback 분류
- `lib/preparation-intent.ts`: 임신 준비중 전용 의도 분류
- `lib/hub-demo-utterances.ts`: 시연용 예시 발화
- `lib/hub-simulation-dispatch.ts`: 열린 3D 화면 즉시 반영 보조
- `lib/hub-thinq-dispatch.ts`: 허브 모드와 ThinQ 명령 연결
- `lib/mode-actions.ts`: 실제·mock·planned 기기 액션 정의
- `lib/care-log-storage.ts`: 허브 로그의 로컬 저장과 Supabase 동기화
- `lib/demo-console.ts`: 보조 시연 URL과 상태 제어 유틸리티

#### UI 수정 시 주의사항

- `hub-page.tsx`는 화면과 음성·상태·기기 연동 코드가 함께 있는 큰 파일입니다.
- JSX 문구와 class를 수정할 때 인접한 `onPointerDown`, `onPointerUp`, `onPointerCancel`을 제거하지 마세요.
- 길게 누르는 동안의 진동과 녹음 종료 로직은 버튼 이벤트에 연결되어 있습니다.
- 발화 예시 문구를 바꾸면 `lib/hub-demo-utterances.ts`의 `hubMode`, `routineId`, `simulationMode`가 문장 의미와 일치하는지 확인해야 합니다.

### 3.3 3D 홈 시뮬레이터

#### 화면 목적

3D 화면은 허브가 실행한 케어를 집 안 환경 변화로 보여줍니다. 공기청정기, 스탠바이미 화면, 조명과 공간 분위기가 모드에 따라 바뀝니다.

#### 접근 URL

- 로컬: `http://localhost:3000/simulation-3d/index.html`
- 배포: `https://배포주소/simulation-3d/index.html`

#### 동작 구조

- `public/simulation-3d/index.html`은 Next.js `public` 정적 파일입니다.
- 2초마다 `/api/demo-state`를 읽습니다.
- URL query parameter만으로 장면을 정하지 않습니다.
- 모바일과 허브가 저장한 공유 상태를 우선 읽고 이미 열린 창의 장면만 변경합니다.
- `localStorage`와 `BroadcastChannel`은 같은 브라우저에서 즉시 반영하기 위한 보조 수단입니다.

#### 상태에 따른 변화

- 임신 준비중: 컨디션 밸런스, 수면 리듬, 마음 환기, 휴식 준비, 둘의 저녁
- 임신중: 입덧, 수면, 가사, 바다·숲·도시 휴양지
- 역할: 아내·남편에 따라 상태 뱃지와 설명 접두 문구가 달라집니다.
- 케어 모드: 장면, 화면 콘텐츠, 공기청정기 표시, 조명 표현이 달라집니다.

#### 관련 파일과 자산

- `public/simulation-3d/index.html`: 장면 데이터, 공유 상태 polling, 캡션, bridge 로직
- `public/simulation-3d/assets/index-CnB7Ca9h.js`: 생성된 3D React 번들
- `public/simulation-3d/assets/index-CWBYKDoy.css`: 생성된 3D 스타일 번들
- `public/images/standby-mom/`: 임신 준비중 스탠바이미 이미지
- `lib/simulation-routine-bridge.ts`: 허브 모드와 3D routine ID 연결
- `lib/simulation-mode-map.ts`: query mode와 허브 모드 연결
- `lib/simulation-broadcast.ts`: 같은 브라우저 BroadcastChannel 메시지
- `lib/simulation-test-mode-sync.ts`: 시연 모드 snapshot과 localStorage 키

#### UI 수정 시 주의사항

- `index.html`의 `ROUTINE_SCENES`, `PREPARATION_SCENES`, `MODE_SCENES` 안에 UI 문구와 연동 키가 함께 있습니다.
- `mainCaption`, `subCaption`, 색상, gradient 등은 비교적 안전한 UI 영역입니다.
- `routineId`, `screenContent`, `purifier`, `light`, scene key는 연동 값이므로 임의로 바꾸지 마세요.
- `assets/index-CnB7Ca9h.js`는 압축된 생성물입니다. 직접 손으로 수정하면 재생성 시 사라지거나 bridge allowlist와 어긋날 수 있습니다.
- 새 3D 창을 열도록 바꾸지 마세요. 기존 창에서 장면만 변경되어야 합니다.

## 4. 모바일 화면 구조

### 홈 탭

`components/mobile/MobileUserHome.tsx`가 담당합니다.

#### 상태 선택

- `preparing`: 임신 준비중
- `pregnant`: 임신중

`changePregnancyStatus`가 `/api/demo-state`를 업데이트하며 이전 케어 상태를 초기화합니다.

#### 역할 선택

- `wife`: 아내
- `husband`: 남편

`changeRole`도 이전 케어 상태를 초기화해 다른 역할의 실행 결과가 섞이지 않도록 합니다.

#### 현재 상태·역할 요약

상태와 역할에 따라 안내 문구가 달라집니다. 임신중이면 선택 주차도 표시됩니다.

#### 케어 흐름 요약

현재 고정 표시는 다음과 같습니다.

1. 선택한 상태·역할
2. 허브에 말하기
3. 3D 기기 반영

실행 상태는 `careState`를 사용해 대기 중, 전환 중, 적용 완료로 표시합니다.

#### AI 다이어리 카드

- 임신 준비중: `준비 기록`
- 임신중: `AI 다이어리`
- 임신중 아내는 다이어리에 사용할 임신 주차를 선택할 수 있습니다.
- 확대 버튼으로 다이어리·검사·준비 이벤트 캘린더를 봅니다.

### 디바이스 탭

`components/mobile/DeviceStatusDashboard.tsx`가 담당합니다.

표시 기기:

- 공기청정기
- 스탠바이미
- 거실 조명

디바이스 탭은 `/api/demo-state`에서 받은 `currentRoutine`, `simulationRoutine`, `preparationMode`, `careState`를 시각적 표현으로 바꿉니다.

중요: 이 화면의 공기청정기 카드 값은 공유 케어 모드에 맞춘 **시연 표현**입니다. 실제 ThinQ 기기 상태를 직접 polling하는 화면은 아닙니다. 실제 제어 결과는 허브 실행과 Supabase 기기 로그에서 관리됩니다.

### UI 담당자가 수정해도 되는 영역

- 카드 제목과 설명 문구
- 여백, 색상, 그림자, radius
- 아이콘과 카드 배치
- 상태별 안내 문구
- 디바이스 카드의 시각적 표현
- 모바일 최대 너비와 반응형 class

### 주의해야 할 영역

- `updateState`, `refreshState`
- `changePregnancyStatus`, `changeRole`, `changePregnancyWeek`
- `/api/demo-state`의 GET/PATCH 호출
- `POLL_INTERVAL_MS = 2500`
- `careState`, `currentRoutine`, `simulationRoutine`, `preparationMode`
- 다이어리의 상태·역할·주차 필터
- 3D 연결 URL과 routine 값

## 5. 허브 화면 구조

### 모바일 상태 반영

`app/hub/hub-page.tsx`는 `/api/demo-state`를 1초마다 읽어 모바일에서 선택한 상태, 역할, 임신 주차를 반영합니다.

### 상태·역할별 음성 처리

1. 사용자가 버튼을 누르고 말합니다.
2. `/api/voice`가 음성을 한국어 텍스트로 변환합니다.
3. 임신 준비중이면 `resolvePreparationIntent`를 사용합니다.
4. 임신중이면 `resolveHubCareIntent`와 `/api/mother-together/execute`를 사용합니다.
5. “좋은 아침이야”는 `/api/briefing/morning`으로 분기됩니다.
6. 현재 역할에 맞는 문장을 음성으로 재생합니다.

### 케어 실행

- 3D: `dispatchSimulationImmediately`
- 실제 공기청정기: `triggerImmediateThinQControl`
- 서버 실행과 로그: `/api/mother-together/execute`
- 공유 상태: `/api/demo-state`
- 기록: Supabase `mode_runs`, `device_events`, `messages`

3D와 실제 공기청정기 명령은 가능한 한 같은 시점에 시작되도록 구성되어 있습니다.

### 허브 대화와 다이어리

허브 입력 원문, 선택된 모드, 역할별 카드, 기기 실행 결과가 `mode_runs`에 저장됩니다. AI 다이어리는 최근 7일 중 현재 상태와 역할에 맞는 허브 로그를 골라 사용합니다.

### UI 담당자가 수정해도 되는 영역

- 허브 화면 제목·설명
- 버튼과 카드 스타일
- 상태 뱃지 디자인
- 대화·실행 로그 표시 UI
- 예시 발화의 표시 순서와 시각적 그룹

### 주의해야 할 영역

- 음성 녹음 pointer event
- 진동 시작·종료 함수
- `processVoiceAudio`, `executeNaturalLanguage`
- 상태·역할별 분기
- `resolvePreparationIntent`, `resolveHubCareIntent`
- `/api/demo-state` 업데이트
- `dispatchSimulationImmediately`
- `triggerImmediateThinQControl`
- `hubMode`, `routineId`, `simulationModeSlug`, `travelDestination`

## 6. 상태·역할·케어 연동 구조

### 실제 데이터 흐름

```text
[모바일 /]
pregnancyStatus / role / pregnancyWeek 선택
        |
        | PATCH /api/demo-state
        v
[Supabase mode_runs]
source=demo_state, mode=DEMO_STATE 스냅샷
        |
        +------------------------+-------------------------+
        |                        |                         |
        v                        v                         v
[허브 /hub]                [3D index.html]          [모바일 /]
1초 polling                2초 polling              2.5초 polling
        |
        | 음성·텍스트 입력
        v
상태·역할별 케어 의도 결정
        |
        +--> 3D routine 즉시 전달
        +--> ThinQ 공기청정기 명령
        +--> 음성 응답
        +--> /api/demo-state PATCH
        +--> mode_runs / device_events 로그 저장
        |
        v
세 화면이 다음 polling에서 같은 케어 결과 표시
        |
        v
모바일의 오늘 기록 만들기
        |
        v
/api/diary/generate가 허브 대화·모드·기기·성장 기록 종합
```

### 요청 용어와 실제 코드 필드

| 개념 | 실제 저장 위치 또는 필드 |
| --- | --- |
| 상태 | `pregnancyStatus` |
| 역할 | `role` |
| 선택 임신 주차 | `pregnancyWeek` |
| 임신중 careMode | `currentRoutine` |
| 임신 준비중 careMode | `preparationMode` |
| 3D routineId | `simulationRoutine` 또는 API 응답의 `routineId` |
| 기기 상태 표현 | 모바일 `DeviceStatusDashboard`가 routine으로 계산 |
| 실제 기기 실행 결과 | `mode_runs.device_results`, `device_events` |
| 허브 대화 로그 | `mode_runs.input_text`, `reply`, 역할별 card |
| AI 다이어리 | `diary_entries`, 공유 상태의 `diaryEntries` |

`/api/demo-state`는 최신 케어 로그를 현재 상태·역할과 대조해서 읽습니다. 상태·역할 표식은 `mode_runs.signals`의 `상태:...`, `역할:...` 값으로 구분됩니다.

## 7. 상태별·역할별 시연 흐름

### 7.1 임신준비중 아내

- 홈 톤: 본인의 컨디션과 마음을 천천히 살피는 준비 기록
- 허브 발화 예시: “수면 리듬을 맞춰줘.”, “마음을 환기하고 싶어.”
- 케어 모드: 컨디션 밸런스, 수면 리듬, 마음 환기, 휴식 준비, 둘의 저녁
- 3D 변화: 준비 전용 화면·공기·조명 장면
- 디바이스 탭: 준비 모드에 맞는 공기청정기, 스탠바이미, 조명 표현
- AI 다이어리: 조급함을 낮추고 몸과 마음, 생활 리듬을 준비한 1인칭 기록

### 7.2 임신준비중 남편

- 홈 톤: 배우자와 함께 생활 리듬을 맞추고 배려하는 안내
- 허브 발화 예시: “우리 둘의 저녁을 준비해줘.”, “아내가 편하게 쉬게 해줘.”
- 케어 모드: 아내와 같은 5개 준비 모드, 역할에 따라 답변과 기록 관점이 달라짐
- 3D 변화: 준비 전용 장면에 남편 역할 뱃지·설명 반영
- 디바이스 탭: 선택된 준비 모드의 동일한 집 안 환경 표현
- AI 다이어리: 서로의 컨디션을 묻고 함께 준비한 남편 관점의 기록

### 7.3 임신중 아내

- 홈 톤: 몸 상태, 아기 성장, 선택 임신 주차 중심
- 허브 발화 예시: “음식 냄새 때문에 속이 울렁거려.”, “잠이 잘 오게 해줘.”
- 케어 모드: 입덧, 수면, 가사, 바다·숲·도시 휴양지, 공기청정기 켜기·끄기
- 3D 변화: 주방 공기, 수면, 가사, 휴양지 장면과 조명 변화
- 디바이스 탭: 터보·수면·자동 모드와 스탠바이미·조명 표현
- AI 다이어리: 아내 1인칭으로 몸의 신호, 케어, 아기 성장 기록을 자연스럽게 정리

### 7.4 임신중 남편

- 홈 톤: 배우자의 컨디션과 실행된 케어를 살피는 안내
- 허브 발화 예시: “아내가 편하게 잘 수 있게 해줘.”, “빨래와 청소를 도와줘.”
- 케어 모드: 임신중 4대 케어 모드와 직접 공기 제어
- 3D 변화: 같은 케어 장면에 남편 역할 설명 반영
- 디바이스 탭: 배우자를 위해 적용된 집 안 환경 표시
- AI 다이어리: 남편이 임신 증상을 직접 겪은 것처럼 쓰지 않고 배우자를 살피고 먼저 움직인 기록

“좋은 아침이야”는 네 케이스에서 모두 동작합니다. 임신중에는 선택한 주차를 포함하고, 역할에 따라 아내용 마음가짐과 남편용 행동 제안이 달라집니다.

## 8. AI 다이어리 구현 구조

### 사용자 흐름

1. 모바일 홈에서 `오늘 기록 만들기` 버튼을 누릅니다.
2. `MobileUserHome.tsx`가 현재 상태·역할·임신 주차를 `/api/diary/generate`로 보냅니다.
3. API가 최근 7일 데이터를 조회합니다.
4. 현재 상태·역할과 일치하는 허브 로그만 선택합니다.
5. OpenAI가 다이어리를 생성합니다.
6. 실패하면 상태·역할별 fallback 다이어리를 생성합니다.
7. 가능하면 `diary_entries`에 저장하고 `/api/demo-state`를 통해 모바일 목록에 반영합니다.

### 사용하는 데이터

- 현재 상태: 준비중 또는 임신중
- 현재 역할: 아내 또는 남편
- 선택 임신 주차와 태명
- 허브 대화: `mode_runs.input_text`
- 실행 모드와 역할별 응답: `mode_runs`
- 기기 로그: `mode_runs.device_results`, `device_events`
- 증상: `symptom_logs`
- 기분: `moods`
- 임신중 성장 기록: `ultrasound_records`

### 상태·역할별 작성 방식

- 임신 준비중: 임신을 이미 했다고 단정하지 않고 몸과 마음, 부부 생활 리듬 중심
- 임신중 아내: 본인의 몸 상태와 아기 성장, 케어를 1인칭으로 기록
- 임신중 남편: 배우자를 살피고 함께 준비한 남편 1인칭 기록

### 관련 파일

- `components/mobile/MobileUserHome.tsx`: 현재 `/`의 다이어리 카드와 생성 버튼
- `components/diary/DiaryCalendarModal.tsx`: 현재 `/`에서 직접 사용하는 캘린더
- `components/diary/DiaryPreviewModal.tsx`
- `components/diary/AIDiaryCard.tsx`
- `app/api/diary/generate/route.ts`
- `lib/diary.ts`
- `lib/diary-types.ts`
- `lib/diary-demo.ts`
- `lib/preparing-diary-demo.ts`

`AIDiaryCard.tsx`와 `DiaryPreviewModal.tsx`는 저장소에 남아 있고 기존 `/wife` 상세 화면에서 사용됩니다. 현재 최종 시연의 `/` 화면은 `MobileUserHome.tsx` 안의 다이어리 카드와 `DiaryCalendarModal.tsx`를 사용하므로, 두 구성을 같은 화면으로 오해하지 않도록 주의하세요.

### UI 담당자가 수정해도 되는 영역

- 다이어리 카드와 캘린더 디자인
- 버튼 문구
- 로딩 문구
- 미리보기 줄 수와 상세 모달 배치
- 상태별 안내 문구

### 주의해야 할 영역

- `generateDiary` 요청 body
- 상태·역할·주차별 다이어리 필터
- `DIARY_SYSTEM_PROMPT`
- `PREPARING_DIARY_SYSTEM_PROMPT`
- `PREGNANT_HUSBAND_DIARY_SYSTEM_PROMPT`
- OpenAI 모델 호출
- Supabase 조회 테이블과 저장 로직
- `source_summary`의 상태·역할 정보

## 9. 환경변수 및 외부 연동

### 필수: 최종 3화면 시연

| 환경변수 | 기능 | 누락 시 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 공유 상태, 로그, 다이어리, 초음파 저장 | 화면 fallback은 열리지만 기기 간 동기화 불가 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 브라우저·서버 접근 | 위와 동일 |
| `NEXT_PUBLIC_DEMO_WIFE_ID` | 아내 기준 데이터 조회·저장 | 아내 데이터와 성장 기록 연결 제한 |
| `NEXT_PUBLIC_DEMO_HUSBAND_ID` | 남편 기준 데이터 연결 | 남편 상세 데이터 연결 제한 |
| `OPENAI_API_KEY` | 음성 인식, AI 모드, 다이어리, 초음파 분석 | 키워드·문구 fallback 또는 기능 제한 |
| `THINQ_PAT_TOKEN` | 실제 LG ThinQ API 인증 | 실제 공기청정기 제어 불가 |
| `THINQ_DEVICE_ID` | 제어할 공기청정기 지정 | 실제 공기청정기 제어 불가 |
| `THINQ_CLIENT_ID` | ThinQ 요청 client ID | 기본값은 있으나 실제 연동 배포에서는 명시 권장 |
| `THINQ_MOCK_FALLBACK` | 실제 기기 실패 시 mock 허용 | 미설정 기본값은 활성화, 시연에서는 `true` 명시 권장 |

### OpenAI 모델 변수

| 환경변수 | 기본값 | 용도 |
| --- | --- | --- |
| `OPENAI_TEXT_MODEL` | `gpt-5.5` | 자연어 모드, 다이어리, 분석 |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | 허브 음성 인식 |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | 아가야·초음파 관련 OpenAI 음성 |

코드 기본값이 있어 실행 자체에는 선택 항목에 가깝지만, 같은 결과를 재현하려면 Vercel에 명시하는 것을 권장합니다.

### 선택 연동

| 환경변수 | 기능 | 필수 여부 |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | 허브 음성 합성 | 선택, 없으면 음성 재생 제한 |
| `ELEVENLABS_VOICE_ID` | ElevenLabs 목소리 지정 | 선택, API key와 함께 필요 |
| `HUGGINGFACE_API_TOKEN` | 초음파 장면 분류 | 선택, 없으면 일반 장면 fallback |
| `HUGGINGFACE_ULTRASOUND_MODEL` | 초음파 분류 모델 변경 | 선택, 코드 기본 모델 존재 |
| `CRON_SECRET` | `/api/cron/daily-care` 인증 | 선택, 예약 케어카드를 쓸 때 필요 |

각 변수가 실제 Vercel 프로젝트의 Production 환경에 등록되었는지는 배포 담당자 확인이 필요합니다.

## 10. UI 수정 가이드

### 문구만 바꾸고 싶을 때

- 모바일 홈: `components/mobile/MobileUserHome.tsx`
- 디바이스 카드: `components/mobile/DeviceStatusDashboard.tsx`
- 허브 예시 문구: `lib/hub-demo-utterances.ts`
- 임신 준비중 허브 답변: `lib/preparation-intent.ts`
- 임신중 기본 답변: `lib/ai-mode-router.ts`
- 아침 안내: `app/api/briefing/morning/route.ts`
- 3D 캡션: `public/simulation-3d/index.html`

문구가 모드 의미를 바꾸는 경우에는 단순 UI 수정이 아닙니다. 발화 문구와 연결된 mode/routine을 함께 확인해야 합니다.

### 모바일 홈 화면을 수정할 때

- `components/mobile/MobileUserHome.tsx`
- 공통 색상·폰트: `app/globals.css`
- 앱 metadata: `app/layout.tsx`, `app/manifest.ts`

### 디바이스 탭을 수정할 때

- `components/mobile/DeviceStatusDashboard.tsx`
- 준비 상태 이미지: `public/images/standby-mom/`

`PREPARATION_PRESENTATIONS`, `PREGNANT_PRESENTATIONS`의 key는 바꾸지 않고 표시 값만 수정하는 것이 안전합니다.

### 허브 화면을 수정할 때

- `app/hub/hub-page.tsx`
- 예시 발화 카드: `lib/hub-demo-utterances.ts`

큰 JSX 파일이므로 UI 영역을 찾은 뒤 이벤트와 실행 함수 호출을 그대로 유지하세요.

### 3D 문구와 배경을 수정할 때

- `public/simulation-3d/index.html`
- 준비 화면 이미지: `public/images/standby-mom/`
- 생성된 스타일 확인: `public/simulation-3d/assets/index-CWBYKDoy.css`

가능하면 `index.html`의 scene 객체 문구·색상만 수정하고 압축 JS 번들은 직접 수정하지 마세요.

### 이미지 asset 교체

- `public` 아래 파일은 URL에서 `public`을 제외합니다.
- 예: `public/images/example.png` → `/images/example.png`
- 3D HTML의 `./assets/...`는 `/simulation-3d/index.html` 기준 상대경로입니다.
- 파일명을 바꾸면 모든 참조를 함께 수정해야 합니다.
- 과일 스프라이트는 4×4 위치 계산을 사용하므로 이미지 셀 순서를 바꾸면 주차별 과일이 어긋납니다.
- 초음파 시연 이미지는 `public/demo/ultrasound/`에 있습니다.

### 모바일 반응형 확인

1. 브라우저 개발자 도구에서 360px, 390px, 430px 너비를 확인합니다.
2. 하단 홈·디바이스 탭이 항상 보이는지 확인합니다.
3. iPhone safe area에서 상·하단 여백이 겹치지 않는지 확인합니다.
4. 긴 한국어 문구가 카드 밖으로 넘치지 않는지 확인합니다.
5. 확대 모달에서 내부 스크롤과 닫기 버튼을 확인합니다.

## 11. 절대 조심해야 할 것

- 모바일은 홈 / 디바이스 2탭 구조입니다. 케어 탭과 메뉴 탭을 임의로 복구하지 마세요.
- 상태·역할 변경 시 새 창을 띄우지 마세요.
- 3D 시뮬레이터는 이미 열린 창에서 장면만 변경되어야 합니다.
- `routineId`, care mode, scene key를 임의로 바꾸지 마세요.
- `/api/demo-state` GET/PATCH와 polling 로직을 UI 수정 과정에서 제거하지 마세요.
- `localStorage`만 보고 서로 다른 기기 간 연동이 된다고 판단하지 마세요.
- 기기 간 기준 상태는 Supabase를 사용하는 `/api/demo-state`입니다.
- public asset의 절대경로와 3D 폴더 기준 상대경로를 혼동하지 마세요.
- `mode_runs.signals`의 상태·역할 표식을 제거하면 다른 사용자 기록이 섞일 수 있습니다.
- 모바일 디바이스 카드는 공유 케어 상태의 시각화이며 실제 기기 상태 API 자체가 아닙니다.
- Vercel 배포 전에 환경변수와 Supabase RLS 정책을 확인하세요.
- 생성된 3D JS bundle을 직접 수정할 때는 원본·재생성 경로를 먼저 확인하세요.

## 12. 로컬 실행 및 확인 방법

```bash
npm install
npm run dev
```

로컬 확인 URL:

- 모바일: [http://localhost:3000/](http://localhost:3000/)
- 허브: [http://localhost:3000/hub](http://localhost:3000/hub)
- 3D: [http://localhost:3000/simulation-3d/index.html](http://localhost:3000/simulation-3d/index.html)

검증:

```bash
npm run lint
npm run build
```

`npm run dev`는 계속 실행되는 개발 서버입니다. 배포 전 최종 검증은 종료되는 명령인 lint와 build를 사용합니다.

### 로컬 확인 순서

1. 세 URL을 각각 한 번 엽니다.
2. 모바일에서 상태와 역할을 바꿉니다.
3. 허브와 3D가 각각 1초, 2초 안팎으로 바뀌는지 확인합니다.
4. 허브에서 예시 문장을 실행합니다.
5. 실제 공기청정기, 3D, 모바일 디바이스 탭을 확인합니다.
6. 모바일 홈에서 다이어리를 생성합니다.
7. 상태·역할·주차에 맞는 내용인지 확인합니다.

## 13. Vercel 배포 후 확인 방법

배포 후에는 localhost가 아니라 같은 Vercel 배포 주소를 사용합니다.

- 핸드폰: `https://배포주소/`
- 노트북 A: `https://배포주소/hub`
- 노트북 B: `https://배포주소/simulation-3d/index.html`

확인 사항:

1. 세 기기가 모두 같은 배포 도메인을 사용하는지 확인합니다.
2. 모바일 상태 변경이 허브와 3D에 전달되는지 확인합니다.
3. 새 창이 생기지 않고 기존 화면이 바뀌는지 확인합니다.
4. 실제 ThinQ 공기청정기와 mock fallback 여부를 확인합니다.
5. Supabase RLS가 `mode_runs`, `device_events`, `diary_entries` 등의 읽기·쓰기를 허용하는지 확인합니다.
6. 새 배포를 만들 때 `NEXT_PUBLIC_*` 값은 빌드 시점에 반영된다는 점을 기억합니다.

자세한 배포 체크리스트는 `docs/vercel-demo-deployment.md`를 참고하세요.

## 14. 빠른 파일 찾기

| 하고 싶은 작업 | 먼저 볼 파일 |
| --- | --- |
| 모바일 카드 디자인 변경 | `components/mobile/MobileUserHome.tsx` |
| 디바이스 표현 변경 | `components/mobile/DeviceStatusDashboard.tsx` |
| 허브 버튼·카드 디자인 변경 | `app/hub/hub-page.tsx` |
| 허브 예시 문장 변경 | `lib/hub-demo-utterances.ts` |
| 준비 상태 문구 변경 | `lib/preparation-intent.ts` |
| 임신중 모드 문구 변경 | `lib/ai-mode-router.ts` |
| 3D 캡션·색감 변경 | `public/simulation-3d/index.html` |
| 현재 `/`의 다이어리 카드 변경 | `components/mobile/MobileUserHome.tsx` |
| 현재 `/`의 다이어리 캘린더 변경 | `components/diary/DiaryCalendarModal.tsx` |
| 기존 `/wife` 다이어리 UI 확인 | `components/diary/AIDiaryCard.tsx`, `components/diary/DiaryPreviewModal.tsx` |
| 다이어리 생성 규칙 확인 | `app/api/diary/generate/route.ts`, `lib/diary.ts` |
| 상태·역할 필드 확인 | `lib/shared-demo-state.ts` |
| 세 화면 공유 API 확인 | `app/api/demo-state/route.ts` |
| ThinQ 모드 연결 확인 | `lib/hub-thinq-dispatch.ts`, `lib/mode-actions.ts`, `lib/thinq.ts` |
| 3D routine 연결 확인 | `lib/simulation-routine-bridge.ts` |

---

문서 기준일: 2026-06-14
