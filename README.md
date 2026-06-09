# ThinQ 맘스케어 개발일지
**프로젝트:** LG DX_TEAM03 캡스톤 — ThinQ 맘스케어  
**팀:** 5기 3반 3팀 하이파이프 (강재환, 강성구, 제준혁)  
**배포:** https://thinq-momscare.vercel.app  
**GitHub:** pizzahobbang98/thinq-momscare  
**발표일:** 2026.06.25

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15 + React |
| 모바일 | PWA (next-pwa) |
| DB | Supabase (PostgreSQL + Realtime + Storage) |
| STT | OpenAI Whisper |
| AI | GPT-4o |
| TTS (브리핑) | ElevenLabs Park Hyun-mi |
| TTS (아가야) | OpenAI TTS nova |
| 가전 제어 | LG ThinQ PAT API |
| 배포 | Vercel + Vercel Cron |

---

## DB 설계 (11개 테이블)

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid (PK) | 사용자 고유 ID |
| role | text | 'wife' 또는 'husband' |
| name | text | 사용자 이름 |
| due_date | date | 출산 예정일 |
| status | text | 'pregnant' 또는 'preparing' |
| created_at | timestamptz | 가입 일시 |

### symptom_logs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| log_id | uuid (PK) | 기록 고유 ID |
| user_id | uuid (FK) | 작성자 |
| symptom_text | text | 음성/텍스트 원문 |
| parsed_category | text | AI 분류 (NAUSEA/KICK/FATIGUE 등) |
| severity | integer | 심각도 1~5 (2이상 → 긴급알림) |
| advice | text | GPT-4o 조언 |
| triggered_action | text | 연동 가전 제어 액션 |
| created_at | timestamptz | 기록 일시 |

### device_events
| 컬럼 | 타입 | 설명 |
|------|------|------|
| event_id | uuid (PK) | 이벤트 고유 ID |
| user_id | uuid (FK) | 작성자 |
| event_type | text | NAUSEA_MODE, SLEEP_MODE 등 |
| triggered_by | text | APP 또는 VOICE |
| device_id | text | ThinQ API 기기 ID |
| device_status | jsonb | {"power":"ON", "mode":"POWER", "PM2.5":12} |
| created_at | timestamptz | 발생 일시 |

### mode_runs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | AI 모드 실행 고유 ID |
| user_id | uuid (FK) | 사용자 |
| mode | text | NAUSEA_MODE/SLEEP_MODE/HOUSEWORK_MODE/TRAVEL_MODE |
| mode_label | text | 화면 표시용 모드명 |
| source | text | hub_voice/hub_text/example_chip 등 |
| input_text | text | 사용자의 자연어 입력 |
| signals | jsonb | AI가 감지한 키워드/신호 |
| reply | text | 허브 음성 응답 문장 |
| wife_card | text | 엄마품 카드 요약 |
| husband_card | text | 아빠손길 행동 가이드 |
| device_results | jsonb | 실제/Mock/예정 기기 실행 결과 |
| created_at | timestamptz | 실행 일시 |

### daily_cards
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| card_date | date | 카드 날짜 |
| target_role | text | 'wife' 또는 'husband' |
| card_type | text | DAILY_CARE 또는 MORNING_BRIEFING |
| title | text | N주차 오늘의 조언 |
| content | text | GPT-4o 케어 조언 |
| pregnancy_week | integer | 임신 주차 |

### messages
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| from_role | text | 'wife' 또는 'husband' |
| content | text | 메시지 내용 |
| created_at | timestamptz | 전송 일시 |

### alerts
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| from_role | text | 'wife' |
| message | text | 증상 내용 |
| severity | integer | 심각도 |
| is_read | boolean | 남편 확인 여부 |

### hearts / moods / appointments / ultrasound_records
> 각각 하트 전송, 기분 트래킹, 병원 예약, 초음파 갤러리 저장용

---

## 구현 기능 전체 목록

### 공통 AI / 모드 시스템
- 4대 케어 모드 시스템 → NAUSEA/SLEEP/HOUSEWORK/TRAVEL 자연어 분류
- `lib/ai-mode-router.ts` → 키워드 fallback + GPT-4o JSON 분류로 모드, 신호, 아내/남편 카드 생성
- `lib/mode-actions.ts` → 모드별 실제 ThinQ/Mock/확장 예정 가전 액션 매핑
- `/api/mother-together/execute` → 자연어 입력 → AI 모드 라우팅 → 기기 실행 → mode_runs 기록 → TTS 응답
- `/api/briefing/morning` → 최근 증상/기분/모드 실행 기반 굿모닝 브리핑 생성
- mode_runs Realtime → 허브/아내/남편 화면에 AI 모드 실행 기록 동기화

