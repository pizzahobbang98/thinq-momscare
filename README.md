# ThinQ Mom

ThinQ Mom은 임신준비중 또는 임신중인 사용자와 배우자의 생활 문장을 이해해 모바일 앱, 3D 홈 시뮬레이터, 실제 LG ThinQ 공기청정기, Philips Hue/Bluetooth 전구를 함께 제어하는 Vercel 시연용 MVP입니다.

현재 문서는 Vercel에 배포해서 실제 시연하는 흐름만 다룹니다. 구현되어 있어도 현재 시연에서 쓰지 않는 화면, 라우트, 버튼, 과거 모드명은 제외했습니다.

## 실제 시연 URL

| 화면 | URL | 용도 |
| --- | --- | --- |
| 메인 앱 | `/` | 모바일/웹 시연, 상태·역할 선택, 홈, 기록, 수동제어, 하단 HUB 음성 버튼 |
| 3D 시뮬레이터 | `/simulation-3d/index.html` | “하이 마더” wake word 이후 음성 명령, 모드별 3D 장면·조명·기기 상태 표현 |

로컬에서는 각각 `http://localhost:3000/`, `http://localhost:3000/simulation-3d/index.html`로 확인합니다. Vercel 배포 후에는 같은 배포 도메인의 두 경로를 사용합니다.

## 사용 기술 스택

| 영역 | 기술 |
| --- | --- |
| 웹 앱 | Next.js 16 App Router, React 19, TypeScript |
| 스타일 | Tailwind CSS 4, CSS Modules |
| 음성 | OpenAI STT / 의도 분석 / TTS 흐름 |
| 상태 동기화 | Next.js API, Supabase, localStorage/BroadcastChannel 보조 |
| 실제 공기청정기 | LG ThinQ PAT API |
| 실제 전구 | Vercel API -> ngrok -> 로컬 FastAPI -> Philips Hue/Bluetooth 전구 |
| 배포 | Vercel |

## 주요 기능

- 사용자 상태: `임신준비중`, `임신중`
- 사용자 역할: `아내`, `남편`
- 하단 탭 기반 모바일 UI: 홈, 기록, 수동제어 중심, 가운데 HUB 음성 버튼
- 메인 앱 하단 HUB 버튼을 길게 누르고 말하는 음성 실행
- 3D 시뮬레이터에서 “하이 마더” 이후 이어서 말하는 음성 실행
- 임신준비중 5개 모드, 임신중 6개 모드 실행
- 공기청정기 ON/OFF, 전구 ON/OFF, 기본 모드 복귀
- 좋은 아침이야, 시간/날짜, 생활 케어 질문, 안전/응급성 발화 안내
- 실제 공기청정기와 전구 상태를 앱 수동제어 카드와 동기화
- 모드 종료 후 기본 화면 복귀 시 카드와 기본 대기 조명을 함께 초기화

ThinQ Mom의 음성 기능은 자유형 만능 챗봇이 아니라, 임신 상태와 역할에 맞춘 케어 실행형 음성 인터페이스입니다.

## 음성 명령 범위

- 메인 앱: `/` 하단 가운데 HUB 버튼을 누르고 말합니다.
- 3D 시뮬레이터: `/simulation-3d/index.html`에서 “하이 마더”라고 말한 뒤 명령합니다.
- STT: 음성을 텍스트로 변환합니다.
- 의도 분석: 현재 상태, 역할, 임신 주차 문맥으로 케어 실행 여부를 판단합니다.
- 실행: 3D 장면, 실제 공기청정기, 실제 전구, 앱 공유 상태를 갱신합니다.
- TTS: 실행 결과를 음성으로 반환합니다.
- 3D는 특정 모드 실행 후 TTS/음성 반환이 끝난 기준으로 10초 동안 추가 발화가 없으면 기본 화면으로 돌아갑니다.

## 모드별 테스트 문구

### 임신준비중

| 모드 | 테스트 문구 | 조명 대표색 |
| --- | --- | --- |
| 컨디션 | 아침 컨디션을 맞춰줘. | `#FF8A00` |
| 수면리듬 | 잠을 잘 자게 도와줘. | `#003CFF` |
| 마음환기 | 기분을 바꾸고 싶어. | `#FFCC00` |
| 휴식준비 | 편하게 쉬고 싶어. | `#FF4E42` |
| 둘의저녁 | 우리 둘의 저녁을 준비해줘. | `#C4004B` |

### 임신중

| 모드 | 테스트 문구 | 조명 대표색 |
| --- | --- | --- |
| 입덧 모드 | 음식 냄새 때문에 속이 안 좋아. | `#00B8FF` |
| 수면 모드 | 잠이 잘 오게 해줘. | `#5B1FFF` |
| 가사 케어 | 빨래와 청소를 도와줘. | `#A6FF00` |
| 바다 모드 | 바다 분위기로 바꿔줘. | `#00C2A8` |
| 숲 모드 | 초록색 나무 보고 싶어. | `#007A2A` |
| 도시 모드 | 도시 야경을 보여줘. | `#A100FF` |

