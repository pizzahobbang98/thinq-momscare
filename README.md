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

## DB 설계 (10개 테이블)

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

### daily_cards
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| card_date | date | 카드 날짜 |
| target_role | text | 'wife' 또는 'husband' |
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

### 아내 화면 (Wife UI)
- 입덧 모드 버튼 → 공기청정기 POWER ON + 강풍(POWER)
- 수면 모드 버튼 → 공기청정기 SLEEP 모드
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
- 양방향 메시지 → 남편↔아내 메시지 Realtime 동기화
- 하트 전송 → 아내 화면 하트 애니메이션 실시간
- 오늘의 케어 미션 → 남편용 GPT-4o 케어 미션 카드
- 병원 일정 확인 → 읽기 전용

### 허브 화면 (Hub UI)
- 자동 음성 브리핑 → ElevenLabs Park Hyun-mi TTS
- 수동 기기 제어 → 자동/강력/수면/절전/끄기
- 음성 트리거 → hold-to-record → Whisper → GPT-4o → 기기 제어
- 실제 PM2.5 표시 → 30초마다 ThinQ PAT API 폴링
- 실시간 이벤트 피드 → Supabase Realtime

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

### 환경변수
```
THINQ_PAT_TOKEN=thinqpat_...
THINQ_DEVICE_ID=134cf656...
THINQ_CLIENT_ID=thinq-momscare-client-001
```

---

## 시연 시나리오

### 시나리오 A. 앱 버튼 → 공기청정기 제어
1. 아내 스마트폰에서 '입덧 모드 켜기' 클릭
2. Supabase NAUSEA_MODE event INSERT
3. ThinQ PAT API → 공기청정기 POWER_ON + POWER 강풍 🔥
4. 허브 화면 이벤트 카드 실시간 등장

### 시나리오 B. 음성 트리거 → 공기청정기 제어
1. 허브 마이크 hold → "공기청정기 켜줘"
2. Whisper STT → GPT-4o AIR_ON 판단
3. ThinQ PAT API + Supabase 병렬처리
4. ElevenLabs "공기청정기를 켤게요" 음성 응답

### 시나리오 C. 아가야 기능
1. "아가야 입덧 심해" 발화
2. 키워드 감지 (아가야/아기야/애기야/baby)
3. GPT-4o 태아 입장 공감 답변
4. TTS nova 아기 목소리 + 공기청정기 켜기

### 시나리오 D. 긴급 알림
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
│   ├── elevenlabs.ts  # ElevenLabs TTS
│   ├── korean.ts      # 한국어 조사 처리
│   ├── pregnancy.ts   # 임신 주차 계산
│   └── daily-care.ts  # 케어카드 생성 로직
├── components/
│   ├── Spinner.tsx
│   ├── Toast.tsx
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

## 발표 당일 체크리스트

- [ ] `localhost:3000/api/cron/daily-care/test` 접속 → 케어카드 생성
- [ ] Supabase 대시보드 접속 (일시정지 방지)
- [ ] 온보딩에서 태명 + 주차 입력 → 데이터 초기화
- [ ] 공기청정기 발표장 와이파이 연결 (ThinQ 앱 Wi-Fi 변경)
- [ ] 3기기 동시 접속 테스트 (노트북/태블릿/스마트폰)
- [ ] ElevenLabs 크레딧 잔량 확인
- [ ] Vercel 배포 상태 확인

---

*마지막 업데이트: 2026.06.08*
