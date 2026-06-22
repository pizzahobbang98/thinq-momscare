import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { getHomeCareMessage } from '@/lib/home-care-messages'
import { OPENAI_MODELS } from '@/lib/openai-models'
import type { DemoPregnancyStatus, DemoRole, PreparationMode } from '@/lib/shared-demo-state'

type VoiceIntentRequest = {
  text?: string
  alternatives?: string[]
  pregnancyStatus?: DemoPregnancyStatus
  role?: DemoRole
  pregnancyWeek?: number
  preparationMode?: PreparationMode
  allowAllCareModes?: boolean
}

type VoiceIntentResponse = {
  success: boolean
  type?: 'routine' | 'device_control' | 'morning_guidance' | 'conversation_only' | 'safety_medical' | 'out_of_scope' | 'unknown'
  intent?: string
  transcript: string
  userText?: string
  understoodText?: string
  reply?: string
  intentSentence: string
  executionText: string
  ttsText: string
  routineId: string | null
  preparationMode: PreparationMode | null
  queryMode: string | null
  defaultMode?: boolean
  airPowerOff?: boolean
  airPowerOn?: boolean
  lightPowerOff?: boolean
  lightPowerOn?: boolean
  deviceAction?: 'on' | 'off'
  lightAction?: 'on' | 'off'
  actionType?: 'conversation_only'
  source: 'keyword' | 'openai' | 'fallback'
}

const PREPARING_RULES: Array<{
  terms: string[]
  preparationMode: PreparationMode
  routineId: string
  intentSentence: string
  executionText: string
}> = [
  {
    terms: ['오늘 컨디션이 별로야', '몸이 좀 무거워', '아침부터 몸이 무거워', '가볍게 시작하고 싶어', '오늘 하루 준비해줘', '컨디션 맞춰줘', '몸 상태가 별로야', '아침 컨디션을 맞춰줘', '컨디션이 별로야', '아침 컨디션', '밸런스', '아침 상태'],
    preparationMode: 'condition',
    routineId: 'housework_care',
    intentSentence: '아침 컨디션과 생활 리듬 조정 의도를 감지했습니다.',
    executionText: '네, 컨디션 밸런스 모드를 실행할게요. 맑은 공기와 부드러운 빛으로 아침 컨디션을 맞출게요.',
  },
  {
    terms: ['오늘은 푹 자고 싶어', '잠을 잘 자고 싶어', '밤에 편하게 자고 싶어', '잠들기 편하게 해줘', '수면 리듬 맞춰줘', '오늘 밤 잘 쉬고 싶어', '잠이 잘 오게 해줘', '잠을 잘', '수면 리듬', '못 자겠어', '푹 자'],
    preparationMode: 'sleep-rhythm',
    routineId: 'sleep_care',
    intentSentence: '수면 리듬을 안정시키려는 의도를 감지했습니다.',
    executionText: '네, 수면 리듬 모드를 실행할게요. 화면 자극과 생활 소음을 차분하게 낮출게요.',
  },
  {
    terms: ['집에만 있으니까 너무 답답해', '마음이 답답해', '기분을 바꾸고 싶어', '기분 전환하고 싶어', '상쾌하게 바꿔줘', '공기가 답답해', '마음 환기하고 싶어', '기분', '마음', '환기', '답답'],
    preparationMode: 'refresh',
    routineId: 'destination_forest',
    intentSentence: '마음 환기와 기분 전환 의도를 감지했습니다.',
    executionText: '네, 마음 환기 모드를 실행할게요. 숲길 화면과 산뜻한 자연풍으로 분위기를 바꿀게요.',
  },
  {
    terms: ['너무 지친다', '오늘 너무 지쳤어', '그냥 쉬고 싶어', '조용히 쉬고 싶어', '몸을 좀 쉬고 싶어', '편하게 쉬고 싶어', '잠깐 쉬게 해줘', '편하게 쉬', '휴식', '쉬고 싶', '편히 쉬', '지쳤어'],
    preparationMode: 'rest-ready',
    routineId: 'sleep_care',
    intentSentence: '편안한 휴식 준비 의도를 감지했습니다.',
    executionText: '네, 휴식 준비 모드를 실행할게요. 잔잔한 음악과 따뜻한 조명으로 편하게 쉴 수 있게 할게요.',
  },
  {
    terms: ['예쁜 곳에서 저녁 먹고 싶어', '둘이 예쁜 곳에 가고 싶어', '오늘은 둘이 저녁 먹고 싶어', '저녁 분위기 좋게 해줘', '우리 둘만의 저녁 준비해줘', '따뜻한 저녁 분위기로 해줘', '둘이서 저녁 먹고 싶어', '둘의 저녁', '우리 둘', '저녁을 준비', '둘만의'],
    preparationMode: 'couple-routine',
    routineId: 'destination_city',
    intentSentence: '둘이 함께 머무는 저녁 루틴 의도를 감지했습니다.',
    executionText: '네, 둘의 저녁 모드를 실행할게요. 둘만의 플레이리스트와 로즈 앰버 조명으로 차분한 저녁을 준비할게요.',
  },
]

const PREGNANT_RULES: Array<{
  terms: string[]
  routineId: string
  queryMode: string
  intentSentence: string
  executionText: string
}> = [
  {
    terms: ['냄새 때문에 너무 힘들어', '음식 냄새가 힘들어', '냄새가 너무 힘들어', '속이 울렁거려', '입덧이 심해', '토할 것 같아', '주방 냄새가 힘들어', '냄새 좀 줄여줘', '음식 냄새', '냄새', '속이 안', '입덧', '메스꺼', '울렁', '구역', '토할'],
    routineId: 'nausea_food',
    queryMode: 'nausea',
    intentSentence: '음식 냄새와 입덧 불편을 감지했습니다.',
    executionText: '네, 입덧 케어 모드를 실행할게요. 냄새가 덜 느껴지도록 공기청정기를 강하게 돌릴게요.',
  },
  {
    terms: ['왜 이렇게 잠이 안들지', '왜 이렇게 잠이 안 들지', '잠이 안 와', '잠이 잘 안 와', '오늘 잠을 못 잘 것 같아', '편하게 자고 싶어', '조용히 잠들고 싶어', '잠들기 편하게 해줘', '잠이 잘', '잠을 잘', '못 자겠', '수면', '잘 오게', '잠들'],
    routineId: 'sleep_care',
    queryMode: 'sleep',
    intentSentence: '수면 불편과 휴식 필요를 감지했습니다.',
    executionText: '네, 수면 모드를 실행할게요. 조명과 공기를 낮춰 잠들기 좋은 환경으로 바꿀게요.',
  },
  {
    terms: ['몸이 너무 무거워', '오늘 몸이 무거워', '움직이기 힘들어', '집안일이 힘들어', '청소하기 힘들어', '빨래가 부담돼', '가사 케어 해줘', '몸이 무거워서 못 움직이겠어', '빨래', '청소', '집안일', '가사', '움직이기'],
    routineId: 'housework_care',
    queryMode: 'housework',
    intentSentence: '집안일 부담과 움직임을 줄이고 싶은 의도를 감지했습니다.',
    executionText: '네, 가사 케어 모드를 실행할게요. 오늘은 무리하지 않도록 집안일 부담을 낮춰둘게요.',
  },
  {
    terms: ['시원한 바다 보고 싶어', '바다 보고 싶어', '바다에 가고 싶어', '시원한 곳으로 가고 싶어', '파도 소리 듣고 싶어', '바다 보면서 쉬고 싶어', '휴양지 느낌으로 바꿔줘', '바다', '해변', '휴양지', '시원한 분위기'],
    routineId: 'destination_ocean',
    queryMode: 'travel_ocean',
    intentSentence: '바다 휴양지 분위기로 전환하려는 의도를 감지했습니다.',
    executionText: '네, 바다 모드로 바꿀게요. 화면과 공기를 시원한 휴양지 분위기로 맞출게요.',
  },
  {
    terms: [
      '조용한 숲에 가고 싶어',
      '숲에 가고 싶어',
      '초록색 보고 싶어',
      '초록색 나무 보고 싶어',
      '자연 속에 있고 싶어',
      '조용한 곳에서 쉬고 싶어',
      '숲처럼 편하게 해줘',
      '초록빛으로 편하게 해줘',
      '숲',
      '숲 분위기',
      '숲속',
      '조용히 쉬',
      '자연',
      '나무',
      '초록',
    ],
    routineId: 'destination_forest',
    queryMode: 'travel_forest',
    intentSentence: '숲속처럼 조용한 휴식 분위기를 원하는 의도를 감지했습니다.',
    executionText: '네, 숲 모드로 바꿀게요. 고요한 나무와 초록빛 분위기로 화면, 빛, 공기를 함께 맞춰볼게요.',
  },
  {
    terms: ['도시 야경 보고 싶어', '도시 야경을 보고 싶어', '야경 보고 싶어', '밤 풍경 보고 싶어', '반짝이는 도시 보고 싶어', '호텔 라운지처럼 해줘', '창밖 야경 느낌으로 해줘', '도시', '야경', '라운지'],
    routineId: 'destination_city',
    queryMode: 'travel_city',
    intentSentence: '도시 야경 분위기로 전환하려는 의도를 감지했습니다.',
    executionText: '네, 도시 모드로 바꿀게요. 차분한 도심 라운지 분위기로 연출할게요.',
  },
]

