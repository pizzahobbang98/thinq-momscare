# ThinQ Mom 개요

ThinQ Mom은 임신준비중 또는 임신중인 사용자와 배우자가 말로 집 안 케어를 실행하는 Vercel 시연용 MVP입니다.

현재 시연은 두 화면만 사용합니다.

| 화면 | URL | 역할 |
| --- | --- | --- |
| 메인 앱 | `/` | 상태·역할 선택, 홈, 기록, 수동제어, 하단 HUB 음성 버튼 |
| 3D 시뮬레이터 | `/simulation-3d/index.html` | “하이 마더” wake word 이후 음성 명령, 3D 장면·조명·기기 상태 표현 |

## 사용자 기준

- 상태: 임신준비중, 임신중
- 역할: 아내, 남편
- 임신중일 때 임신 주차 문맥을 함께 사용
- 응답과 기록은 상태와 역할에 맞춰 달라짐

## 핵심 경험

```text
메인 앱에서 상태와 역할 선택
  -> 하단 HUB 버튼을 누르고 말하거나 3D에서 “하이 마더” 이후 말함
  -> OpenAI STT와 의도 분석
  -> 케어 모드, 공기청정기, 전구, 3D 장면 실행
  -> 메인 앱 수동제어 카드 상태 동기화
  -> 3D는 일정 시간 추가 발화가 없으면 기본 화면으로 복귀
```

ThinQ Mom의 음성 기능은 자유형 만능 챗봇이 아니라 임신 상태와 역할에 맞춘 케어 실행형 음성 인터페이스입니다.

## 실제 시연 기능

- 임신준비중 5개 모드
- 임신중 6개 모드
- 공기청정기 ON/OFF
- 전구 ON/OFF와 모드별 대표색
- 기본 모드 복귀
- 좋은 아침이야
- 시간/날짜 안내
- 생활 케어 질문 답변
- 안전/응급성 발화 안내
- 수동제어의 빠른 수동 조절과 기기 카드 동기화

## 주요 코드 위치

| 영역 | 파일 |
| --- | --- |
| 메인 앱 진입 | `app/page.tsx` |
| 모바일 UI와 HUB 버튼 | `components/mobile/MobileUserHome.tsx` |
| 수동제어 기기 카드 | `components/home-demo/SmartHomeDashboard.tsx` |
| 3D 시뮬레이터 | `public/simulation-3d/index.html` |
| STT | `app/api/voice/route.ts` |
| 3D/모바일 공통 의도 분석 | `app/api/simulation-3d/voice-intent/route.ts` |
| 공기청정기 상태/제어 | `app/api/thinq/state/route.ts`, `app/api/thinq/control/route.ts` |
| 전구 중계 | `app/api/light/[action]/route.ts`, `lib/light-local-proxy.ts` |
| 모드별 전구 대표색 | `lib/hue-presets.ts` |
| 로컬 전구 서버 | `mother-hue-control/app/main.py` |

현재 기준: Vercel 시연 기능만 반영.