### 아내 화면 (Wife UI)
- 입덧 모드 버튼 → 공기청정기 POWER ON + 강풍(POWER)
- 수면 모드 버튼 → 공기청정기 SLEEP 모드
- 엄마품 기능탭 → 오늘 컨디션, 냄새 민감도, 피로도, 수면 상태 기반 케어 추천
- 엄마품 카드 공유 → 아빠손길 메시지 + feature event 기록
- 먹을 수 있는 식탁/무거운 빨래/밤잠 지킴/외출 전 케어 기능 카드
- 굿모닝 브리핑 카드 → `/api/briefing/morning` 결과를 아내용 daily_cards로 표시
- 태동 카운터 → symptom_logs KICK 기록
- 음성 증상 기록 → Whisper STT → GPT-4o 분류 → DB 저장
- 아가야 기능 → 키워드 감지 → GPT-4o 답변 → TTS nova 재생
- 오늘 한마디 → GPT-4o severity 판단 → 2이상 시 남편 긴급알림
- AI 자동 일기 → 기분+증상+기기+초음파+병원 종합 생성
- 오늘의 케어카드 → 매일 7시 Vercel Cron → GPT-4o 주차별 조언
- 기분 트래킹 → moods INSERT → 남편 화면 실시간 반영
- 남편에게 메시지 → 양방향 카카오톡 스타일 말풍선
- 병원 예약 캘린더 → 날짜 클릭 추가/삭제, 검진일정 자동생성
- 초음파 갤러리 → 사진 업로드 → GPT-4o Vision 분석 → Storage 저장
- 태동 히트맵 → 7일 × 4시간대 색상 그리드
- 증상 트렌드 차트 → 일별 컨디션 선 차트 + 카테고리 분포
- 주간 AI 리포트 → 이번 주 종합 GPT-4o 리포트
- 임신 상태별 UI → pregnant / preparing 분기
- 주차 자동 갱신 → due_date 기반 실시간 계산
- 카드 확대 모달 → 모든 카드 ⛶ 버튼 → 바텀시트 전체화면

### 남편 화면 (Husband UI)
- 긴급 알림 → severity 2이상 → 빨간 배너 + 스마트폰 진동
- 긴급 알림 히스토리 → 과거 알림 기록 날짜/시간/심각도
- 아내 상태 모니터링 → 기분, 증상, 태동 실시간 확인
- 아빠손길 기능탭 → 오늘 필요한 배려 포인트와 바로 보낼 수 있는 행동 문장 제공
- 아빠손길 카드 → 식사/빨래/밤잠/외출 케어를 메시지·하트·ThinQ 상태와 연결
- AI 모드 실행 기록 → mode_runs 기반 남편 행동 카드 실시간 반영
- 양방향 메시지 → 남편↔아내 메시지 Realtime 동기화
- 하트 전송 → 아내 화면 하트 애니메이션 실시간
- 오늘의 케어 미션 → 남편용 GPT-4o 케어 미션 카드
- 병원 일정 확인 → 읽기 전용

### 허브 화면 (Hub UI)
- 허브 AI 자연어 허브 재구성 → 평소처럼 말하면 AI가 모드를 판단하고 환경을 조정
- 음성/텍스트 입력 → Whisper 또는 직접 입력 → `/api/mother-together/execute`
- 4대 모드 예시 칩 → 입덧/수면/가사케어/여행 모드 즉시 실행
- 굿모닝 브리핑 → `/api/briefing/morning` → 아내/남편 분리 브리핑 + ElevenLabs TTS
- AI 해석 카드 → 감지 신호, 모드 라벨, 아내/남편 카드, 실행된 기기 액션 표시
- 실행 로그 → 최근 5개 mode_runs 표시
- 수동 기기 제어는 숨김 처리, ThinQ 연결 상태는 컴팩트 카드로 유지
- 실제 PM2.5 표시 → 30초마다 ThinQ PAT API 폴링
- 실시간 이벤트 피드 → Supabase Realtime + polling fallback

---

## LG ThinQ PAT API 연동

### 연동 방식
- **인증:** PAT (Personal Access Token) 방식 (OAuth 대신 채택)
- **Base URL:** https://api-kic.lgthinq.com
- **Device Type:** DEVICE_AIR_PURIFIER

### 지원 모드 (실제 API 확인)
```
operation: POWER_ON / POWER_OFF
windStrength: AUTO / LOW / MID / HIGH / POWER
airPurifierJobMode: SLEEP / CLEAN
```

### 명령 매핑
| 앱 명령 | ThinQ API Body |
|---------|---------------|
| POWER_ON | operation: POWER_ON |
| POWER_OFF | operation: POWER_OFF |
| MODE_AUTO | airFlow.windStrength: AUTO |
| MODE_TURBO | airFlow.windStrength: POWER |
| MODE_SLEEP | airPurifierJobMode: SLEEP |
| MODE_SAVING | airFlow.windStrength: LOW |
| NAUSEA_MODE | POWER_ON → windStrength: POWER (2단계) |

