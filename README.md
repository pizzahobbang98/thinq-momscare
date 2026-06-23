# ThinQ Mom

ThinQ Mom은 임신준비중 또는 임신중인 사용자와 배우자가 모바일 앱, AI Hub 음성, 3D 시뮬레이터, StandbyMe 화면을 통해 집 안 케어 루틴을 실행하는 Vercel 시연 MVP입니다.

이 문서는 2026-06-23 현재 코드 기준으로 실제 시연에서 사용하는 기능만 정리합니다. 카드에 표시만 되는 확장 예정 가전은 `Mock` 또는 `확장 예정`으로 구분합니다.

## 실제 시연 URL

| 화면 | URL | 역할 |
| --- | --- | --- |
| 모바일 앱 | `/` | 온보딩, 홈, 기록, HUB 음성, 수동제어, 설정 |
| 3D 시뮬레이터 | `/simulation-3d/index.html` | "하이 마더" wake word 이후 음성 케어 실행과 3D 공간 연출 |
| StandbyMe 화면 | `/standby-display` | 공유 상태를 받아 모드별 대기/영상 화면 표시 |
| AI Hub 패널 | `/hub` | 데스크톱형 Hub 실행/검증 패널 |

로컬 확인 URL은 각각 `http://localhost:3000/`, `http://localhost:3000/simulation-3d/index.html`, `http://localhost:3000/standby-display`입니다.

## 주요 기능

- 온보딩: 임신준비중/임신중, 아내/남편, 임신 시작일 또는 주차, 아기 이름 입력
- 모바일 탭: 홈, 기록, HUB, 수동제어, 설정
- 홈: 오늘의 컨디션, 주차/일정, 케어 제안, 기기 상태 요약
- 기록: 오늘 케어/대화 기반 AI 다이어리, 다이어리 캘린더, 초음파 사진 분석, 주차별 성장 갤러리
- HUB 음성: 모바일 하단 HUB 버튼 길게 누르기 또는 3D wake word로 실행
- 수동제어: 케어 모드 버튼, 공기청정기 ON/OFF, 거실 조명 ON/OFF
- 공유 상태 동기화: 모바일, HUB, 3D, StandbyMe가 `/api/demo-state`와 Supabase/localStorage 보조 동기화로 같은 상태를 사용
- 실제 기기 제어: LG ThinQ 공기청정기, Philips Hue/Bluetooth 전구

## 케어 모드

### 임신준비중

| 모드 | 대표 발화 | 조명 대표색 |
| --- | --- | --- |
| 컨디션 밸런스 | 오늘 컨디션이 별로야. | `#FF8A00` |
| 수면 리듬 | 오늘은 푹 자고 싶어. | `#003CFF` |
| 마음 환기 | 집에만 있으니까 너무 답답해. | `#FFCC00` |
| 휴식 준비 | 너무 지친다. | `#FF4E42` |
| 둘의 저녁 | 예쁜 곳에서 저녁 먹고 싶어. | `#C4004B` |

### 임신중

| 모드 | 대표 발화 | 조명 대표색 |
| --- | --- | --- |
| 입덧 케어 | 냄새 때문에 너무 힘들어. | `#00B8FF` |
| 수면 케어 | 왜 이렇게 잠이 안들지. | `#5B1FFF` |
| 가사 케어 | 몸이 너무 무거워. | `#A6FF00` |
| 바다 휴양 | 시원한 바다 보고 싶어. | `#00C2A8` |
| 숲 휴양 | 조용한 숲에 가고 싶어. | `#007A2A` |
| 도시 휴양 | 도시 야경 보고 싶어. | `#A100FF` |

## 실제/Mock/확장 예정 구분

| 영역 | 상태 | 설명 |
| --- | --- | --- |
| LG ThinQ 공기청정기 | 실제 연동 | PAT API로 전원, 자동, 터보, 수면 모드 제어 |
| Philips Hue/Bluetooth 전구 | 실제 연동 | Vercel API -> ngrok -> 로컬 FastAPI 또는 브라우저 Web Bluetooth 경로 |
| 3D 공간/기기 카드 | 시연 연출 | 공유 상태 기반으로 화면과 카드 상태를 동기화 |
| 냉장고/로봇청소기/워시타워/TV/스피커 등 | Mock 또는 확장 예정 | 카드 표현과 로그 중심, 실제 제어는 연결하지 않음 |
| AI 다이어리/초음파 분석 | 실제 API 흐름 | OpenAI와 로컬/시연 데이터 fallback을 함께 사용 |

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 앱 | Next.js 16 App Router, React 19, TypeScript |
| 스타일 | Tailwind CSS 4, CSS Modules |
| AI | OpenAI STT/텍스트 모델/TTS, ElevenLabs TTS fallback |
| 상태/저장 | Supabase, localStorage, BroadcastChannel |
| 실제 기기 | LG ThinQ PAT API, Philips Hue Bridge/Bluetooth, 로컬 FastAPI |
| 배포 | Vercel, ngrok |

