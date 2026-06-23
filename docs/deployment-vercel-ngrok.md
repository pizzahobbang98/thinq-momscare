# Vercel + ngrok 배포 구조

현재 시연은 Vercel 배포 앱과 발표 노트북의 로컬 FastAPI 서버를 함께 사용합니다.

## 역할 분리

| 영역 | 담당 |
| --- | --- |
| Vercel | 웹 앱, Next.js API, OpenAI STT/의도 분석/TTS, Supabase 동기화, ThinQ API 호출 |
| 로컬 FastAPI | 발표 노트북에서 실제 Philips Hue/Bluetooth 전구 제어 |
| ngrok | 로컬 8000번 포트를 외부 HTTPS 주소로 공개 |

Vercel 서버는 발표 노트북의 Bluetooth 전구에 직접 접근할 수 없습니다. 전구 제어 시연 전에는 반드시 로컬 FastAPI 서버와 ngrok을 켭니다.

## Vercel 환경변수

```bash
# 필수
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=

# 시연 사용자
NEXT_PUBLIC_DEMO_WIFE_ID=
NEXT_PUBLIC_DEMO_HUSBAND_ID=

# ThinQ 공기청정기
THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=thinq-momscare-client-001
THINQ_MOCK_FALLBACK=true

# Hue 로컬 중계
HUE_LOCAL_ENABLED=true
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key

# 선택
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
HUE_ENABLED=false
HUE_BRIDGE_HOST=
HUE_APPLICATION_KEY=
HUE_LIGHT_IDS=
CRON_SECRET=
HUGGINGFACE_API_TOKEN=
HUGGINGFACE_ULTRASOUND_MODEL=
```

`MOTHER_HUE_CONTROL_API_KEY`는 로컬 FastAPI의 `MOTHER_TOGETHER_API_KEY`와 같은 값으로 맞춥니다.

ngrok 주소가 바뀌면 `NEXT_PUBLIC_HUE_API_BASE_URL`을 새 주소로 바꾸고 Vercel을 redeploy해야 합니다.

## 로컬 FastAPI 서버

CMD 1:

```powershell
cd "C:\Users\Jaehwan Kang\Desktop\thinq-momscare\thinq-momscare-codex\mother-hue-control"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

FastAPI 서버 환경:

```bash
MOTHER_TOGETHER_API_KEY=mt_demo_api_key
LIGHT_BACKEND=hueble
HUE_BLE_ADDRESS=
HUE_BLE_AUTO_PAIR=true
```

## ngrok

CMD 2:

```powershell
cd C:\ngrok
.\ngrok.exe http 8000
```

ngrok이 보여주는 `https://...ngrok...` 주소를 Vercel의 `NEXT_PUBLIC_HUE_API_BASE_URL`에 넣습니다.

## 로컬 개발 서버

```bash
npm install
npm run dev
```

확인 URL:

- `http://localhost:3000/`
- `http://localhost:3000/simulation-3d/index.html`
- `http://localhost:3000/standby-display`

## 배포 전 체크

- `/`, `/simulation-3d/index.html`, `/standby-display` 접근 가능
- OpenAI API key 설정
- Supabase URL/anon key 설정
- ThinQ 공기청정기 토큰/기기 ID 설정
- FastAPI 서버 8000번 포트 실행
- ngrok HTTPS 주소 최신화
- Vercel 환경변수 수정 후 redeploy 완료
- 전구 ON/OFF와 대표색 적용 테스트
- 기본 모드 복귀 시 모바일, 3D, StandbyMe, 조명 상태 초기화 확인

현재 기준: Vercel 시연 기능만 반영.