### 4대 AI 모드 액션 매핑
| AI 모드 | 실제 ThinQ 액션 | Mock/확장 예정 액션 |
|---------|----------------|--------------------|
| NAUSEA_MODE | 공기청정기 강력 모드 | 에어컨 약풍, 주방후드 강환기, 냄새 낮은 식사/조리 추천 |
| SLEEP_MODE | 공기청정기 수면 모드 | 에어컨 수면 온도, 조명 디밍, TV 자동 종료, 로봇청소기 야간 제한 |
| HOUSEWORK_MODE | 공기청정기 자동 모드 | 세탁물 케어 유지, 건조기 구김 방지, 식기세척기 알림 묶기, 로봇청소기 일정 조정 |
| TRAVEL_MODE | 공기청정기 쾌적/자동 모드 | 분위기 영상, 자연 소리, 조명 씬, 산들바람 설정 |

### 환경변수
```
THINQ_PAT_TOKEN=thinqpat_...
THINQ_DEVICE_ID=134cf656...
THINQ_CLIENT_ID=thinq-momscare-client-001
```

---

## 시연 시나리오

### 시나리오 A. 4대 모드 자연어 허브
1. 허브에 "입덧 때문에 냄새가 힘들어" 입력 또는 발화
2. `/api/mother-together/execute` → `lib/ai-mode-router.ts` → NAUSEA_MODE 판단
3. `lib/mode-actions.ts` → 공기청정기 강력 모드 실행 + Mock/예정 가전 액션 생성
4. mode_runs 저장 → 허브 실행 로그, 엄마품, 아빠손길에 실시간 반영
5. ElevenLabs "냄새 부담이 줄어들도록..." 음성 응답

### 시나리오 B. 앱 버튼 → 공기청정기 제어
1. 아내 스마트폰에서 '입덧 모드 켜기' 클릭
2. Supabase NAUSEA_MODE event INSERT
3. ThinQ PAT API → 공기청정기 POWER_ON + POWER 강풍 🔥
4. 허브 화면 이벤트 카드 실시간 등장

### 시나리오 C. 굿모닝 브리핑
1. 허브에서 "굿모닝" 발화 또는 브리핑 버튼 클릭
2. `/api/briefing/morning` → 최근 증상/기분/mode_runs 조회
3. GPT-4o → 아내용 브리핑 + 남편 행동 브리핑 + 추천 모드 생성
4. daily_cards(MORNING_BRIEFING) 저장 + 남편 메시지 저장
5. 허브에서 ElevenLabs 음성 재생, 아내/남편 화면에 카드 반영

### 시나리오 D. 기존 음성 트리거 → 공기청정기 제어
1. 허브 마이크 hold → "공기청정기 켜줘"
2. Whisper STT → GPT-4o AIR_ON 판단
3. ThinQ PAT API + Supabase 병렬처리
4. ElevenLabs "공기청정기를 켤게요" 음성 응답

### 시나리오 E. 아가야 기능
1. "아가야 입덧 심해" 발화
2. 키워드 감지 (아가야/아기야/애기야/baby)
3. GPT-4o 태아 입장 공감 답변
4. TTS nova 아기 목소리 + 공기청정기 켜기

### 시나리오 F. 긴급 알림
1. 아내 "배가 너무 아파요" 입력
2. GPT-4o severity 판단 → 2이상 → alerts INSERT
3. 남편 화면 빨간 배너 + 진동 3회
4. 남편 확인 → is_read 업데이트

---

## 폴더 구조

```
thinq-momscare/
├── app/
│   ├── wife/          # 아내 화면
│   ├── husband/       # 남편 화면
│   ├── hub/           # 허브 화면
│   ├── onboarding/    # 온보딩
│   ├── select/        # 역할 선택
│   └── api/
│       ├── voice/          # Whisper STT + GPT-4o 의도 분석
│       ├── baby-voice/     # 아가야 감지 + TTS nova
│       ├── briefing/       # ElevenLabs 허브 브리핑
│       │   └── morning/    # 굿모닝 브리핑 생성
│       ├── mother-together/
│       │   └── execute/    # 자연어 → AI 모드 라우팅 → 기기 실행
│       ├── analyze/        # 증상 GPT-4o 분류
│       ├── diary/          # AI 자동 일기
│       ├── ultrasound/     # GPT-4o Vision 초음파 분석
│       ├── setup/          # 온보딩 초기화 + 검진일정 생성
│       ├── thinq/          # ThinQ PAT API 제어/상태
│       └── cron/daily-care/ # 매일 7시 케어카드 생성
├── lib/
│   ├── supabase.ts    # Supabase 클라이언트
│   ├── thinq.ts       # ThinQ PAT API (실제 연동)
│   ├── thinq-mock.ts  # Mock ThinQ (fallback)
│   ├── ai-mode-router.ts # 4대 모드 자연어 라우터
│   ├── mode-actions.ts   # 모드별 실제/Mock/예정 가전 액션
│   ├── elevenlabs.ts  # ElevenLabs TTS
│   ├── korean.ts      # 한국어 조사 처리
│   ├── pregnancy.ts   # 임신 주차 계산
│   └── daily-care.ts  # 케어카드 생성 로직
├── components/
│   ├── Spinner.tsx
│   ├── Toast.tsx
│   ├── features/
│   │   ├── WifeFeaturesTab.tsx
│   │   ├── HusbandFeaturesTab.tsx
│   │   └── FeatureCard.tsx
│   └── AppointmentCalendar.tsx
├── .env.local
└── .cursorrules
```

