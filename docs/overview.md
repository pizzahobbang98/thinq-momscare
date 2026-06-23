# ThinQ Mom 개요

ThinQ Mom은 임신준비중 또는 임신중인 가족이 말과 버튼으로 집 안 케어 루틴을 실행하는 시연 앱입니다. 현재 문서는 2026-06-23 코드 기준으로 Vercel 배포에서 실제 사용하는 기능만 다룹니다.

## 실제 사용 화면

| 화면 | URL | 역할 |
| --- | --- | --- |
| 모바일 앱 | `/` | 온보딩, 홈, 기록, HUB, 수동제어, 설정 |
| 3D 시뮬레이터 | `/simulation-3d/index.html` | wake word 음성 실행과 3D 공간 연출 |
| StandbyMe 화면 | `/standby-display` | 공유 상태 기반 TV/StandbyMe 화면 연출 |
| AI Hub 패널 | `/hub` | 데스크톱형 실행/검증 패널 |

## 사용자 상태

- 임신준비중: 컨디션 밸런스, 수면 리듬, 마음 환기, 휴식 준비, 둘의 저녁
- 임신중: 입덧 케어, 수면 케어, 가사 케어, 바다 휴양, 숲 휴양, 도시 휴양
- 역할: 아내, 남편
- 임신중 상태에서는 임신 시작일 또는 주차를 기준으로 주차와 성장 정보를 계산합니다.

## 모바일 앱 탭

| 탭 | 실제 기능 |
| --- | --- |
| 홈 | 오늘 컨디션, 임신/준비 상태, 케어 제안, 기기 상태 요약 |
| 기록 | AI 다이어리 생성, 다이어리 캘린더, 초음파 업로드/분석, 성장 갤러리 |
| HUB | 음성 또는 예시 문구로 케어 실행 |
| 수동제어 | 케어 모드 버튼, 공기청정기/전구 토글, 기기 카드 상태 표시 |
| 설정 | 프로필 수정, 마이크 권한 확인, 공유 상태 새로고침, 3D 바로가기 |

## 케어 실행 흐름

```text
모바일 HUB / 3D wake word / 수동제어
  -> 음성 인식 또는 예시 문구
  -> `/api/simulation-3d/voice-intent` 또는 `/api/mother-together/execute`
  -> 케어 모드, 가전 제어, 조명 색상, TTS 응답 결정
  -> `/api/demo-state`와 Supabase/localStorage 보조 동기화
  -> 모바일 카드, 3D 화면, StandbyMe 화면, 실제 공기청정기/전구 반영
```

## 실제 연동 범위

| 영역 | 상태 | 설명 |
| --- | --- | --- |
| LG ThinQ 공기청정기 | 실제 | 전원, 자동, 터보, 수면 모드 |
| Philips Hue/Bluetooth 전구 | 실제 | 전원, 모드별 대표색 |
| 3D 시뮬레이터 | 실제 시연 | 정적 앱이 공유 상태와 음성 API를 사용 |
| StandbyMe 화면 | 실제 시연 | 공유 상태와 YouTube/이미지 연출 사용 |
| 냉장고/워시타워/로봇청소기/TV/스피커 | Mock 또는 확장 예정 | 카드 표현과 로그 중심 |

## 주요 파일

| 영역 | 파일 |
| --- | --- |
| 모바일 앱 | `components/mobile/MobileUserHome.tsx` |
| 수동제어 카드 | `components/home-demo/SmartHomeDashboard.tsx` |
| 공유 상태 | `lib/shared-demo-state.ts`, `app/api/demo-state/route.ts` |
| 음성 의도 분석 | `app/api/simulation-3d/voice-intent/route.ts` |
| Hub 실행 | `app/api/mother-together/execute/route.ts` |
| 공기청정기 | `lib/thinq.ts`, `app/api/thinq/*` |
| 전구 | `lib/light-control.ts`, `lib/hue-presets.ts`, `app/api/light/[action]/route.ts` |
| 초음파/다이어리 | `app/api/ultrasound/analyze/route.ts`, `app/api/diary/generate/route.ts` |
| StandbyMe | `app/standby-display/StandbyDisplayClient.tsx` |

현재 기준: Vercel 시연 기능만 반영.
