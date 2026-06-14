# ThinQ Mom

LG ThinQ 스마트홈 기기와 AI를 연결해 임신 준비중 또는 임신중인 사용자와 배우자의 생활 케어를 돕는 최종 시연용 MVP입니다.

현재 시연은 모바일, AI 허브, 3D 홈 시뮬레이터를 각각 한 번 열어두고 모바일에서 선택한 상태와 역할, 허브에서 실행한 케어를 세 화면에 동기화하는 흐름을 중심으로 구성되어 있습니다.

## 현재 시연 화면

| 화면 | URL | 역할 |
| --- | --- | --- |
| 모바일 사용자 화면 | `/` | 상태·역할·임신 주차 선택, 홈 요약, AI 다이어리, 디바이스 상태 확인 |
| AI 허브 | `/hub` | 음성·텍스트 입력 해석, 케어 모드 실행, 음성 응답, ThinQ·3D 연동 |
| 3D 홈 시뮬레이터 | `/simulation-3d/index.html` | 공유 상태와 케어 모드에 맞춰 기존 창의 장면·화면·조명·기기 표현 변경 |

모바일 하단 탭은 **홈 / 디바이스 2개만 사용**합니다. 이전의 케어 탭과 메뉴 탭은 현재 시연 범위에서 제거되어 있습니다.

`/wife`, `/husband`, `/onboarding`, `/select` 라우트는 기존 상세 기능과 보조 흐름을 위해 남아 있지만, 최종 3화면 시연의 기본 진입점은 아닙니다.

## 핵심 시연 흐름

```text
모바일 /
  상태: 임신 준비중 / 임신중
  역할: 아내 / 남편
  임신중일 때 임신 주차 선택
        |
        v
PATCH /api/demo-state
        |
        +--> 허브 /hub: 1초 polling
        |
        +--> 3D /simulation-3d/index.html: 2초 polling
        |
        +--> 모바일 / 디바이스 탭: 2.5초 polling

허브 음성 또는 텍스트 입력
        |
        +--> 상태·역할별 의도 해석
        +--> 3D routine 실행
        +--> 실제 ThinQ 공기청정기 명령
        +--> mode_runs / device_events 로그 저장
        +--> 음성 응답
        |
        v
모바일 홈·디바이스·AI 다이어리에 반영
```

기기 간 공유 상태의 기준은 Supabase를 사용하는 `/api/demo-state`입니다. `localStorage`와 `BroadcastChannel`은 같은 브라우저에서 빠르게 반영하거나 API 장애 시 화면을 유지하기 위한 보조 수단입니다.

## 상태와 역할

공유 타입과 기본값은 [`lib/shared-demo-state.ts`](./lib/shared-demo-state.ts)에 있습니다.

주요 값:

- `pregnancyStatus`: `preparing` 또는 `pregnant`
- `role`: `wife` 또는 `husband`
- `pregnancyWeek`: 1~42주
- `preparationMode`: 임신 준비중 홈 루틴
- `currentRoutine`: 허브에서 실행된 케어 모드
- `simulationRoutine`: 3D 시뮬레이터 routine ID
- `careState`: `idle`, `processing`, `completed`
- `diaryEntries`: 상태·역할·주차별 다이어리 목록

공유 상태 API는 [`app/api/demo-state/route.ts`](./app/api/demo-state/route.ts)이며 Supabase `mode_runs`에 `source=demo_state`, `mode=DEMO_STATE` 스냅샷을 저장합니다.

## 케어 모드

### 임신 준비중

| 준비 모드 | 대표 발화 |
| --- | --- |
| `condition` | 아침 컨디션을 맞춰줘. |
| `sleep-rhythm` | 수면 리듬을 맞춰줘. |
| `refresh` | 마음을 환기하고 싶어. |
| `rest-ready` | 편안하게 쉬고 싶어. |
| `couple-routine` | 우리 둘의 저녁을 준비해줘. |

관련 로직: [`lib/preparation-intent.ts`](./lib/preparation-intent.ts)

### 임신중

| 허브 모드 | 3D routine | 실제 공기청정기 |
| --- | --- | --- |
| `NAUSEA_MODE` | `nausea_food` | 터보 |
| `SLEEP_MODE` | `sleep_care` | 수면 |
| `HOUSEWORK_MODE` | `housework_care` | 자동 |
| `TRAVEL_MODE` | `destination_ocean`, `destination_forest`, `destination_city` | 자동 |
| `AIR_ON` / `AIR_OFF` | 별도 장면 없음 | 전원 켜기 / 끄기 |

아침 안내 호출어는 상태·역할 공통으로 **“좋은 아침이야”**입니다. 임신중에는 모바일에서 선택한 임신 주차를 반영해 아내와 남편에게 서로 다른 행동 제안을 응답합니다.

## AI 다이어리

모바일 홈에서 오늘 기록 만들기를 누르면 `/api/diary/generate`가 다음 데이터를 종합합니다.

- 현재 임신 상태, 역할, 선택한 임신 주차
- 최근 7일 허브 대화와 실행 모드 (`mode_runs`)
- 기기 실행 로그 (`device_events`, `mode_runs.device_results`)
- 증상·기분 기록
- 임신중일 때 초음파 성장 기록

임신 준비중은 몸과 마음, 생활 리듬을 준비하는 기록으로 작성됩니다. 임신중 아내는 본인의 하루 관점, 임신중 남편은 배우자를 살피고 함께 준비한 관점으로 작성됩니다. OpenAI 또는 Supabase 연결이 없으면 코드의 시연용 fallback 다이어리를 사용합니다.