## 실제 기기 연동 구조

### LG ThinQ 공기청정기

- 실제 기기 ON/OFF를 지원합니다.
- 음성 명령과 수동제어 토글이 같은 제어 API를 사용합니다.
- 수동제어 화면의 공기청정기 상태와 실제 기기 상태를 동기화합니다.
- 모드 실행 시 입덧/수면/가사/휴양 장면에 맞는 운전 상태로 전환합니다.

### Philips Hue/Bluetooth 전구

- 실제 전구 ON/OFF를 지원합니다.
- 모드별 대표색을 실제 전구에 적용합니다.
- 수동제어의 거실조명 카드와 빠른 수동 조절 전구 토글이 실제 전구 상태와 동기화됩니다.
- 기본 화면 복귀 시 전구를 기본 대기 조명으로 되돌립니다.

## Vercel + ngrok 구조

Vercel은 웹 앱, 프론트엔드, Next.js API를 실행합니다. 하지만 Vercel 서버에서는 발표 노트북의 Bluetooth 전구에 직접 접근할 수 없습니다.

실제 전구 제어를 하려면 발표 노트북에서 로컬 FastAPI 서버를 실행하고, ngrok으로 로컬 8000번 포트를 외부 HTTPS 주소로 열어야 합니다. Vercel API는 그 ngrok 주소로 요청을 중계합니다.

### Vercel 환경변수

```bash
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
```

`MOTHER_HUE_CONTROL_API_KEY`는 로컬 FastAPI 서버의 `MOTHER_TOGETHER_API_KEY`와 같은 값으로 맞춥니다. `.env.local`에도 로컬 테스트용으로 같은 값을 넣을 수 있습니다.

ngrok 주소가 바뀌면 `NEXT_PUBLIC_HUE_API_BASE_URL`을 새 주소로 변경하고 Vercel을 redeploy해야 합니다.

### CMD 1: 로컬 FastAPI 서버

```powershell
cd "C:\Users\Jaehwan Kang\Desktop\thinq-momscare\thinq-momscare-codex\mother-hue-control"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### CMD 2: ngrok

```powershell
cd C:\ngrok
.\ngrok.exe http 8000
```

## 환경변수

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts

# LG ThinQ 공기청정기
THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=thinq-momscare-client-001
THINQ_MOCK_FALLBACK=true

# Philips Hue/Bluetooth 전구 중계
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
```

## 로컬 개발 실행

```bash
npm install
npm run dev
```

확인 URL:

- `http://localhost:3000/`
- `http://localhost:3000/simulation-3d/index.html`

문서만 수정한 경우 build는 필수는 아니지만, 코드 변경이 섞였는지 확인하려면 `npm run build`를 실행할 수 있습니다.

## 프로젝트 구조

```text
app/
  page.tsx                         # 메인 앱 진입점
  api/
    voice/route.ts                 # OpenAI STT
    simulation-3d/voice-intent/    # 케어 의도 분석
    tts/route.ts                   # TTS 응답
    thinq/state/route.ts           # 공기청정기 상태
    thinq/control/route.ts         # 공기청정기 제어
    light/[action]/route.ts        # 전구 로컬 FastAPI 중계

components/
  mobile/MobileUserHome.tsx        # 메인 모바일 UI, 하단 탭, HUB 버튼, 수동제어
  home-demo/SmartHomeDashboard.tsx # 수동제어 기기 카드

lib/
  shared-demo-state.ts             # 공유 상태 타입
  hue-presets.ts                   # 모드별 대표색
  light-control.ts                 # 케어 모드와 전구 모드 매핑
  light-local-proxy.ts             # ngrok/FastAPI 전구 중계
  thinq.ts                         # LG ThinQ PAT API

public/simulation-3d/
  index.html                       # 3D 시뮬레이터와 wake word 음성 흐름

mother-hue-control/
  app/main.py                      # 로컬 FastAPI 전구 제어 서버
```

## 시연 전 체크리스트

- Vercel 배포 주소에서 `/`가 열리는지 확인
- Vercel 배포 주소에서 `/simulation-3d/index.html`이 열리는지 확인
- 모바일 브라우저 마이크 권한 허용
- 3D 시뮬레이터 브라우저 마이크 권한 허용
- OpenAI API key 설정 확인
- ThinQ 앱에서 공기청정기 온라인 확인
- 발표 노트북에서 FastAPI 서버 실행
- ngrok HTTPS 주소 확인
- Vercel `NEXT_PUBLIC_HUE_API_BASE_URL`이 현재 ngrok 주소인지 확인
- ngrok 주소 변경 후 redeploy 완료 여부 확인
- 임신준비중 5개 모드 테스트
- 임신중 6개 모드 테스트
- 공기청정기 ON/OFF 테스트
- 전구 ON/OFF와 대표색 테스트
- 기본 모드 복귀 후 앱 카드와 3D 기본 화면, 대기 조명이 함께 초기화되는지 확인

자세한 문서는 `docs/`의 최신 Vercel 시연 문서를 참고합니다.

현재 기준: Vercel 시연 기능만 반영.