---

## 환경변수 전체 목록

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEMO_WIFE_ID=aaaaaaaa-0000-0000-0000-000000000001
NEXT_PUBLIC_DEMO_HUSBAND_ID=bbbbbbbb-0000-0000-0000-000000000002

# OpenAI
OPENAI_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=  # Park Hyun-mi

# ThinQ PAT API
THINQ_PAT_TOKEN=
THINQ_DEVICE_ID=
THINQ_CLIENT_ID=thinq-momscare-client-001

# Cron
CRON_SECRET=momscare-cron-2025
```

---

## 예산

| 항목 | 금액 | 상태 |
|------|------|------|
| OpenAI API | 46,780원 | 결제 완료 |
| ElevenLabs | 약 13,800원 ($10) | 결제 완료 |
| Supabase | 0원 (Free) | 사용 중 |
| Vercel | 0원 (Free) | 배포 완료 |
| **합계** | **약 60,580원** | |

---

## Supabase Realtime 설정 체크리스트

Hub·아내·남편 화면의 실시간 피드/메시지/알림이 동작하려면 Supabase Dashboard에서 아래를 확인하세요.

### 1. Realtime 테이블 활성화
Database > **Replication** (또는 **Realtime**) 메뉴에서 다음 테이블 Realtime ON:
- `device_events`
- `mode_runs`
- `messages`
- `alerts`
- `hearts`
- `symptom_logs`
- `moods`

### 2. publication 추가 (SQL Editor)
```sql
-- already member of publication 오류는 무시해도 됩니다.
alter publication supabase_realtime add table device_events;
alter publication supabase_realtime add table mode_runs;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table hearts;
alter publication supabase_realtime add table symptom_logs;
alter publication supabase_realtime add table moods;
```

### 3. RLS SELECT 정책 (개발/시연용)
RLS가 켜져 있다면 `anon` 역할 SELECT 정책이 필요합니다.  
**아래는 시연용 예시이며, 실제 운영 환경에서는 user_id·role 기반으로 별도 강화해야 합니다.**

```sql
create policy "Allow anon read device_events"
on device_events for select to anon using (true);

create policy "Allow anon read mode_runs"
on mode_runs for select to anon using (true);

create policy "Allow anon read messages"
on messages for select to anon using (true);

create policy "Allow anon read alerts"
on alerts for select to anon using (true);

create policy "Allow anon read hearts"
on hearts for select to anon using (true);

create policy "Allow anon read symptom_logs"
on symptom_logs for select to anon using (true);

create policy "Allow anon read moods"
on moods for select to anon using (true);
```

### 4. 환경변수
`.env.local`에 아래 값이 올바른지 확인:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Hub 화면 fallback
- Realtime: 단일 채널 `hub-realtime-{uuid}`로 device_events·mode_runs·symptom_logs·moods·messages·alerts·hearts 구독
- 실패 시 **30초 polling**으로 device_events·mode_runs·symptom_logs·moods·messages·alerts 스냅샷 갱신
- 헤더 상태 뱃지: `실시간 연결됨` / `실시간 연결 대기 중` / `실시간 연결 실패, 자동 새로고침 중`

---

## 발표 당일 체크리스트

- [ ] `localhost:3000/api/cron/daily-care/test` 접속 → 케어카드 생성
- [ ] Supabase 대시보드 접속 (일시정지 방지)
- [ ] 온보딩에서 태명 + 주차 입력 → 데이터 초기화
- [ ] 공기청정기 발표장 와이파이 연결 (ThinQ 앱 Wi-Fi 변경)
- [ ] 3기기 동시 접속 테스트 (노트북/태블릿/스마트폰)
- [ ] ElevenLabs 크레딧 잔량 확인
- [ ] Vercel 배포 상태 확인

---

*마지막 업데이트: 2026.06.09*