const DAILY_CONVERSATION_INTENTS = [
  { intent: 'daily_first_step', phrases: ['오늘 뭐부터 하면 좋을까', '지금 뭐 하면 좋을까', '오늘 뭐부터 하지', '오늘 뭐라도 하나 해야 할 것 같아'], semanticHint: '오늘의 첫 행동과 우선순위 고민', reply: '오늘은 가장 부담이 적은 일부터 하나만 시작해보세요. 해야 할 일을 많이 정하기보다 몸과 마음이 편해지는 작은 루틴부터 고르는 게 좋아요.' },
  { intent: 'morning_first_step', phrases: ['아침에 뭘 먼저 하면 좋아', '아침에 뭐 해야 되지', '아침에는 뭐부터 하지', '아침 루틴 뭐가 좋아'], semanticHint: '아침에 시작할 작은 루틴 질문', reply: '아침에는 물 한 잔, 가벼운 움직임, 실내 공기 확인처럼 부담 없는 순서가 좋아요. 몸 상태를 먼저 살피고 하루 일정을 천천히 시작해보세요.' },
  { intent: 'avoid_overdoing', phrases: ['오늘 너무 무리하면 안 되겠지', '오늘 무리하지 말아야겠지', '너무 애쓰면 안 되겠지', '오늘은 쉬엄쉬엄 해야겠지'], semanticHint: '무리하지 않아도 되는지 확인', reply: '네, 오늘은 무리해서 해내는 것보다 컨디션을 지키는 게 더 중요해요. 꼭 해야 하는 일과 미뤄도 되는 일을 나눠보면 부담이 줄어듭니다.' },
  { intent: 'good_start', phrases: ['오늘 기분 좋게 시작하고 싶어', '하루를 좋게 시작하고 싶어', '기분 좋은 아침으로 시작하고 싶어', '오늘 분위기 좋게 시작하고 싶어'], semanticHint: '하루를 기분 좋게 시작하고 싶은 마음', reply: '좋아요. 오늘은 조용한 음악이나 따뜻한 조명처럼 작은 분위기 변화부터 시작해보세요. 하루의 첫 느낌을 편안하게 만드는 게 도움이 됩니다.' },
  { intent: 'water_amount', phrases: ['물을 얼마나 마시면 좋을까', '물은 얼마나 마셔야 해', '물을 많이 마셔야 할까', '수분은 어떻게 챙기면 좋아'], semanticHint: '수분 섭취 방식 질문', reply: '한 번에 많이 마시기보다 조금씩 자주 마시는 방식이 좋아요. 몸 상태나 의료진 안내에 따라 달라질 수 있으니, 불편함이 있으면 상담을 받아보세요.' },
  { intent: 'breakfast_need', phrases: ['아침을 꼭 먹어야 해', '아침밥 꼭 먹어야 할까', '아침 못 먹겠어', '아침은 안 먹어도 될까'], semanticHint: '아침 식사 부담 질문', reply: '꼭 많이 먹을 필요는 없어요. 부담이 된다면 가볍고 편한 음식부터 조금씩 시작해보세요. 속이 불편하면 억지로 먹기보다 쉬운 선택이 좋습니다.' },
  { intent: 'snack_ok', phrases: ['간식 먹어도 될까', '간식 먹어도 괜찮아', '뭐 좀 먹어도 될까', '간단히 먹어도 돼'], semanticHint: '간식 섭취 질문', reply: '괜찮아요. 다만 너무 자극적인 것보다는 속이 편하고 부담이 적은 간식을 고르는 게 좋아요. 몸이 보내는 신호를 보면서 천천히 드세요.' },
  { intent: 'coffee_ok', phrases: ['커피 마셔도 될까', '커피 먹어도 돼', '카페인 괜찮을까', '커피가 마시고 싶어'], semanticHint: '커피와 카페인 질문', reply: '카페인은 개인 상황에 따라 조절이 필요해요. 마시고 싶다면 양을 줄이고, 걱정되면 의료진 안내를 기준으로 정하는 게 가장 안전합니다.' },
  { intent: 'walk_ok', phrases: ['오늘 산책해도 될까', '산책 나가도 될까', '가볍게 걸어도 될까', '밖에 잠깐 걸어도 괜찮을까'], semanticHint: '가벼운 산책 가능 여부', reply: '몸이 괜찮다면 짧고 가벼운 산책은 기분 전환에 도움이 될 수 있어요. 다만 어지럽거나 불편하면 바로 쉬는 게 좋아요.' },
  { intent: 'exercise_ok', phrases: ['운동해도 괜찮을까', '운동해도 될까', '가벼운 운동 괜찮아', '오늘 운동해도 돼'], semanticHint: '운동 가능 여부', reply: '가벼운 움직임은 도움이 될 수 있지만, 무리한 운동은 피하는 게 좋아요. 개인 상태에 따라 다르니 불편감이 있으면 의료진과 먼저 상의하세요.' },
  { intent: 'rest_ok', phrases: ['오늘 쉬어도 될까', '그냥 쉬어도 돼', '오늘은 쉬고 싶어', '아무것도 안 해도 될까'], semanticHint: '쉬어도 되는지 확인', reply: '네, 쉬어도 괜찮아요. 쉬는 것도 오늘을 잘 보내기 위한 중요한 선택이에요. 몸이 보내는 신호를 먼저 들어주세요.' },
  { intent: 'strange_mood', phrases: ['기분이 좀 이상해', '오늘 기분이 이상해', '마음이 이상해', '감정이 이상하게 느껴져'], semanticHint: '설명하기 어려운 감정 변화', reply: '그럴 수 있어요. 오늘은 감정을 억지로 바꾸려고 하기보다 조용히 정리할 시간을 가져보세요. 잠깐 쉬고 천천히 호흡하는 것도 도움이 됩니다.' },
  { intent: 'anxiety', phrases: ['괜히 불안해', '이유 없이 불안해', '불안한 마음이 들어', '마음이 불안해'], semanticHint: '불안한 감정 표현', reply: '불안할 때는 해야 할 일을 줄이고 지금 할 수 있는 작은 행동 하나에 집중해보세요. 불안이 오래가거나 힘들면 주변 사람이나 전문가에게 도움을 요청해도 좋아요.' },
  { intent: 'busy_mind', phrases: ['마음이 복잡해', '생각이 너무 많아', '머릿속이 복잡해', '마음 정리가 안 돼'], semanticHint: '생각이 많고 마음이 복잡함', reply: '지금은 생각을 정리하려고 애쓰기보다 잠깐 멈추는 시간이 필요할 수 있어요. 따뜻한 물을 마시고, 오늘 꼭 해야 하는 일 하나만 정해보세요.' },
  { intent: 'sensitive_day', phrases: ['나 좀 예민한 것 같아', '오늘 예민한 것 같아', '괜히 예민해', '작은 일에도 예민해져'], semanticHint: '예민함과 자극 부담', reply: '예민하게 느껴지는 날도 자연스러울 수 있어요. 오늘은 자극을 줄이고 조용한 환경을 만드는 쪽으로 하루를 보내보세요.' },
  { intent: 'focus_hard', phrases: ['오늘 집중이 안 돼', '집중이 잘 안 돼', '일에 집중이 안 돼', '뭘 해도 집중이 안 돼'], semanticHint: '집중이 어려운 상태', reply: '집중이 안 되는 날에는 긴 시간을 잡기보다 10분 단위로 작게 나눠보세요. 끝내야 한다는 부담보다 시작만 해보는 게 좋아요.' },
  { intent: 'too_many_tasks', phrases: ['해야 할 게 많은데 부담돼', '할 일이 너무 많아', '해야 할 일이 많아서 힘들어', '뭐부터 해야 할지 모르겠어'], semanticHint: '할 일이 많아 부담스러움', reply: '오늘 할 일을 세 가지 이하로 줄여보세요. 꼭 해야 하는 것, 부탁할 수 있는 것, 미뤄도 되는 것을 나누면 마음이 훨씬 가벼워집니다.' },
  { intent: 'ask_husband_help', phrases: ['남편한테 뭐 부탁하지', '남편한테 뭐 부탁해야 할지 모르겠어', '남편에게 뭘 부탁하면 좋을까', '배우자에게 뭐 부탁하지'], semanticHint: '남편이나 배우자에게 부탁할 일 고민', reply: '구체적으로 부탁하면 서로 부담이 줄어들어요. 예를 들어 냄새 나는 정리, 무거운 물건 옮기기, 저녁 준비 같은 바로 할 수 있는 일부터 말해보세요.' },
  { intent: 'what_to_tell_wife', phrases: ['아내한테 뭐라고 말하면 좋을까', '아내에게 뭐라고 하지', '아내한테 어떻게 말하지', '아내를 어떻게 도와줄까'], semanticHint: '남편 역할에서 아내에게 건넬 말과 행동 고민', reply: '상태를 캐묻기보다 “내가 먼저 해둘게”처럼 행동이 담긴 말을 해보세요. 작은 준비가 말보다 더 편안하게 느껴질 수 있습니다.' },
  { intent: 'dinner_menu', phrases: ['오늘 저녁 뭐 먹지', '저녁 뭐 먹을까', '저녁 메뉴 뭐가 좋을까', '오늘 뭐 먹으면 좋을까'], semanticHint: '저녁 메뉴 고민', reply: '오늘은 부담이 적고 속이 편한 메뉴를 먼저 생각해보세요. 냄새가 강하거나 준비가 오래 걸리는 음식은 피하는 것도 좋아요.' },
  { intent: 'cooking_tired', phrases: ['밥 하기 귀찮아', '밥 차리기 귀찮아', '요리하기 귀찮아', '오늘 밥하기 싫어'], semanticHint: '식사 준비가 부담스러움', reply: '그럴 땐 간단한 식사나 준비가 적은 메뉴로 바꿔도 괜찮아요. 오늘은 완벽한 식사보다 편하게 먹을 수 있는 선택이 더 중요합니다.' },
  { intent: 'fridge_cleanup', phrases: ['냉장고 정리해야 하는데 귀찮아', '냉장고 정리 귀찮아', '냉장고 치워야 하는데 싫어', '냉장고를 정리해야 해'], semanticHint: '냉장고 정리 부담', reply: '한 번에 다 하려고 하지 말고 한 칸만 정리해보세요. 냄새가 날 수 있는 음식부터 정리하면 집안 공기도 조금 더 편해질 수 있어요.' },
  { intent: 'messy_house', phrases: ['집이 좀 어수선해', '집이 어지러워 보여', '집안이 정신없어', '집이 지저분해 보여'], semanticHint: '집안 어수선함 부담', reply: '전체를 치우려고 하면 부담이 커질 수 있어요. 눈에 가장 많이 보이는 공간 하나만 정리해도 훨씬 안정감이 생깁니다.' },
  { intent: 'laundry_today', phrases: ['오늘 빨래 해야 하나', '빨래 오늘 해야 할까', '빨래 미뤄도 될까', '빨래가 쌓였어'], semanticHint: '빨래를 해야 할지 고민', reply: '꼭 오늘 해야 하는 양이 아니라면 나눠서 해도 괜찮아요. 무리하지 않도록 작은 양부터 처리하거나 도움을 요청해보세요.' },
  { intent: 'cleaning_when', phrases: ['청소 언제 하지', '청소는 언제 하면 좋을까', '언제 청소하지', '청소할 타이밍을 모르겠어'], semanticHint: '청소 시점 고민', reply: '컨디션이 괜찮은 짧은 시간에 한 구역만 정리하는 게 좋아요. 무리해서 한 번에 끝내기보다 나눠서 하는 게 부담을 줄입니다.' },
  { intent: 'nap_ok', phrases: ['잠깐 낮잠 자도 될까', '낮잠 자도 괜찮을까', '잠깐 자도 돼', '낮에 조금 자도 될까'], semanticHint: '짧은 낮잠 가능 여부', reply: '짧은 낮잠은 피로를 줄이는 데 도움이 될 수 있어요. 너무 길게 자서 밤잠이 방해되지 않도록 시간을 가볍게 정해보세요.' },
  { intent: 'sleep_tonight', phrases: ['오늘 밤 잘 잘 수 있을까', '오늘 잘 잘 수 있을까', '밤에 잘 수 있을까', '오늘 잠이 올까'], semanticHint: '밤잠 걱정', reply: '잠들기 전에는 밝은 화면과 자극적인 활동을 줄여보세요. 조용한 분위기와 일정한 수면 루틴이 도움이 될 수 있습니다.' },
  { intent: 'before_sleep', phrases: ['잠들기 전에 뭐 하면 좋아', '자기 전에 뭐 하지', '잠자기 전에 뭐가 좋아', '잠들기 전 루틴 알려줘'], semanticHint: '잠들기 전 루틴 질문', reply: '따뜻한 물, 조용한 조명, 가벼운 정리처럼 몸을 천천히 쉬게 하는 행동이 좋아요. 잠을 억지로 부르기보다 편안한 환경을 먼저 만들어보세요.' },
  { intent: 'morning_tired', phrases: ['아침에 너무 피곤해', '아침부터 피곤해', '일어나도 피곤해', '아침 피로가 심해'], semanticHint: '아침 피로감', reply: '아침 피로가 심한 날에는 바로 움직이기보다 천천히 몸을 깨우는 게 좋아요. 오늘 일정은 조금 여유 있게 조정해보세요.' },
  { intent: 'go_out_ok', phrases: ['오늘 밖에 나가도 될까', '외출해도 될까', '잠깐 나갔다 와도 될까', '밖에 나가고 싶어'], semanticHint: '외출 가능 여부', reply: '컨디션이 괜찮다면 짧게 다녀오는 건 기분 전환이 될 수 있어요. 다만 피로하거나 불편하면 가까운 곳만 다녀오거나 쉬는 선택도 괜찮습니다.' },
  { intent: 'outing_prep', phrases: ['외출 준비 뭐부터 하지', '나가기 전에 뭐 챙기지', '외출할 때 뭐 챙겨', '밖에 나가기 전 준비 알려줘'], semanticHint: '외출 준비 순서', reply: '먼저 물, 편한 신발, 필요한 물건을 챙겨보세요. 외출 시간은 길게 잡기보다 중간에 쉴 수 있게 여유를 두는 게 좋아요.' },
  { intent: 'hospital_prep', phrases: ['병원 갈 준비 뭐 해야 해', '병원 가기 전에 뭐 챙겨', '병원 갈 때 뭐 챙기지', '진료 전에 뭐 준비해'], semanticHint: '병원 방문 준비물과 질문 정리', reply: '예약 시간, 신분증, 필요한 기록이나 질문 목록을 먼저 확인해보세요. 궁금한 점은 미리 메모해두면 진료 때 놓치지 않을 수 있어요.' },
  { intent: 'hospital_day', phrases: ['오늘 병원 가는 날이야', '오늘 진료 있는 날이야', '병원 다녀와야 해', '오늘 검진 가야 해'], semanticHint: '병원 방문 당일 일정', reply: '좋아요. 오늘은 이동 시간을 여유 있게 잡고, 궁금한 점을 짧게 메모해보세요. 다녀온 뒤에는 바로 쉴 수 있게 일정을 비워두는 것도 좋습니다.' },
  { intent: 'ultrasound_organize', phrases: ['초음파 사진 정리하고 싶어', '초음파 사진 어떻게 정리하지', '아기 사진 정리하고 싶어', '초음파 기록 남기고 싶어'], semanticHint: '초음파 사진과 기록 정리', reply: '사진을 날짜별로 저장해두면 나중에 보기 좋아요. 오늘 느낀 감정이나 기억나는 말을 한 줄만 함께 남겨도 좋은 기록이 됩니다.' },
  { intent: 'daily_record', phrases: ['오늘 기록 남길까', '오늘 일기 쓸까', '오늘 기록하고 싶어', '기록을 남기면 좋을까'], semanticHint: '오늘의 기록 남기기', reply: '좋아요. 길게 쓰지 않아도 괜찮아요. 오늘의 기분, 몸 상태, 기억하고 싶은 순간 하나만 남겨도 충분히 의미 있는 기록이 됩니다.' },
  { intent: 'prenatal_activity', phrases: ['태교는 뭐 하면 좋아', '태교 뭐가 좋을까', '태교를 어떻게 시작하지', '아기한테 뭐 해주면 좋을까'], semanticHint: '부담 없는 태교 활동', reply: '거창한 활동보다 편안한 마음으로 할 수 있는 것이 좋아요. 좋아하는 음악을 듣거나 짧게 말을 건네는 것처럼 부담 없는 방식부터 시작해보세요.' },
  { intent: 'what_to_listen', phrases: ['오늘 뭐 들으면 좋을까', '무슨 음악 들을까', '오늘 들을 만한 거 추천해줘', '차분한 소리 뭐가 좋을까'], semanticHint: '들을 음악이나 소리 추천', reply: '차분한 음악이나 자연 소리처럼 자극이 적은 소리가 좋아요. 지금 기분에 맞춰 편안하게 들을 수 있는 것을 선택해보세요.' },
  { intent: 'bored', phrases: ['조금 심심해', '심심해', '뭐 하면 덜 심심할까', '할 게 없어서 심심해'], semanticHint: '심심함과 가벼운 활동 추천', reply: '심심할 땐 부담 없는 작은 활동이 좋아요. 짧은 산책, 음악 듣기, 사진 정리, 오늘의 기록 남기기 중 하나를 골라보세요.' },
  { intent: 'day_will_go_well', phrases: ['오늘 하루 잘 보낼 수 있을까', '오늘 괜찮게 보낼 수 있을까', '오늘 잘 지나갈까', '하루를 잘 보낼 수 있을까'], semanticHint: '하루를 잘 보낼 수 있을지 걱정', reply: '충분히 그럴 수 있어요. 오늘은 많은 걸 해내는 날보다 나에게 맞는 속도를 찾는 날로 생각해보세요.' },
  { intent: 'doing_well', phrases: ['나 잘하고 있는 걸까', '나 오늘 잘하고 있는지 모르겠어', '내가 잘하고 있는 걸까', '잘하고 있는지 모르겠어'], semanticHint: '자기 확신과 격려 필요', reply: '네, 이미 충분히 잘하고 있어요. 매일 완벽할 필요는 없고, 오늘의 몸과 마음을 살피는 것만으로도 잘해내고 있는 거예요.' },
  { intent: 'worried', phrases: ['조금 걱정돼', '걱정이 돼', '괜히 걱정돼', '걱정이 커져'], semanticHint: '걱정과 확인 욕구', reply: '걱정이 들 때는 혼자 오래 붙잡고 있기보다 확인할 수 있는 것과 기다려야 하는 것을 나눠보세요. 불편한 증상이 있거나 걱정이 크면 의료진에게 문의하는 게 안전합니다.' },
  { intent: 'belly_discomfort', phrases: ['배가 불편해', '배가 좀 이상해', '배가 아픈 것 같아', '복부가 불편해'], semanticHint: '배 또는 복부 불편감', reply: '불편감이 있으면 우선 무리하지 말고 편한 자세로 쉬어보세요. 통증이 심하거나 평소와 다르게 느껴지면 의료진에게 문의하는 것이 안전합니다.' },
  { intent: 'headache', phrases: ['머리가 아파', '두통이 있어', '머리가 지끈거려', '머리가 너무 아파'], semanticHint: '두통 호소', reply: '우선 물을 마시고 조용한 곳에서 쉬어보세요. 두통이 심하거나 오래 지속되면 임의로 참기보다 의료진에게 확인하는 것이 좋습니다.' },
  { intent: 'dizzy', phrases: ['어지러워', '어지러운 느낌이야', '현기증이 나', '머리가 핑 돌아'], semanticHint: '어지러움과 현기증', reply: '어지러우면 바로 앉거나 누워서 쉬어주세요. 증상이 계속되거나 심하면 주변 사람에게 알리고 의료진과 상담하는 것이 안전합니다.' },
  { intent: 'short_breath', phrases: ['숨이 좀 답답해', '숨쉬기가 답답해', '호흡이 답답해', '숨이 차는 것 같아'], semanticHint: '호흡 답답함', reply: '숨이 답답하면 먼저 편한 자세로 쉬고, 주변 공기를 쾌적하게 해보세요. 답답함이 심하거나 지속되면 바로 의료진에게 문의하세요.' },
  { intent: 'too_hot', phrases: ['오늘 너무 더워', '너무 더운 것 같아', '몸이 더워', '더워서 힘들어'], semanticHint: '더위와 온열 부담', reply: '더운 날에는 무리한 활동을 줄이고 물을 조금씩 자주 마시는 게 좋아요. 실내 온도와 공기를 편하게 맞추는 것도 도움이 됩니다.' },
  { intent: 'too_cold', phrases: ['오늘 너무 추워', '몸이 추워', '추워서 힘들어', '몸이 차가운 것 같아'], semanticHint: '추위와 몸이 차가운 느낌', reply: '몸이 차갑게 느껴지면 따뜻한 옷이나 담요로 먼저 편하게 해보세요. 갑자기 컨디션이 떨어지는 느낌이 있다면 무리하지 말고 쉬는 게 좋아요.' },
  { intent: 'kind_words', phrases: ['기분 좋은 말 해줘', '좋은 말 해줘', '따뜻한 말 해줘', '나한테 좋은 말 해줘'], semanticHint: '따뜻한 말과 격려 요청', reply: '오늘의 속도가 느려도 괜찮아요. 지금처럼 몸과 마음을 살피며 하루를 보내는 것만으로도 충분히 잘하고 있어요.' },
  { intent: 'cheer_me', phrases: ['응원해줘', '나 좀 응원해줘', '힘나는 말 해줘', '용기 좀 줘'], semanticHint: '응원 요청', reply: '잘하고 있어요. 오늘은 완벽하게 해내는 것보다 편안하게 지나가는 하루를 만드는 게 더 중요해요. 천천히 가도 괜찮습니다.' },
  { intent: 'small_goal', phrases: ['오늘의 작은 목표 정해줘', '작은 목표 정해줘', '오늘 목표 하나만 정해줘', '오늘 뭐 하나만 해볼까'], semanticHint: '오늘의 작은 목표 요청', reply: '오늘의 작은 목표는 몸을 편하게 하는 행동 하나만 실천하는 거예요. 물 마시기, 10분 쉬기, 집안 공기 편하게 하기 중 하나만 골라도 충분합니다.' },
] as const

