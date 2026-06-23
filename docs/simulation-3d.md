# 3D 시뮬레이터

3D 시뮬레이터는 `/simulation-3d/index.html`에서 접근하는 정적 시연 화면입니다. Vercel 배포 환경에서도 같은 경로로 접근합니다.

## 음성 진입

1. 화면이 열리면 마이크 권한을 허용합니다.
2. "하이 마더"라고 말합니다.
3. "네 말씀하세요" 응답 이후 케어 명령을 말합니다.
4. 명령 결과가 TTS로 반환되고 3D 공간, 공기청정기 표현, 조명 색상, 공유 상태가 바뀝니다.

## 공유 상태 동기화

3D 시뮬레이터는 모바일 앱과 같은 케어 상태를 사용합니다.

```text
3D 음성 명령
  -> `/api/simulation-3d/voice-intent`
  -> `/api/demo-state`
  -> 모바일 앱 수동제어 카드
  -> StandbyMe 화면
  -> 실제 공기청정기/전구
```

모바일 앱 또는 Hub 패널에서 실행한 모드도 3D 화면에 반영됩니다.

## 기본 복귀

- 특정 모드 실행 후 TTS/음성 반환이 끝납니다.
- 그 뒤 약 10초 동안 추가 발화가 없으면 기본 화면으로 돌아갑니다.
- 기본 복귀 시 공유 상태의 케어 모드가 초기화됩니다.
- 모바일 수동제어 카드, StandbyMe 화면, 기본 대기 조명도 함께 초기화됩니다.

## 지원 모드

### 임신준비중

| 모드 | 테스트 문구 | 대표색 |
| --- | --- | --- |
| 컨디션 밸런스 | 오늘 컨디션이 별로야. | `#FF8A00` |
| 수면 리듬 | 오늘은 푹 자고 싶어. | `#003CFF` |
| 마음 환기 | 집에만 있으니까 너무 답답해. | `#FFCC00` |
| 휴식 준비 | 너무 지친다. | `#FF4E42` |
| 둘의 저녁 | 예쁜 곳에서 저녁 먹고 싶어. | `#C4004B` |

### 임신중

| 모드 | 테스트 문구 | 대표색 |
| --- | --- | --- |
| 입덧 케어 | 냄새 때문에 너무 힘들어. | `#00B8FF` |
| 수면 케어 | 왜 이렇게 잠이 안들지. | `#5B1FFF` |
| 가사 케어 | 몸이 너무 무거워. | `#A6FF00` |
| 바다 휴양 | 시원한 바다 보고 싶어. | `#00C2A8` |
| 숲 휴양 | 조용한 숲에 가고 싶어. | `#007A2A` |
| 도시 휴양 | 도시 야경 보고 싶어. | `#A100FF` |

## 연동 API

| 기능 | 경로 |
| --- | --- |
| 의도 분석 | `/api/simulation-3d/voice-intent` |
| TTS | `/api/tts` |
| 공유 상태 | `/api/demo-state` |
| 공기청정기 제어 | `/api/thinq/control` |
| 전구 제어 | `/api/light/on`, `/api/light/off`, `/api/light/mode` |

## 주요 파일

- `public/simulation-3d/index.html`
- `public/simulation-3d/assets/`
- `app/api/simulation-3d/voice-intent/route.ts`
- `lib/simulation-broadcast.ts`
- `lib/simulation-test-mode-sync.ts`
- `lib/hue-presets.ts`
- `lib/light-control.ts`

현재 기준: Vercel 시연 기능만 반영.