주요 파일:

- [`app/api/diary/generate/route.ts`](./app/api/diary/generate/route.ts)
- [`lib/diary.ts`](./lib/diary.ts)
- [`components/mobile/MobileUserHome.tsx`](./components/mobile/MobileUserHome.tsx)
- [`components/diary/DiaryCalendarModal.tsx`](./components/diary/DiaryCalendarModal.tsx)

## 기술 스택

| 영역 | 현재 구현 |
| --- | --- |
| 웹 프레임워크 | Next.js 16.2.7 App Router |
| UI | React 19.2.4, TypeScript, Tailwind CSS 4 |
| 공유 데이터 | Supabase PostgreSQL, Realtime, Storage |
| AI 텍스트 | OpenAI API, 기본 `gpt-5.5` |
| 음성 인식 | OpenAI `gpt-4o-mini-transcribe` |
| OpenAI 음성 | OpenAI `gpt-4o-mini-tts` |
| 허브 음성 합성 | ElevenLabs `eleven_multilingual_v2` |
| 초음파 장면 분류 | Hugging Face Inference API, 미설정 시 fallback |
| 실제 기기 제어 | LG ThinQ PAT API |
| 배포 | Vercel, Vercel Cron |
| 앱 설치 메타데이터 | Web App Manifest |

## 주요 파일

```text
app/
├── page.tsx                         # 모바일 / 진입점
├── hub/
│   ├── page.tsx                    # /hub 진입점
│   └── hub-page.tsx                # 허브 UI와 음성·케어 실행
└── api/
    ├── demo-state/route.ts          # 3화면 공유 상태
    ├── mother-together/execute/     # AI 모드 해석·기기 실행·로그 저장
    ├── diary/generate/route.ts      # 상태·역할별 AI 다이어리
    ├── thinq/                       # 실제 공기청정기 상태·제어
    ├── voice/route.ts               # 음성 인식
    ├── tts/route.ts                 # 허브 TTS
    └── ultrasound/analyze/route.ts  # 초음파 성장 기록

components/
├── mobile/
│   ├── MobileUserHome.tsx           # 모바일 홈 / 디바이스 2탭
│   └── DeviceStatusDashboard.tsx    # 공기청정기·스탠바이미·조명 표현
├── diary/                           # 다이어리 카드·캘린더·상세
└── ultrasound/                      # 초음파 업로드·갤러리·과일 비교

lib/
├── shared-demo-state.ts             # 공유 상태 타입
├── ai-mode-router.ts                # 임신중 자연어 모드 분류
├── preparation-intent.ts            # 임신 준비중 의도 분류
├── voice-intent.ts                  # 허브 빠른 의도 해석
├── mode-actions.ts                  # 케어 모드별 기기 액션
├── thinq.ts                         # LG ThinQ PAT API
├── simulation-routine-bridge.ts     # 허브 모드와 3D routine 연결
├── hub-simulation-dispatch.ts       # 열린 3D 화면 즉시 반영 보조
└── diary.ts                         # 다이어리 프롬프트와 fallback

public/simulation-3d/
├── index.html                       # 3D 공유 상태 bridge와 장면 UI
└── assets/                          # 생성된 3D JS/CSS 번들
```

## 환경변수

```bash
# Supabase: 3기기 공유 상태와 데이터 저장
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_WIFE_ID=
NEXT_PUBLIC_DEMO_HUSBAND_ID=

# OpenAI
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts

# LG ThinQ PAT API
THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=thinq-momscare-client-001
THINQ_MOCK_FALLBACK=true

# 선택 연동
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
HUGGINGFACE_API_TOKEN=
HUGGINGFACE_ULTRASOUND_MODEL=
CRON_SECRET=
```

환경변수 누락 시 제한 기능과 Vercel 설정은 [Vercel 시연 배포 체크리스트](./docs/vercel-demo-deployment.md)를 참고하세요.

## 로컬 실행

```bash
npm install
npm run dev
```

확인 URL:

- 모바일: [http://localhost:3000/](http://localhost:3000/)
- 허브: [http://localhost:3000/hub](http://localhost:3000/hub)
- 3D: [http://localhost:3000/simulation-3d/index.html](http://localhost:3000/simulation-3d/index.html)

검증:

```bash
npm run lint
npm run build
```

## Vercel 배포

배포 후에는 세 화면 모두 같은 Vercel 도메인을 사용합니다.

- `thinq-momscare.vercel.app`
- `thinq-momscare-git-main-pizzahobbang98s-projects.vercel.app`
- `thinq-momscare-kbvti1cfr-pizzahobbang98s-projects.vercel.app`

Vercel 프로젝트의 Root Directory는 이 저장소로 지정하고, Production 환경변수와 Supabase RLS 정책을 확인해야 합니다.

## 문서

- [UI 개발자 인수인계 문서](./docs/ui-handoff.md)
- [Vercel 시연 배포 체크리스트](./docs/vercel-demo-deployment.md)
- [서비스 개요](./docs/service-overview.md)
- [데이터베이스 관계 및 흐름](./docs/database-map.md)
- [시연 대본](./docs/demo-script.md)
- [시연 체크리스트](./docs/demo-checklist.md)

---

마지막 업데이트: 2026-06-14