const SAFETY_MEDICAL_REPLY =
  '의료 위험 신호일 수 있어요. 지금 증상이 심하거나 평소와 다르다면 바로 보호자에게 알리고 병원이나 119에 직접 연락해주세요.'

const OUT_OF_SCOPE_REPLY =
  '죄송해요. 저는 임신 준비와 임신 중 생활 케어, 그리고 집 안 환경 제어를 돕는 AI라 해당 질문에는 답변하기 어려워요. 컨디션, 휴식, 수면, 식사, 병원 준비, 집안 환경에 대해 물어봐 주세요.'

const UNKNOWN_REPLY =
  '제가 정확히 이해하지 못했어요. 컨디션, 수면, 식사, 휴식, 병원 준비처럼 생활 케어와 관련해서 다시 말씀해 주세요.'

const SAFETY_MEDICAL_TERMS = [
  '배가 너무 아파',
  '배가 심하게 아파',
  '복통이 심해',
  '출혈이 있어',
  '피가 나',
  '피가 나와',
  '숨이 너무 답답해',
  '숨쉬기 힘들어',
  '숨쉬기가 너무 힘들어',
  '호흡이 너무 답답해',
  '어지러워서 쓰러질 것 같아',
  '쓰러질 것 같아',
  '통증이 심해',
  '갑자기 너무 아파',
  '진통이 심해',
  '의식을 잃을 것 같아',
  '움직이기 힘들 정도로 아파',
  '너무 아파',
  '태동이 이상한 것 같아',
  '태동이 줄었어',
  '태동이 안 느껴져',
]

