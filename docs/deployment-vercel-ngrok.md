# Vercel + ngrok 배포 구조

현재 시연은 Vercel 배포 앱과 발표 노트북의 로컬 FastAPI 서버를 함께 사용합니다.

## 역할 분리

| 영역 | 담당 |
| --- | --- |
| Vercel | 웹 앱, 프론트엔드, Next.js API, OpenAI STT/의도 분석/TTS 흐름, ThinQ API 호출 |
| 로컬 FastAPI | 발표 노트북에서 실제 Philips Hue/Bluetooth 전구 제어 |
| ngrok | 로컬 8000번 포트를 외부 HTTPS 주소로 공개 |

Vercel은 Bluetooth 전구를 직접 제어할 수 없습니다. 전구 제어 시연 전에는 반드시 로컬 FastAPI 서버와 ngrok을 켜야 합니다.

## Vercel 환경변수

```bash
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
```

`MOTHER_HUE_CONTROL_API_KEY`는 로컬 FastAPI의 `MOTHER_TOGETHER_API_KEY`와 같은 값으로 맞춥니다.

ngrok 주소가 바뀌면 `NEXT_PUBLIC_HUE_API_BASE_URL`을 새 주소로 바꾸고 Vercel을 redeploy해야 합니다.

## 로컬 `.env.local`

로컬 Next.js 테스트에서도 같은 값을 둘 수 있습니다.

```bash
NEXT_PUBLIC_HUE_API_BASE_URL=https://현재-ngrok-주소
MOTHER_HUE_CONTROL_API_KEY=mt_demo_api_key
```

## 로컬 FastAPI 서버 실행

CMD 1:

```powershell
cd "C:\Users\Jaehwan Kang\Desktop\thinq-momscare\thinq-momscare-codex\mother-hue-control"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

FastAPI 서버의 환경에는 다음 값이 필요합니다.

```bash
MOTHER_TOGETHER_API_KEY=mt_demo_api_key
LIGHT_BACKEND=hueble
```

## ngrok 실행

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

## 배포 전 체크

- OpenAI API key 설정
- ThinQ 공기청정기 환경변수 설정
- ngrok 주소 최신화
- FastAPI 서버 8000번 포트 실행
- Vercel redeploy 완료
- 전구 ON/OFF 테스트
- 대표색 적용 테스트
- 기본 화면 복귀 시 기본 대기 조명 복귀 확인

현재 기준: Vercel 시연 기능만 반영.
