# 실제 기기 제어

현재 Vercel 시연에서 실제로 제어하는 기기는 LG ThinQ 공기청정기와 Philips Hue/Bluetooth 전구입니다. 나머지 가전은 시나리오 카드, 3D 연출, 로그 중심으로 동작합니다.

## LG ThinQ 공기청정기

### 지원 기능

| 기능 | 실제 동작 |
| --- | --- |
| 전원 켜기 | `POWER_ON` |
| 전원 끄기 | `POWER_OFF` |
| 자동/쾌적 모드 | `MODE_AUTO` |
| 입덧 케어 | `MODE_TURBO` |
| 수면 케어 | `MODE_SLEEP` |

### 연결 경로

```text
모바일/Hub/3D 명령
  -> Next.js API `/api/thinq/control`
  -> `lib/thinq.ts`
  -> LG ThinQ PAT API
  -> 모바일 기기 카드와 공유 상태 반영
```

상태 조회는 `/api/thinq/state`와 `hooks/useThinQDeviceState.ts`가 담당합니다. 실제 API 실패 시 `THINQ_MOCK_FALLBACK=true`이면 시연용 fallback 상태를 반환합니다.

## Philips Hue/Bluetooth 전구

### 지원 기능

| 기능 | 실제 동작 |
| --- | --- |
| 전구 켜기 | 기본 대기색 `#7A4A00` |
| 전구 끄기 | 전원 OFF |
| 케어 모드 색상 | 모드별 대표색 적용 |

### 연결 경로

```text
모바일/Hub/3D 명령
  -> Next.js API `/api/light/on|off|mode`
  -> `lib/light-local-proxy.ts`
  -> ngrok HTTPS
  -> 발표 노트북 로컬 FastAPI `mother-hue-control`
  -> Philips Hue/Bluetooth 전구
```

브라우저가 Web Bluetooth를 지원하고 사용자가 연결하면 모바일 수동제어에서 직접 Hue Bluetooth 연결도 사용할 수 있습니다.

## 모드별 조명 색상

| 상태 | 모드 | 대표색 |
| --- | --- | --- |
| 임신준비중 | 컨디션 밸런스 | `#FF8A00` |
| 임신준비중 | 수면 리듬 | `#003CFF` |
| 임신준비중 | 마음 환기 | `#FFCC00` |
| 임신준비중 | 휴식 준비 | `#FF4E42` |
| 임신준비중 | 둘의 저녁 | `#C4004B` |
| 임신중 | 입덧 케어 | `#00B8FF` |
| 임신중 | 수면 케어 | `#5B1FFF` |
| 임신중 | 가사 케어 | `#A6FF00` |
| 임신중 | 바다 휴양 | `#00C2A8` |
| 임신중 | 숲 휴양 | `#007A2A` |
| 임신중 | 도시 휴양 | `#A100FF` |

## Mock/확장 예정 가전

| 가전 | 현재 역할 |
| --- | --- |
| 냉장고 | 냄새 낮은 식사/재료 추천 시나리오 카드 |
| 워시타워/건조기 | 가사 케어와 빨래 도움 시나리오 카드 |
| 로봇청소기 | 가사 케어, 야간 제한 표현 |
| TV/스피커 | 휴양지/수면 연출 카드와 StandbyMe 화면 |
| 에어컨/후드/인덕션 | 확장 예정 액션으로 로그에 표시 |

## 주요 파일

- `lib/thinq.ts`
- `app/api/thinq/state/route.ts`
- `app/api/thinq/control/route.ts`
- `hooks/useThinQDeviceState.ts`
- `lib/light-control.ts`
- `lib/hue-presets.ts`
- `lib/light-local-proxy.ts`
- `app/api/light/[action]/route.ts`
- `mother-hue-control/app/main.py`
- `mother-hue-control/app/light_palettes.py`

현재 기준: Vercel 시연 기능만 반영.