const OUT_OF_SCOPE_TERMS = [
  '주식 추천',
  '주식 뭐 사',
  '주식 사도 돼',
  '코인 추천',
  '정치',
  '선거',
  '대통령',
  '연예인',
  '축구 결과',
  '야구 결과',
  '스포츠 결과',
  '코딩',
  '개발 질문',
  '프로그래밍',
  '게임 공략',
  '성적인',
  '야한',
  '폭력',
  '때리는 방법',
  '죽이는 방법',
  '농담해줘',
  '웃긴 얘기 해줘',
  '뉴스 알려줘',
  '오늘 뉴스',
  '실시간 뉴스',
  '오늘 날씨',
  '내일 날씨',
  '비 와',
  '검색해줘',
]

const KOREAN_DIGITS = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

function normalizeText(text: string) {
  let normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.,!?~。！？'"“”‘’()[\]{}<>:;·…，]/g, '')
    .replace(/[0-9]/g, (digit) => KOREAN_DIGITS[Number(digit)] || digit)
    .replace(/\s+/g, '')
    .replace(/^(하이마더야|하이마더|헤이마더야|헤이마더|마더야|마더)/, '')
    .replace(/^(저기|있잖아|혹시|음|어|아|그)/, '')
    .replace(/좀/g, '')
    .replace(/제발/g, '')
    .replace(/해주세요/g, '해줘')
    .replace(/해줘요/g, '해줘')
    .replace(/해줄래/g, '해줘')
    .replace(/해줄수있어/g, '해줘')
    .replace(/해줄수있니/g, '해줘')
    .replace(/해줘봐/g, '해줘')
    .replace(/켜주세요/g, '켜줘')
    .replace(/켜줘요/g, '켜줘')
    .replace(/꺼주세요/g, '꺼줘')
    .replace(/꺼줘요/g, '꺼줘')
    .replace(/보고싶어요/g, '보고싶어')
    .replace(/싶어요/g, '싶어')
    .replace(/보여주세요/g, '보여줘')
    .replace(/보여줘요/g, '보여줘')
    .replace(/공청기/g, '공기청정기')
    .replace(/공청끼/g, '공기청정기')
    .replace(/공청키/g, '공기청정기')
    .replace(/공기청정끼/g, '공기청정기')
    .replace(/공기청정키/g, '공기청정기')
    .replace(/공기청정긴/g, '공기청정기')
    .replace(/굳모닝/g, '굿모닝')
    .replace(/굿모닝이야/g, '굿모닝')
    .replace(/군모닝/g, '굿모닝')
    .replace(/냄세/g, '냄새')
    .replace(/냄새가/g, '냄새')
    .replace(/냄새때매/g, '냄새때문에')
    .replace(/입덧이/g, '입덧')
    .replace(/울렁거려요/g, '울렁거려')
    .replace(/울렁거림/g, '울렁거려')
    .replace(/메스꺼워요/g, '메스꺼워')
    .replace(/토할거같아/g, '토할것같아')
    .replace(/잠좀/g, '잠')
    .replace(/불끄고/g, '불끄고')
    .replace(/초록색/g, '초록')
    .replace(/초록빛/g, '초록')
    .replace(/야경을/g, '야경')

  normalized = normalized
    .replace(/(으로|로|을|를|이|가|은|는|에|에서|에게|한테|하고|랑|와|과|도|만|요)$/g, '')

  return normalized
}