## 환경변수

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_WIFE_ID=
NEXT_PUBLIC_DEMO_HUSBAND_ID=

# OpenAI / TTS
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# LG ThinQ
THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=thinq-momscare-client-001
THINQ_MOCK_FALLBACK=true

# Hue Bridge 또는 로컬 전구 중계
HUE_ENABLED=false
HUE_BRIDGE_HOST=
HUE_APPLICATION_KEY=
HUE_LIGHT_IDS=
HUE_LOCAL_ENABLED=true
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
MOTHER_HUE_CONTROL_URL=
```

로컬 FastAPI 서버는 `mother-hue-control/` 아래에서 실행하며, 서버 환경의 `MOTHER_TOGETHER_API_KEY`는 Next/Vercel의 `MOTHER_HUE_CONTROL_API_KEY`와 같은 값으로 맞춥니다.

## 로컬 실행

```bash
npm install
npm run dev
```

전구 시연이 필요하면 별도 터미널에서 실행합니다.

```powershell
cd "C:\Users\Jaehwan Kang\Desktop\thinq-momscare\thinq-momscare-codex\mother-hue-control"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

ngrok:

```powershell
cd C:\ngrok
.\ngrok.exe http 8000
```

## 프로젝트 구조

```text
app/
  page.tsx                         # 모바일 앱 진입
  hub/page.tsx                     # AI Hub 패널
  standby-display/page.tsx          # StandbyMe 시연 화면
  api/
    demo-state/route.ts             # 공유 상태 동기화
    simulation-3d/voice-intent/     # 3D/모바일 공통 의도 분석
    mother-together/execute/        # Hub 케어 실행
    thinq/state, thinq/control      # 공기청정기 상태/제어
    light/[action]                  # 로컬 전구 중계
    diary/generate                  # AI 다이어리
    ultrasound/analyze              # 초음파 분석

components/
  mobile/MobileUserHome.tsx         # 모바일 앱 전체 탭
  home-demo/SmartHomeDashboard.tsx  # 수동제어 기기 카드
  ultrasound/                       # 초음파 업로드/갤러리
  diary/                            # 다이어리 캘린더/미리보기

lib/
  shared-demo-state.ts              # 공유 상태 모델
  hue-presets.ts                    # 모드별 조명 팔레트
  light-control.ts                  # 케어 결과와 조명 매핑
  thinq.ts                          # LG ThinQ PAT API
  mode-execution-log.ts             # 시연 모드 실행 로그 정규화

public/simulation-3d/
  index.html                        # 3D 시뮬레이터 정적 앱

mother-hue-control/
  app/main.py                       # 로컬 Hue/Bluetooth FastAPI 서버
```

## 문서

- `docs/overview.md`: 현재 시연 범위와 구조
- `docs/demo-flow.md`: 발표/시연 순서
- `docs/voice-commands.md`: 음성 명령 범위와 테스트 문구
- `docs/manual-control.md`: 모바일 수동제어 탭
- `docs/device-control.md`: 실제 기기 제어 구조
- `docs/simulation-3d.md`: 3D 시뮬레이터 동작
- `docs/deployment-vercel-ngrok.md`: Vercel/ngrok 배포 체크
- `docs/create-mode-execution-logs.sql`: Supabase 모드 실행 로그 테이블

## 시연 체크리스트

- Vercel 배포 주소에서 `/`, `/simulation-3d/index.html`, `/standby-display` 접근 확인
- 모바일/3D 브라우저 마이크 권한 허용
- OpenAI API key, Supabase key, ThinQ 환경변수 확인
- 전구 시연 시 FastAPI와 ngrok 실행, Vercel `NEXT_PUBLIC_HUE_API_BASE_URL` 최신화
- 임신준비중 5개 모드와 임신중 6개 모드 실행 확인
- 공기청정기 ON/OFF, 전구 ON/OFF 확인
- 기본 모드 복귀 시 모바일 카드, 3D, StandbyMe, 조명이 함께 초기화되는지 확인
