# 실제 기기 제어

현재 Vercel 시연에서 실제 제어하는 기기는 LG ThinQ 공기청정기와 Philips Hue/Bluetooth 전구입니다.

## LG ThinQ 공기청정기

### 지원 기능

- 실제 기기 ON/OFF
- 음성 명령과 수동제어 토글 연동
- 앱 수동제어 카드 상태 동기화
- 모드별 운전 상태 반영

### 주요 경로

| 기능 | 파일 |
| --- | --- |
| 상태 조회 | `app/api/thinq/state/route.ts` |
| 제어 | `app/api/thinq/control/route.ts` |
| ThinQ PAT API | `lib/thinq.ts` |
| 앱 상태 polling | `hooks/useThinQDeviceState.ts` |

### 모드별 제어

| 모드 | 공기청정기 동작 |
| --- | --- |
| 입덧 모드 | 강한 공기 케어 |
| 수면 모드 | 수면 중심 운전 |
| 가사 케어 | 자동 운전 |
| 바다/숲/도시 모드 | 자동 또는 정숙한 공기 케어 |
| 공기청정기 ON/OFF | 실제 전원 토글 |

## Philips Hue/Bluetooth 전구

### 지원 기능

- 실제 전구 ON/OFF
- 임신준비중 5개 모드 대표색 적용
- 임신중 6개 모드 대표색 적용
- 수동제어의 거실조명 카드와 빠른 수동 조절 토글 동기화
- 기본 화면 복귀 시 기본 대기 조명으로 동기화

### 대표색

| 상태 | 모드 | 대표색 |
| --- | --- | --- |
| 임신준비중 | 컨디션 | `#FF8A00` |
| 임신준비중 | 수면리듬 | `#003CFF` |
| 임신준비중 | 마음환기 | `#FFCC00` |
| 임신준비중 | 휴식준비 | `#FF4E42` |
| 임신준비중 | 둘의저녁 | `#C4004B` |
| 임신중 | 입덧 모드 | `#00B8FF` |
| 임신중 | 수면 모드 | `#5B1FFF` |
| 임신중 | 가사 케어 | `#A6FF00` |
| 임신중 | 바다 모드 | `#00C2A8` |
| 임신중 | 숲 모드 | `#007A2A` |
| 임신중 | 도시 모드 | `#A100FF` |

## Vercel에서 전구 제어가 필요한 이유

Vercel 서버는 발표 노트북의 Bluetooth 장치에 직접 접근할 수 없습니다. 실제 전구 제어는 노트북에서 실행 중인 FastAPI 서버가 담당하고, Vercel API는 ngrok HTTPS 주소로 요청을 중계합니다.

```text
메인 앱 또는 3D 음성 명령
  -> Vercel Next.js API `/api/light/on|off|mode`
  -> ngrok HTTPS 주소
  -> 발표 노트북 로컬 FastAPI 8000번 포트
  -> Philips Hue/Bluetooth 전구
```

## 주요 경로

| 기능 | 파일 |
| --- | --- |
| 전구 대표색 | `lib/hue-presets.ts` |
| 케어 모드와 전구 매핑 | `lib/light-control.ts` |
| Vercel API 중계 | `lib/light-local-proxy.ts`, `app/api/light/[action]/route.ts` |
| 로컬 FastAPI 서버 | `mother-hue-control/app/main.py` |
| 로컬 전구 팔레트 | `mother-hue-control/app/light_palettes.py` |

현재 기준: Vercel 시연 기능만 반영.