function getBigrams(value: string) {
  if (value.length <= 1) return [value]
  const result: string[] = []
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2))
  }
  return result
}

function diceSimilarity(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  const aBigrams = getBigrams(a)
  const bBigrams = getBigrams(b)
  const used = new Array(bBigrams.length).fill(false)
  let hits = 0

  for (const item of aBigrams) {
    const index = bBigrams.findIndex((candidate, candidateIndex) => !used[candidateIndex] && candidate === item)
    if (index >= 0) {
      used[index] = true
      hits += 1
    }
  }

  return (2 * hits) / (aBigrams.length + bBigrams.length)
}

function editDistance(a: string, b: string) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let aIndex = 1; aIndex <= a.length; aIndex += 1) {
    const current = [aIndex]
    for (let bIndex = 1; bIndex <= b.length; bIndex += 1) {
      const cost = a[aIndex - 1] === b[bIndex - 1] ? 0 : 1
      current[bIndex] = Math.min(
        previous[bIndex] + 1,
        current[bIndex - 1] + 1,
        previous[bIndex - 1] + cost,
      )
    }
    previous = current
  }
  return previous[b.length]
}

function editSimilarity(a: string, b: string) {
  const longest = Math.max(a.length, b.length)
  if (longest === 0) return 1
  return 1 - editDistance(a, b) / longest
}

