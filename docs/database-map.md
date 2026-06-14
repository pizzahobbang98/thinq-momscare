# ThinQ Mom Vercel 시연 데이터베이스 맵

이 문서는 최종 Vercel 시연 화면인 `/`, `/hub`, `/simulation-3d/index.html`에서 실제로 읽거나 쓰는 Supabase 데이터만 정리합니다.

최종 3화면에서 접근하지 않는 테이블과 향후 확장용 데이터는 제외했습니다.

## 핵심 데이터 흐름

```text
모바일 상태·역할 선택
  -> PATCH /api/demo-state
  -> mode_runs에 DEMO_STATE 스냅샷 저장

허브 음성·텍스트 입력
  -> /api/mother-together/execute
  -> mode_runs에 케어 실행 저장
  -> 실제 ThinQ 성공 시 device_events 저장
  -> 남편용 행동 문구를 messages에 저장

3D와 모바일 디바이스 탭
  -> GET /api/demo-state
  -> 최신 상태와 케어 모드 반영

AI 다이어리
  -> 최근 로그와 성장 기록 조회
  -> diary_entries에 생성 결과 저장
```

## 현재 사용하는 테이블

### 핵심 테이블

| 테이블 | 현재 시연에서의 역할 | 주요 사용처 |
| --- | --- | --- |
| `mode_runs` | 공유 상태 스냅샷, 허브 발화, 케어 모드, 역할별 문구, 기기 실행 결과 저장 | `/api/demo-state`, `/api/mother-together/execute`, 허브, 다이어리 |
| `device_events` | 실제 ThinQ 공기청정기 명령 성공 기록 | 허브, 다이어리 |
| `diary_entries` | 생성된 AI 다이어리 저장과 모바일 캘린더 표시 | `/api/diary/generate`, `/api/demo-state` |
| `ultrasound_records` | 사용자가 업로드한 초음파 성장 기록 | 모바일 홈, 초음파 분석, 다이어리 |

### 다이어리와 아침 안내의 보조 테이블

| 테이블 | 현재 시연에서의 역할 |
| --- | --- |
| `users` | 임신 주차 계산용 출산 예정일과 태명 fallback 조회 |
| `symptom_logs` | 최근 증상 문맥 조회, 다이어리 저장 실패 시 legacy fallback |
| `moods` | 최근 기분 문맥 조회 |
| `messages` | 허브 케어의 남편용 행동 문구와 아침 안내 저장 |
| `daily_cards` | 아내용 아침 안내 카드 저장 |

### 허브 호환 조회

| 테이블 | 현재 시연에서의 역할 |
| --- | --- |
| `alerts` | 허브가 기존 알림 데이터가 있으면 읽어 화면 상태를 구성 |
| `hearts` | 허브 Realtime 구독 호환을 위해 남아 있는 가족 반응 데이터 |

`alerts`와 `hearts`는 최종 3화면 시연의 핵심 조작 단계는 아닙니다. 다만 현재 `/hub` 코드가 조회 또는 Realtime 구독하므로 배포 DB에서 제거하면 콘솔 경고가 생길 수 있습니다.

## Storage

| Bucket | 역할 |
| --- | --- |
| `ultrasound-images` | 업로드한 초음파 원본 저장 및 signed URL 생성 |

시연용 기본 초음파 이미지는 DB가 아니라 `public/demo/ultrasound/`에 정적 파일로 포함되어 있습니다.

## `mode_runs` 사용 방식

### 공유 상태 스냅샷

`/api/demo-state`는 아래 조건의 행을 최신 상태 스냅샷으로 사용합니다.

```text
source = demo_state
mode = DEMO_STATE
signals = SharedDemoState JSON
```

`signals`에 저장되는 주요 값:

- `pregnancyStatus`: `preparing` 또는 `pregnant`
- `pregnancyWeek`: 1~42
- `role`: `wife` 또는 `husband`
- `currentRoutine`: 허브 케어 모드
- `simulationRoutine`: 3D routine ID
- `preparationMode`: 준비 상태 전용 모드
- `careState`: `idle`, `processing`, `completed`
- `diaryEntries`: API 장애 시 화면 유지를 위한 다이어리 사본

### 허브 케어 실행

허브 실행 행에는 다음 데이터가 저장됩니다.

- `mode`, `mode_label`
- `source`
- `input_text`
- `signals`: 상태·역할 표식 포함
- `reply`
- `wife_card`, `husband_card`
- `device_results`
- `created_at`

상태와 역할을 섞지 않기 위해 `signals`의 `상태:preparing`, `상태:pregnant`, `역할:wife`, `역할:husband` 값을 사용합니다.

## API별 테이블 접근

| API 또는 화면 | 읽기 | 쓰기 |
| --- | --- | --- |
| `/api/demo-state` | `mode_runs`, `diary_entries` | `mode_runs` |
| `/api/mother-together/execute` | 없음 | `mode_runs`, `device_events`, `messages` |
| `/api/briefing` | `users`, `symptom_logs`, `moods`, `device_events` | 없음 |
| `/api/briefing/morning` | `users`, `symptom_logs`, `moods`, `mode_runs` | `daily_cards`, `messages` |
| `/api/diary/generate` | `users`, `mode_runs`, `symptom_logs`, `device_events`, `ultrasound_records`, `moods` | `diary_entries`, 실패 시 `symptom_logs` |
| `/api/ultrasound/analyze` | 없음 | `ultrasound-images`, `ultrasound_records` |
| 모바일 `/` | `ultrasound_records`, `ultrasound-images` | API를 통해 저장 |
| 허브 `/hub` | 위 테이블의 최근 기록과 `alerts` | API를 통해 저장 |

## Vercel 배포 주의사항

- Vercel Serverless 메모리는 공유 상태 저장소로 사용할 수 없습니다.
- 서로 다른 기기는 반드시 `/api/demo-state`와 Supabase `mode_runs`를 기준으로 동기화합니다.
- `localStorage`와 `BroadcastChannel`은 같은 브라우저의 빠른 반영용 보조 수단입니다.
- anon key에 필요한 테이블의 `select`, `insert`, `upsert` 권한과 RLS 정책이 있어야 합니다.
- `ultrasound-images` bucket의 업로드와 signed URL 생성 정책을 확인해야 합니다.

문서 기준일: 2026-06-14
