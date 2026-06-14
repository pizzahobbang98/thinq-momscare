# Vercel 시연 배포 체크리스트

## 고정 시연 화면

- 모바일: `/`
- 허브 노트북: `/hub`
- 3D 노트북: `/simulation-3d/index.html`

세 화면은 한 번만 열고 유지합니다. 상태나 역할이 바뀌어도 새 창을 만들지 않으며, `/api/demo-state` polling으로 기존 화면 내용만 갱신합니다.

`public/simulation-3d/index.html`은 Next.js `public` 정적 파일이므로 Vercel 배포 후에도 `/simulation-3d/index.html`에서 접근할 수 있습니다.

## 공유 상태 저장

- 기기 간 상태 기준: Supabase `mode_runs`
- 공유 상태 API: `/api/demo-state`
- 허브 대화 및 기기 실행 로그: Supabase `mode_runs`, `device_events`
- AI 다이어리: `mode_runs`, `device_events`, `ultrasound_records`, `moods`, `symptom_logs`, `diary_entries`
- `localStorage`와 `BroadcastChannel`: 같은 브라우저에서 빠르게 반영하기 위한 보조 수단

Vercel Serverless 인스턴스의 메모리는 요청 간 유지되지 않으므로 공유 상태를 전역 변수나 in-memory 객체에 저장하면 안 됩니다. 현재 시연 흐름은 Supabase를 영속 저장소로 사용합니다.

## Vercel 환경변수

필수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_WIFE_ID=
NEXT_PUBLIC_DEMO_HUSBAND_ID=

OPENAI_API_KEY=
OPENAI_TEXT_MODEL=
OPENAI_TRANSCRIPTION_MODEL=
OPENAI_TTS_MODEL=

THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=
THINQ_MOCK_FALLBACK=true
```

OpenAI 모델 변수는 코드 기본값이 있지만, 배포 결과를 고정하기 위해 Vercel에 명시적으로 등록합니다.

선택:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
HUGGINGFACE_API_TOKEN=
HUGGINGFACE_ULTRASOUND_MODEL=
CRON_SECRET=
```

Vercel Project Settings의 Development, Preview, Production 환경에 필요한 값을 각각 등록합니다. `NEXT_PUBLIC_*` 값은 브라우저 번들에 노출될 수 있으므로 서비스 역할 키나 관리자 키를 넣지 않습니다.

### 누락 시 제한 기능

| 환경변수 | 누락 시 영향 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 화면은 로컬 fallback으로 열리지만 기기 간 공유 상태, 실시간 로그, 다이어리·초음파 영속 저장이 동작하지 않습니다. `/api/demo-state`의 `PATCH`는 503을 반환합니다. |
| `NEXT_PUBLIC_DEMO_WIFE_ID`, `NEXT_PUBLIC_DEMO_HUSBAND_ID` | 해당 사용자 기준 조회·저장과 역할별 데이터 연결이 제한됩니다. |
| `OPENAI_API_KEY` | 음성 인식, AI 분석·다이어리 생성 등 OpenAI 기능이 fallback 문구 또는 오류 응답으로 전환됩니다. |
| `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_TTS_MODEL` | 누락 시 코드 기본 모델을 사용합니다. 배포 재현성을 위해 명시 등록을 권장합니다. |
| `THINQ_PAT_TOKEN`, `THINQ_DEVICE_ID` | 실제 공기청정기 조회·제어가 불가능하며 `THINQ_MOCK_FALLBACK=true`일 때 mock 결과를 사용합니다. |
| `THINQ_CLIENT_ID` | 코드 기본 client ID를 사용하지만 실제 연동 환경에서는 명시 등록을 권장합니다. |
| `THINQ_MOCK_FALLBACK` | 미설정 시 현재 코드 기본값은 활성화입니다. 시연 환경에서는 `true`를 명시합니다. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | 음성 합성이 제한되며 텍스트 응답과 나머지 케어 흐름은 유지됩니다. |
| `HUGGINGFACE_API_TOKEN`, `HUGGINGFACE_ULTRASOUND_MODEL` | 초음파 장면 분류가 로컬 fallback 결과로 전환됩니다. |
| `CRON_SECRET` | 예약 daily-care API 보호·호출이 제한됩니다. 핵심 3화면 시연에는 영향이 없습니다. |