function scoreTerm(text: string, term: string) {
  const normalizedTerm = normalizeText(term)
  if (!text || !normalizedTerm) return 0
  if (text === normalizedTerm) return 1
  if (text.includes(normalizedTerm)) return normalizedTerm.length >= 2 ? 0.96 : 0
  if (normalizedTerm.includes(text) && text.length >= 3) return 0.78
  if (text.length < 3 || normalizedTerm.length < 3) return 0
  return Math.max(diceSimilarity(text, normalizedTerm), editSimilarity(text, normalizedTerm))
}

function bestTermMatch(text: string, terms: readonly string[]) {
  return terms.reduce(
    (best, term) => {
      const score = scoreTerm(text, term)
      return score > best.score ? { term, score } : best
    },
    { term: '', score: 0 },
  )
}

function includesAny(text: string, terms: readonly string[], threshold = 0.68) {
  return bestTermMatch(text, terms).score >= threshold
}

function findBestRule<T extends { terms: string[] }>(text: string, rules: T[], threshold = 0.68) {
  const best = rules.reduce(
    (current, rule) => {
      const match = bestTermMatch(text, rule.terms)
      return match.score > current.score ? { rule, score: match.score } : current
    },
    { rule: null as T | null, score: 0 },
  )
  return best.score >= threshold ? best.rule : null
}

function findBestRuleMatch<T extends { terms: string[] }>(text: string, rules: T[], threshold = 0.68) {
  const best = rules.reduce(
    (current, rule) => {
      const match = bestTermMatch(text, rule.terms)
      return match.score > current.score ? { rule, score: match.score } : current
    },
    { rule: null as T | null, score: 0 },
  )
  return best.score >= threshold ? best : null
}

function findBestCareRule(text: string, body: VoiceIntentRequest, threshold = 0.64) {
  if (body.allowAllCareModes) {
    const prepMatch = findBestRuleMatch(text, PREPARING_RULES, threshold)
    const pregnantMatch = findBestRuleMatch(text, PREGNANT_RULES, threshold)

    if (prepMatch && (!pregnantMatch || prepMatch.score >= pregnantMatch.score)) {
      return { kind: 'preparing' as const, rule: prepMatch.rule }
    }
    if (pregnantMatch) return { kind: 'pregnant' as const, rule: pregnantMatch.rule }
    return null
  }

  if (body.pregnancyStatus === 'preparing') {
    const prepRule = findBestRule(text, PREPARING_RULES, threshold)
    if (prepRule) return { kind: 'preparing' as const, rule: prepRule }
  }

  const pregnantRule = findBestRule(text, PREGNANT_RULES, threshold)
  if (pregnantRule) return { kind: 'pregnant' as const, rule: pregnantRule }

  return null
}

function buildCareRuleResponse(
  rawText: string,
  match: ReturnType<typeof findBestCareRule>,
): VoiceIntentResponse | null {
  if (!match) return null

  if (match.kind === 'preparing') {
    const rule = match.rule
    if (!rule) return null
    return {
      success: true,
      transcript: rawText,
      intentSentence: rule.intentSentence,
      executionText: rule.executionText,
      ttsText: rule.executionText,
      routineId: rule.routineId,
      preparationMode: rule.preparationMode,
      queryMode: 'pregnancy-prep',
      source: 'keyword',
    }
  }

  const rule = match.rule
  if (!rule) return null
  return {
    success: true,
    transcript: rawText,
    intentSentence: rule.intentSentence,
    executionText: rule.executionText,
    ttsText: rule.executionText,
    routineId: rule.routineId,
    preparationMode: null,
    queryMode: rule.queryMode,
    source: 'keyword',
  }
}

function wantsAirOff(text: string) {
  return text.includes('공기청정기') && (
    text.includes('꺼') ||
    text.includes('끄') ||
    text.includes('오프') ||
    text.includes('정지')
  )
}

function wantsAirOn(text: string) {
  return text.includes('공기청정기') && (
    text.includes('켜') ||
    text.includes('온') ||
    text.includes('깨끗') ||
    text.includes('좋아지') ||
    text.includes('탁해') ||
    text.includes('상쾌')
  )
}

function wantsLightOff(text: string) {
  return /(전구|조명|거실조명|거실 조명)/.test(text) && (
    text.includes('꺼') ||
    text.includes('끄') ||
    text.includes('오프') ||
    text.includes('정지')
  )
}

function wantsLightOn(text: string) {
  return /(전구|조명|거실조명|거실 조명)/.test(text) && (
    text.includes('켜') ||
    text.includes('온')
  )
}

function getKoreaDateText() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

function getKoreaTimeText() {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date())
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? ''
  const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
  const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
  return `지금은 ${dayPeriod} ${hour}시 ${minute}분이에요.`
}

function buildMorningResponse(body: VoiceIntentRequest, text: string): VoiceIntentResponse {
  const role = body.role === 'husband' ? 'husband' : 'wife'
  const status = body.pregnancyStatus === 'preparing' ? 'preparing' : 'pregnant'
  const message = getHomeCareMessage({ pregnancyStatus: status, role })
  const contextHint =
    role === 'wife' && status === 'pregnant' && body.pregnancyWeek
      ? ` 현재 ${body.pregnancyWeek}주차 흐름을 참고하되, 오늘 몸이 편한 선택부터 우선할게요.`
      : ''
  const executionText = `좋은 아침이에요. ${message.cheer}${contextHint}`

  return {
    success: true,
    transcript: text,
    intentSentence: '아침 인사와 오늘의 한마디 요청을 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'morning',
    source: 'keyword',
  }
}

function buildDefaultModeResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 기본 모드로 돌아갈게요. 가전은 차분한 기본 상태로 유지할게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '초기 기본모드로 복귀하려는 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    defaultMode: true,
    source: 'keyword',
  }
}

function buildAirOffResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 공기청정기를 끌게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '공기청정기 전원 끄기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    airPowerOff: true,
    deviceAction: 'off',
    source: 'keyword',
  }
}

function buildAirOnResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 공기청정기를 켤게요.'
  return {
    success: true,
    transcript: text,
    intentSentence: '공기청정기 전원 켜기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: 'default',
    airPowerOn: true,
    deviceAction: 'on',
    source: 'keyword',
  }
}

function matchDailyConversation(text: string) {
  const best = DAILY_CONVERSATION_INTENTS.reduce(
    (current, intent) => {
      const match = bestTermMatch(text, intent.phrases)
      return match.score > current.score ? { intent, score: match.score } : current
    },
    { intent: null as (typeof DAILY_CONVERSATION_INTENTS)[number] | null, score: 0 },
  )
  return best.score >= 0.72 ? best.intent : null
}

function buildLightOffResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 거실 전구를 끌게요.'
  return {
    success: true,
    type: 'device_control',
    intent: 'light_off',
    transcript: text,
    userText: text,
    understoodText: '거실 전구 전원 끄기 요청으로 이해했습니다.',
    reply: executionText,
    intentSentence: '거실 전구 전원 끄기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    lightPowerOff: true,
    lightAction: 'off',
    source: 'keyword',
  }
}

function buildLightOnResponse(text: string): VoiceIntentResponse {
  const executionText = '네, 거실 전구를 켤게요.'
  return {
    success: true,
    type: 'device_control',
    intent: 'light_on',
    transcript: text,
    userText: text,
    understoodText: '거실 전구 전원 켜기 요청으로 이해했습니다.',
    reply: executionText,
    intentSentence: '거실 전구 전원 켜기 의도를 감지했습니다.',
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    lightPowerOn: true,
    lightAction: 'on',
    source: 'keyword',
  }
}

