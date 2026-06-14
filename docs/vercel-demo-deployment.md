# ThinQ Mom Vercel 시연 배포 체크리스트

## 배포 대상 화면

| 기기 | URL |
| --- | --- |
| 핸드폰 | `https://배포주소/` |
| 노트북 A | `https://배포주소/hub` |
| 노트북 B | `https://배포주소/simulation-3d/index.html` |

세 화면은 한 번만 열고 유지합니다. 상태·역할 변경 시 새 창을 만들지 않습니다.

## 배포에 포함되는 기능

- 모바일 홈/디바이스 2탭
- 임신 준비중/임신중 상태 선택
- 아내/남편 역할 선택
- 임신 주차 선택
- 허브 음성·텍스트 입력과 음성 응답
- 준비 상태 5개 모드
- 임신중 입덧·수면·가사·휴양지 케어
- 실제 ThinQ 공기청정기 제어와 mock fallback
- 3D 장면과 스탠바이미·조명 표현
- 초음파 성장 기록과 정적 데모 갤러리
- 상태·역할별 AI 다이어리와 캘린더
- “좋은 아침이야” 상태·역할·주차별 안내

## 공유 상태 구조

- 기준 API: `/api/demo-state`
- 영속 저장: Supabase `mode_runs`
- 상태 snapshot: `source=demo_state`, `mode=DEMO_STATE`
- 허브 polling: 1초
- 3D polling: 2초
- 모바일 디바이스 polling: 2.5초

Vercel Serverless 메모리는 요청 간 유지되지 않습니다. 공유 상태를 전역 변수에 두지 않고 Supabase에서 읽어야 합니다.

`localStorage`와 `BroadcastChannel`은 같은 브라우저에서 빠르게 반영하기 위한 보조 수단이며 서로 다른 기기의 기준 데이터가 아닙니다.

## 사용하는 Supabase 데이터

핵심:

- `mode_runs`
- `device_events`
- `diary_entries`
- `ultrasound_records`
- Storage `ultrasound-images`

보조:

- `users`
- `symptom_logs`
- `moods`
- `messages`
- `daily_cards`
- `alerts`
- `hearts`

자세한 읽기·쓰기 관계는 [database-map.md](./database-map.md)를 참고합니다.

## 필수 환경변수

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_WIFE_ID=

OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts

THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=
THINQ_MOCK_FALLBACK=true
```

## 선택 환경변수

```bash
NEXT_PUBLIC_DEMO_HUSBAND_ID=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
HUGGINGFACE_API_TOKEN=
HUGGINGFACE_ULTRASOUND_MODEL=
CRON_SECRET=
```

| 환경변수 | 없을 때 |
| --- | --- |
| Supabase URL/key | 화면 fallback은 가능하지만 서로 다른 기기 동기화와 DB 저장 불가 |
| `NEXT_PUBLIC_DEMO_WIFE_ID` | 성장 기록, 다이어리 문맥과 실제 기기 로그의 사용자 연결 제한 |
| `NEXT_PUBLIC_DEMO_HUSBAND_ID` | 현재 최종 3화면 API는 직접 조회하지 않으며 호환용 값으로만 유지 |
| OpenAI key | 음성 인식·AI 생성 일부가 fallback 또는 오류로 전환 |
| OpenAI model 변수 | 코드 기본 모델 사용 |
| ThinQ token/device ID | 실제 공기청정기 제어 불가 |
| `THINQ_MOCK_FALLBACK` | 미설정 기본값은 활성화지만 배포에서는 명시 권장 |
| ElevenLabs | 해당 TTS가 비활성화되고 텍스트 흐름 유지 |
| Hugging Face | 초음파 분류가 fallback으로 전환 |
| Cron secret | 예약 daily-care 호출 제한, 핵심 3화면에는 영향 없음 |

`NEXT_PUBLIC_*`에는 service role key나 관리자 비밀값을 넣지 않습니다.

## Public 경로

반드시 아래 URL을 배포 결과에서 직접 확인합니다.

- `/simulation-3d/index.html`
- `/simulation-3d/assets/index-CnB7Ca9h.js`
- `/simulation-3d/assets/index-CWBYKDoy.css`
- `/demo/ultrasound/growth-week-06.png`
- `/demo/ultrasound/growth-week-18.png`

3D `index.html` 안에서는 `/api/demo-state`를 절대 URL이 아닌 같은 배포 origin의 경로로 호출합니다.

## RLS와 Storage

anon key 기준으로 현재 시연에 필요한 작업:

- `mode_runs`: select, insert, upsert
- `device_events`: select, insert
- `diary_entries`: select, insert
- `ultrasound_records`: select, insert
- `users`, `symptom_logs`, `moods`, `messages`, `daily_cards`, `alerts`, `hearts`: 해당 코드의 select 또는 insert
- `ultrasound-images`: upload, signed URL 생성

운영 보안 정책은 별도 사용자 인증 구조에 맞춰 강화해야 합니다. 현재 문서는 고정 데모 사용자 기반 시연 범위입니다.

## 배포 전 명령

```bash
npm install
npm run lint
npm run build
```

`npm run dev`는 로컬 확인용으로 계속 실행되는 서버이므로 배포 전 종료 검증 명령으로 사용하지 않습니다.

## 배포 후 테스트

1. 임신준비중 아내
2. 임신준비중 남편
3. 임신중 아내와 임신 주차
4. 임신중 남편
5. `좋은 아침이야` 응답 차이
6. 입덧·수면·가사·바다 케어
7. 실제 ThinQ 앱 모드 확인
8. 초음파 성장 갤러리
9. AI 다이어리 생성
10. `임신준비중 아내 → 임신중 아내 → 임신중 남편` 전환 시 데이터 섞임 확인

## 배포 직전 금지사항

- 모바일 케어/메뉴 탭 복구
- 상태 변경 때 새 창 열기
- `routineId`, `careMode`, scene key 임의 변경
- `/api/demo-state` polling 제거
- 공유 상태를 localStorage만으로 처리
- `public` asset 경로를 로컬 파일 경로로 변경
- 실제 ThinQ 실패를 mock 성공으로 오해

문서 기준일: 2026-06-14
