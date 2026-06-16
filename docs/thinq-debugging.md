# ThinQ 실물 공기청정기 연동 점검

## 호출 흐름

허브에서 케어 모드를 실행하면 ThinQ 제어는 두 경로로 진입합니다.

1. 허브 즉시 제어
   - `app/hub/hub-page.tsx`
   - `triggerImmediateThinQControl(...)`
   - `lib/hub-thinq-dispatch.ts`
   - `POST /api/thinq/control`
   - `lib/thinq.ts`
   - LG ThinQ API `/devices/{deviceId}/control`

2. 서버 실행 기록 포함 제어
   - `app/hub/hub-page.tsx`
   - `POST /api/mother-together/execute`
   - `lib/mode-actions.ts`
   - `lib/thinq.ts`
   - LG ThinQ API `/devices/{deviceId}/control`
   - `mode_runs`, `device_events` 저장

3D 시뮬레이터는 별도 브리지로 먼저 반영됩니다. ThinQ 실패가 있어도 허브 UI와 3D 시뮬레이터는 깨지지 않지만, 서버 로그에는 실패 원인이 남아야 합니다.

## Vercel 환경변수

실물 기기 테스트 기준으로 Vercel Project Settings → Environment Variables에 아래 값을 넣습니다.

- `THINQ_PAT_TOKEN`: ThinQ PAT 토큰. 우선 사용됩니다.
- `THINQ_ACCESS_TOKEN`: `THINQ_PAT_TOKEN`이 없을 때 fallback으로 사용됩니다.
- `THINQ_DEVICE_ID`: 제어할 공기청정기 device ID.
- `THINQ_CLIENT_ID`: ThinQ 요청 client ID. 없으면 기본값을 쓰지만 배포 테스트에서는 명시 권장.
- `THINQ_MOCK_FALLBACK`: 실물 테스트에서는 `false`. 시연용 mock 허용 시 `true`.

토큰 값은 코드나 로그에 출력하지 않습니다. 로그에는 토큰 사용 여부와 `tokenSource`만 표시됩니다. `THINQ_DEVICE_ID`와 `THINQ_CLIENT_ID`는 `abcdef...7890` 형태로 마스킹됩니다.

## 로그 확인 위치

Vercel에서 배포 후 다음 위치에서 Function 로그를 확인합니다.

- Vercel Dashboard → Project → Deployments → 현재 배포 → Functions
- 또는 Project → Logs에서 `/api/thinq/control`, `/api/thinq/state`, `/api/mother-together/execute` 검색

확인할 로그 키워드:

- `[api/thinq/control] request`
- `[thinq] environment`
- `[thinq] request start`
- `[thinq] response received`
- `[thinq] controlAirPurifier failed`
- `[mode-actions] ThinQ actual action failed`
- `[mother-together/execute] ThinQ action flow start`

`THINQ_MOCK_FALLBACK=true`이면 실패 시 `[thinq] mock으로 성공 처리됨` 로그가 남습니다. `false`이면 mock 성공으로 숨기지 않고 `/api/thinq/control`이 500을 반환하며 서버 로그에 실패 원인이 남습니다.

## 로컬 테스트

1. `.env.local`에 실물 테스트용 값을 설정합니다. 이 파일은 커밋하지 않습니다.
2. 실물 기기 테스트는 `THINQ_MOCK_FALLBACK=false`로 실행합니다.
3. 개발 서버를 실행합니다.
4. 브라우저에서 `/api/thinq/state`를 열어 실제 상태가 반환되는지 확인합니다.
5. 허브에서 다음 발화를 테스트합니다.
   - 입덧: 공기청정기 터보 모드
   - 수면: 공기청정기 수면 모드
   - 가사/휴양지: 공기청정기 자동 모드
6. 터미널 로그에서 `request start`, `response received`, `controlAirPurifier` 결과를 확인합니다.
7. ThinQ 앱에서 실제 공기청정기 상태가 바뀌었는지 확인합니다.

## Vercel 테스트

1. Vercel 환경변수에 실물 값을 넣고 재배포합니다.
2. `THINQ_MOCK_FALLBACK=false`인지 확인합니다.
3. 배포 URL에서 `/api/thinq/state`를 호출합니다.
4. 허브에서 케어 모드를 실행합니다.
5. Vercel Function 로그에서 `/api/thinq/control`과 `/api/mother-together/execute` 로그를 확인합니다.
6. 로그의 `status`, `bodySummary`, `command`, `mockFallbackEnabled`, `missingRequired`를 확인합니다.
7. ThinQ 앱에서 실제 공기청정기 모드 변경을 확인합니다.

## 실패 해석

- `missingRequired`에 `THINQ_DEVICE_ID`가 있으면 device ID가 배포 환경에 없습니다.
- `missingRequired`에 `THINQ_PAT_TOKEN or THINQ_ACCESS_TOKEN`이 있으면 인증 토큰이 없습니다.
- `status: 401` 또는 `403`이면 토큰 권한이나 만료를 확인합니다.
- `status: 416`, `not connected device`, `code 1222`이면 ThinQ에서 기기가 연결되지 않은 상태로 응답한 것입니다.
- `THINQ_MOCK_FALLBACK=true`에서만 mock 성공으로 넘어갑니다. 실물 테스트에서는 반드시 `false`로 둡니다.