function buildDailyConversationResponse(
  text: string,
  conversation: (typeof DAILY_CONVERSATION_INTENTS)[number],
  source: VoiceIntentResponse['source'] = 'keyword',
): VoiceIntentResponse {
  return {
    success: true,
    type: 'conversation_only',
    intent: conversation.intent,
    transcript: text,
    userText: text,
    understoodText: conversation.semanticHint || '일상 질문으로 이해했습니다.',
    reply: conversation.reply,
    intentSentence: conversation.semanticHint || '일상 질문으로 이해했습니다.',
    executionText: conversation.reply,
    ttsText: conversation.reply,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    actionType: 'conversation_only',
    source,
  }
}

function buildOpenAIConversationResponse(
  text: string,
  understoodText: string | undefined,
  reply: string | undefined,
): VoiceIntentResponse | null {
  const safeReply = reply?.trim()
  if (!safeReply) return null
  return {
    success: true,
    type: 'conversation_only',
    intent: 'openai_daily_conversation',
    transcript: text,
    userText: text,
    understoodText: understoodText?.trim() || '일상 질문으로 이해했습니다.',
    reply: safeReply,
    intentSentence: understoodText?.trim() || '일상 질문으로 이해했습니다.',
    executionText: safeReply,
    ttsText: safeReply,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    actionType: 'conversation_only',
    source: 'openai',
  }
}

function buildTextOnlyResponse(
  text: string,
  type: 'conversation_only' | 'safety_medical' | 'out_of_scope' | 'unknown',
  intentSentence: string,
  executionText: string,
  source: VoiceIntentResponse['source'] = 'keyword',
  intent: string = type,
): VoiceIntentResponse {
  return {
    success: true,
    type,
    intent,
    transcript: text,
    userText: text,
    understoodText: intentSentence,
    reply: executionText,
    intentSentence,
    executionText,
    ttsText: executionText,
    routineId: null,
    preparationMode: null,
    queryMode: null,
    ...(type === 'conversation_only' ? { actionType: 'conversation_only' as const } : {}),
    source,
  }
}

function getIntentCandidateTexts(body: VoiceIntentRequest) {
  const values = [
    body.text,
    ...(Array.isArray(body.alternatives) ? body.alternatives : []),
  ]

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  ).slice(0, 8)
}

function withPrimaryTranscript(
  result: VoiceIntentResponse,
  primaryText: string,
  matchedText: string,
): VoiceIntentResponse {
  if (primaryText === matchedText) return result

  return {
    ...result,
    transcript: primaryText,
    userText: result.userText ? primaryText : result.userText,
    understoodText: result.understoodText ?? result.intentSentence,
  }
}

function routineKeywordRoute(body: VoiceIntentRequest): VoiceIntentResponse | null {
  const rawText = body.text?.trim() ?? ''
  const text = normalizeText(rawText)

  if (!text) return null

  const careRuleResponse = buildCareRuleResponse(rawText, findBestCareRule(text, body, 0.64))
  if (careRuleResponse) return careRuleResponse

  if (includesAny(text, ['좋은 아침이야', '좋은 아침', '좋은아침', '굿모닝', '아침이야', '오늘 시작해줘'], 0.64)) {
    return buildMorningResponse(body, rawText)
  }

  return null
}

function keywordRoute(body: VoiceIntentRequest): VoiceIntentResponse | null {
  const rawText = body.text?.trim() ?? ''
  const text = normalizeText(rawText)

  if (!text) return null
  if (includesAny(text, SAFETY_MEDICAL_TERMS, 0.72)) {
    return buildTextOnlyResponse(
      rawText,
      'safety_medical',
      '의료 위험 신호 가능성이 있는 발화로 이해했습니다.',
      SAFETY_MEDICAL_REPLY,
    )
  }
  if (includesAny(text, ['기본 모드로 바꿔줘', '기본 모드', '기본모드', '기본으로 돌아가', '처음 화면으로 돌아가', '처음으로', '원래대로', '원래대로 해줘', '초기화해줘', '초기 상태로 돌아가'], 0.64)) return buildDefaultModeResponse(rawText)
  if (wantsLightOff(text)) return buildLightOffResponse(rawText)
  if (wantsLightOn(text)) return buildLightOnResponse(rawText)
  if (includesAny(text, ['전구 꺼줘', '전구 꺼', '전구 꺼 줘', '전구 꺼주세요', '전구 꺼 줘요', '조명 꺼줘', '조명 꺼', '조명 꺼 줘', '거실 조명 꺼줘', '거실조명 꺼줘'], 0.82)) return buildLightOffResponse(rawText)
  if (includesAny(text, ['전구 켜줘', '전구 켜', '전구 켜 줘', '전구 켜주세요', '전구 켜 줘요', '조명 켜줘', '조명 켜', '조명 켜 줘', '거실 조명 켜줘', '거실조명 켜줘'], 0.82)) return buildLightOnResponse(rawText)
  if (wantsAirOff(text)) return buildAirOffResponse(rawText)
  if (wantsAirOn(text)) return buildAirOnResponse(rawText)
  if (includesAny(text, ['공기청정기 꺼줘', '공청기 꺼줘', '공기청정기 꺼', '공청기 꺼', '공기청정기 전원 꺼줘', '공기청정기 오프', '공청기 오프'], 0.82)) return buildAirOffResponse(rawText)
  if (includesAny(text, ['공기청정기 켜줘', '공청기 켜줘', '공기청정기 켜', '공청기 켜', '공기청정기 전원 켜줘', '공기청정기 온', '공청기 온', '공기 깨끗하게 해줘', '공기 좀 깨끗하게 해줘', '공기 좋아지게 해줘', '공기가 탁해'], 0.82)) return buildAirOnResponse(rawText)
  if (includesAny(text, ['지금 몇 시야', '몇 시야', '현재 시간 알려줘', '시간 알려줘', '지금 시간 뭐야', '몇 시인지 말해줘', '시간 확인해줘'], 0.72)) {
    return buildTextOnlyResponse(rawText, 'conversation_only', '현재 시간 확인 요청을 감지했습니다.', getKoreaTimeText(), 'keyword', 'time')
  }
  if (includesAny(text, ['오늘 며칠이야', '오늘 날짜 알려줘', '오늘 무슨 요일이야', '요일 알려줘', '날짜 확인해줘', '오늘 몇 월 며칠이야'], 0.72)) {
    return buildTextOnlyResponse(rawText, 'conversation_only', '오늘 날짜 확인 요청을 감지했습니다.', `오늘은 ${getKoreaDateText()}이에요.`, 'keyword', 'date')
  }
  if (includesAny(text, ['안녕', '안녕하세요', '하이', '헬로', '반가워', '오늘도 잘 부탁해', '모모야 안녕', '나 왔어'], 0.72)) {
    return buildTextOnlyResponse(rawText, 'conversation_only', '일상 인사를 감지했습니다.', '안녕하세요. 오늘도 편안한 하루가 되도록 도와드릴게요.', 'keyword', 'greeting')
  }
  if (includesAny(text, ['고마워', '감사해', '도와줘서 고마워', '고맙다', '정말 고마워', '도움 됐어', '수고했어'], 0.72)) {
    return buildTextOnlyResponse(rawText, 'conversation_only', '감사 표현을 감지했습니다.', '천만에요. 필요할 때 언제든 불러주세요.', 'keyword', 'thanks')
  }

  const careRuleResponse = buildCareRuleResponse(rawText, findBestCareRule(text, body, 0.64))
  if (careRuleResponse) return careRuleResponse

  if (includesAny(text, ['좋은 아침이야', '좋은 아침', '좋은아침', '굿모닝', '아침이야', '오늘 시작해줘'], 0.64)) return buildMorningResponse(body, rawText)

  const conversation = matchDailyConversation(text)
  if (conversation) return buildDailyConversationResponse(rawText, conversation)

  if (includesAny(text, OUT_OF_SCOPE_TERMS, 0.74)) {
    return buildTextOnlyResponse(rawText, 'out_of_scope', '프로젝트 범위 밖 질문으로 이해했습니다.', OUT_OF_SCOPE_REPLY)
  }

  return null
}

