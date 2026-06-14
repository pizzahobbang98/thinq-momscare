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

음성 품질 및 부가 기능:

```bash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
HUGGINGFACE_API_TOKEN=
HUGGINGFACE_ULTRASOUND_MODEL=
CRON_SECRET=
```

Vercel Project Settings의 Development, Preview, Production 환경에 필요한 값을 각각 등록합니다. `NEXT_PUBLIC_*` 값은 브라우저 번들에 노출될 수 있으므로 서비스 역할 키나 관리자 키를 넣지 않습니다.

## 배포 전 확인

1. `npm run lint`
2. `npx tsc --noEmit --incremental false`
3. `npm run build`
4. 세 화면을 각각 열고 모바일에서 상태·역할 변경
5. 허브 음성 입력 후 3D와 디바이스 탭 갱신 확인
6. AI 다이어리에서 현재 상태·역할의 대화와 기기 로그만 사용되는지 확인