## Vercel Serverless 확인

- `/api/demo-state`의 읽기·쓰기는 Supabase `mode_runs`의 `source=demo_state`, `mode=DEMO_STATE` 행을 사용합니다.
- Vercel 함수 메모리나 전역 객체에 공유 상태를 보관하지 않습니다.
- 모바일, 허브, 3D는 `/api/demo-state`를 각각 polling하며 API 응답을 기기 간 상태 기준으로 사용합니다.
- `localStorage`와 `BroadcastChannel`은 같은 브라우저 안에서만 빠르게 반영하거나 API 실패 시 화면을 유지하기 위한 보조 수단입니다.
- Supabase의 `mode_runs`, `device_events`, `diary_entries` 등 시연 테이블에 anon key로 필요한 `select`/`insert`/`upsert` 권한과 RLS 정책이 배포 전에 적용되어 있어야 합니다.

## Vercel 배포 후 시연 URL

- 핸드폰: `https://배포주소/`
- 노트북 A: `https://배포주소/hub`
- 노트북 B: `https://배포주소/simulation-3d/index.html`

세 화면은 동일한 Vercel 배포 주소를 사용하고 한 번만 열어둡니다.

## 배포 후 실제 테스트 시나리오

### A. 임신준비중 아내

1. 핸드폰에서 `임신준비중`과 `아내`를 선택합니다.
2. 허브와 3D가 같은 상태로 바뀌는지 확인합니다.
3. 허브에서 준비 상태용 수면 또는 휴식 문장을 말합니다.
4. 허브 음성 응답, 3D 준비 장면, 공기청정기 모드, 모바일 디바이스 탭이 같은 실행 결과를 표시하는지 확인합니다.

### B. 임신중 아내

1. 핸드폰에서 `임신중`, `아내`, 시연 임신 주차를 선택합니다.
2. 허브에 `좋은 아침이야`라고 말해 선택 주차가 반영된 안내가 나오는지 확인합니다.
3. 입덧·수면·가사·휴양지 문장 중 하나를 실행합니다.
4. 3D 장면, 실제 공기청정기, 모바일 홈·디바이스 탭과 AI 다이어리에 같은 상태·역할·주차가 반영되는지 확인합니다.

### C. 임신중 남편

1. 기존 창에서 역할만 `남편`으로 전환합니다.
2. 새 창이 열리지 않고 세 화면의 역할이 남편으로 갱신되는지 확인합니다.
3. `좋은 아침이야`와 케어 문장을 실행해 남편용 행동 제안과 기록이 표시되는지 확인합니다.
4. 아내용 과거 다이어리 문구가 남편 화면에 섞이지 않는지 확인합니다.

### D. 상태 전환 섞임 방지

1. `임신준비중 아내 → 임신중 아내 → 임신중 남편` 순서로 연속 전환합니다.
2. 각 전환 후 허브는 1초, 3D는 2초, 모바일 디바이스 탭은 2.5초 안팎으로 같은 상태가 되는지 확인합니다.
3. 이전 상태의 실행 모드, 역할 문구, 임신 주차, 다이어리 기록이 현재 화면에 섞이지 않는지 확인합니다.
4. 세 화면을 새로고침해도 마지막 Supabase 공유 상태로 복원되는지 확인합니다.

## 배포 전 확인

1. `npm run lint`
2. `npm run build`
3. 세 화면을 각각 열고 모바일에서 상태·역할 변경
4. 허브 음성 입력 후 3D와 디바이스 탭 갱신 확인
5. AI 다이어리에서 현재 상태·역할의 대화와 기기 로그만 사용되는지 확인