function fallbackRoute(body: VoiceIntentRequest): VoiceIntentResponse {
  const rawText = body.text?.trim() || ''
  return buildTextOnlyResponse(rawText, 'unknown', '발화를 명확히 이해하지 못했습니다.', UNKNOWN_REPLY, 'fallback')
}

async function openAIRoute(body: VoiceIntentRequest): Promise<VoiceIntentResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const text = body.text?.trim()
  if (!apiKey || !text) return null

  try {
    const openai = new OpenAI({ apiKey })
    const dailyConversationCatalog = DAILY_CONVERSATION_INTENTS.map((item) => ({
      intent: item.intent,
      semanticHint: item.semanticHint,
      reply: item.reply,
    }))
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODELS.text,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            '3D 임산부 케어 시연 발화를 분류합니다. JSON만 반환하세요. type은 routine,device_control,morning_guidance,conversation_only,safety_medical,out_of_scope,unknown 중 하나만 허용합니다. routine이면 category를 prep_condition,prep_sleep,prep_refresh,prep_rest,prep_couple,nausea,sleep,housework,ocean,forest,city 중 하나로 반환하세요. device_control이면 category를 air_on, air_off, light_on, light_off 중 하나로 반환하세요. 전구/조명/거실 조명 켜기와 끄기는 light_on/light_off입니다. morning_guidance이면 category를 morning으로 반환하세요. 기본모드 요청이면 type:"routine", category:"default"로 반환하세요. conversation_only는 제공된 dailyConversationCatalog 중 가장 가까운 intent를 고르고, 3D 루틴, 기본모드, 가전 제어를 절대 실행하지 않습니다. safety_medical은 통증, 출혈, 호흡곤란, 심한 어지러움, 태동 이상 등 위험 신호 가능성이 있을 때만 사용하고 진단하지 말고 의료진 상담을 권하세요. out_of_scope는 주식, 정치, 스포츠 결과, 코딩, 게임, 성적/폭력적 질문, 농담, 일반 지식, 실시간 뉴스/날씨처럼 이 프로젝트 범위 밖 질문에 사용하세요. unknown은 의도를 판단하기 어려울 때만 사용하세요. 답변은 한국어 1~3문장으로 자연스럽게 작성하세요.',
        },
        {
          role: 'system',
          content:
            '사용자 발화에는 alternatives 배열로 음성 인식 후보가 함께 올 수 있습니다. 후보 중 하나라도 임산부 케어 루틴, 기본모드, 전구/조명, 공기청정기 제어에 명확히 맞으면 그 의도를 시간/날짜/일상대화보다 우선하세요. allowAllCareModes가 true이면 pregnancyStatus와 role에 상관없이 prep_condition,prep_sleep,prep_refresh,prep_rest,prep_couple,nausea,sleep,housework,ocean,forest,city 11개 루틴을 모두 실행 가능 후보로 봅니다. 대표 예시는 "냄새 때문에 너무 힘들어"=nausea, "왜 이렇게 잠이 안들지"=sleep, "몸이 너무 무거워"=housework, "시원한 바다 보고 싶어"=ocean, "조용한 숲에 가고 싶어"=forest, "도시 야경 보고 싶어"=city, "집에만 있으니까 너무 답답해"=prep_refresh, "너무 지친다"=prep_rest, "예쁜 곳에서 저녁 먹고 싶어"=prep_couple입니다. 특히 "도시", "야경", "도시 야경"은 city 루틴이며 시간 확인으로 분류하지 마세요.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            alternatives: getIntentCandidateTexts(body).slice(1),
            pregnancyStatus: body.pregnancyStatus ?? 'pregnant',
            role: body.role ?? 'wife',
            pregnancyWeek: body.pregnancyWeek ?? 16,
            dailyConversationCatalog,
          }),
        },
      ],
    })
    const content = completion.choices[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as {
      category?: string
      type?: string
      intent?: string
      understoodText?: string
      reply?: string
    }

    if (parsed.type === 'conversation_only') {
      const dailyIntent = DAILY_CONVERSATION_INTENTS.find((item) => item.intent === parsed.intent)
      if (dailyIntent) return buildDailyConversationResponse(text, dailyIntent, 'openai')
      return buildOpenAIConversationResponse(text, parsed.understoodText, parsed.reply)
    }

    if (parsed.type === 'safety_medical') {
      return buildTextOnlyResponse(
        text,
        'safety_medical',
        parsed.understoodText || '의료 위험 신호 가능성이 있는 발화로 이해했습니다.',
        SAFETY_MEDICAL_REPLY,
        'openai',
      )
    }

    if (parsed.type === 'out_of_scope') {
      return buildTextOnlyResponse(
        text,
        'out_of_scope',
        parsed.understoodText || '프로젝트 범위 밖 질문으로 이해했습니다.',
        OUT_OF_SCOPE_REPLY,
        'openai',
      )
    }

    if (parsed.type === 'unknown') {
      return buildTextOnlyResponse(
        text,
        'unknown',
        parsed.understoodText || '발화를 명확히 이해하지 못했습니다.',
        UNKNOWN_REPLY,
        'openai',
      )
    }

    const category = parsed.category

    const syntheticTextByCategory: Record<string, string> = {
      default: '기본 모드로 바꿔줘',
      morning: '좋은 아침이야',
      air_on: '공기청정기 켜줘',
      air_off: '공기청정기 꺼줘',
      light_on: '전구 켜줘',
      light_off: '전구 꺼줘',
      prep_condition: '아침 컨디션을 맞춰줘',
      prep_sleep: '잠을 잘 자게 도와줘',
      prep_refresh: '기분을 바꾸고 싶어',
      prep_rest: '편하게 쉬고 싶어',
      prep_couple: '우리 둘의 저녁을 준비해줘',
      nausea: '음식 냄새 때문에 속이 안 좋아',
      sleep: '잠이 잘 오게 해줘',
      housework: '빨래와 청소를 도와줘',
      ocean: '바다 분위기로 바꿔줘',
      forest: '숲 분위기로 바꿔줘',
      city: '도시 야경을 보여줘',
    }
    const routed = category ? keywordRoute({ ...body, text: syntheticTextByCategory[category] ?? text }) : null
    return routed ? { ...routed, transcript: text, source: 'openai' } : null
  } catch (error) {
    console.warn('[simulation-3d/voice-intent] OpenAI fallback failed:', error)
    return null
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VoiceIntentRequest
  const candidateTexts = getIntentCandidateTexts(body)
  const text = candidateTexts[0] ?? ''

  if (!text) {
    return NextResponse.json(fallbackRoute({ ...body, text: '' }), { status: 400 })
  }

  for (const candidateText of candidateTexts) {
    const routineResult = routineKeywordRoute({ ...body, text: candidateText })
    if (routineResult) {
      return NextResponse.json(withPrimaryTranscript(routineResult, text, candidateText))
    }
  }

  for (const candidateText of candidateTexts) {
    const keywordResult = keywordRoute({ ...body, text: candidateText })
    if (keywordResult) {
      return NextResponse.json(withPrimaryTranscript(keywordResult, text, candidateText))
    }
  }

  const aiResult = await openAIRoute({ ...body, text, alternatives: candidateTexts.slice(1) })
  if (aiResult) return NextResponse.json(aiResult)

  return NextResponse.json(fallbackRoute({ ...body, text }))
}
