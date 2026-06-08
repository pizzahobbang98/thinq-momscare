'use client'

import { useState } from 'react'
import FeatureCard from '@/components/features/FeatureCard'
import {
  MOCK_MEAL_RECOMMENDATION,
  controlThinQ,
  logFeatureEvent,
  sendRoleMessage,
} from '@/lib/features'

type WifeFeaturesTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void
}

type CardStatus = Record<string, string>

export default function WifeFeaturesTab({ showToast }: WifeFeaturesTabProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [statusByCard, setStatusByCard] = useState<CardStatus>({})
  const [mealResult, setMealResult] = useState<string | null>(null)
  const [travelMode, setTravelMode] = useState<string | null>(null)

  function setCardStatus(key: string, message: string) {
    setStatusByCard((prev) => ({ ...prev, [key]: message }))
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setLoadingKey(key)
    try {
      await action()
    } catch (error) {
      console.error(`[wife features] ${key} failed:`, error)
      showToast('요청 처리에 실패했어요', 'error')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
        <p className="text-sm font-semibold text-rose-700">엄마품 ThinQ 케어</p>
        <p className="mt-1 text-xs leading-relaxed text-rose-600">
          ThinQ 실제 연동 기능은 강조 표시돼요. 시연/Mock·확장 예정 기능은 카드 배지로 구분해요.
        </p>
      </div>

      <FeatureCard
        emoji="🌸"
        title="엄마품"
        subtitle="오늘의 컨디션을 이해하고 케어 루틴을 추천해요"
        description="처음 엄마가 되어가는 하루를 AI Hub가 부드럽게 살펴요. 오늘의 컨디션, 냄새 민감도, 피로도, 수면 상태를 바탕으로 필요한 케어를 추천합니다."
        aiMessage="오늘은 냄새와 피로에 민감할 수 있는 날이에요. 주방 공기 케어와 가벼운 식사 루틴을 먼저 준비해둘게요."
        items={[
          '오늘의 컨디션',
          '냄새 민감도',
          '피로도',
          '수면 상태',
          '추천 케어 루틴',
          '아빠손길 공유 여부',
        ]}
        deviceBadges={[
          { label: 'AI Hub', status: 'ai' },
          { label: '아빠손길 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: '남편 화면 메시지·이벤트 연동', type: 'shared' }}
        statusMessage={statusByCard.momCare}
        theme="rose"
        buttons={[
          {
            label: '오늘 케어 보기',
            onClick: () =>
              setCardStatus(
                'momCare',
                '오늘은 공기 케어와 가벼운 식사 루틴을 먼저 추천해요.',
              ),
          },
          {
            label: '아빠손길에 공유하기',
            loading: loadingKey === 'momCare-share',
            onClick: () =>
              void runAction('momCare-share', async () => {
                await sendRoleMessage(
                  'wife',
                  '오늘은 냄새와 피로에 민감할 수 있어요. 엄마품 케어를 함께 봐주세요.',
                )
                await logFeatureEvent('MOM_CARE_SHARED', {
                  routine: 'MOM_CARE',
                  devices: ['AI_HUB', 'AIR_PURIFIER'],
                  source: 'wife_feature_tab',
                  message: '엄마품 케어 공유',
                })
                setCardStatus('momCare', '아빠손길에 오늘 케어를 공유했어요 💕')
                showToast('아빠손길에 공유했어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="🍽️"
        title="먹을 수 있는 식탁"
        subtitle="오늘 진짜 먹을 수 있을 것 같은 식사를 찾아줘요"
        description="입맛, 냄새 민감도, 최근 거부한 음식, 조리 냄새와 조리 시간을 고려해 냉장고 속 재료 기반으로 부담이 적은 메뉴를 추천합니다."
        aiMessage="오늘은 입맛이 낮은 날일 수 있어요. 냉장고에 있는 두부와 계란으로, 조리 시간이 짧고 냄새 부담이 적은 메뉴를 추천할게요."
        items={[
          '오늘의 입맛',
          '냄새 민감도',
          '최근 거부한 음식',
          '조리 냄새 강도',
          '조리 시간',
          '냉장고 속 재료',
          '오븐/인덕션 자동 조리 가능 여부',
        ]}
        subFeatures={[
          '무향 레시피 추천',
          '입맛 반전 모드',
          '조리 전 냄새 프리셋',
          '냉장고 재료 기반 대체 메뉴',
          '오븐/인덕션 조리값 전송',
        ]}
        deviceBadges={[
          { label: '냉장고', status: 'ai' },
          { label: '오븐', status: 'planned' },
          { label: '인덕션', status: 'planned' },
        ]}
        cardIntegration={{ label: 'AI 추천 · 시연/Mock', type: 'mock' }}
        statusMessage={mealResult ?? statusByCard.meal}
        theme="rose"
        buttons={[
          {
            label: '오늘 식탁 추천받기',
            loading: loadingKey === 'meal',
            onClick: () =>
              void runAction('meal', async () => {
                const rec = MOCK_MEAL_RECOMMENDATION
                const resultText = `${rec.name} · ${rec.smell} · ${rec.time} · ${rec.note}`
                setMealResult(resultText)
                await logFeatureEvent('MEAL_CARE_REQUESTED', {
                  routine: 'MEAL_CARE',
                  devices: ['REFRIGERATOR', 'OVEN', 'INDUCTION'],
                  mock: true,
                  source: 'wife_feature_tab',
                  message: rec.name,
                })
                setCardStatus('meal', 'AI 추천 루틴을 준비했어요')
                showToast('오늘 식탁을 추천했어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="🧺"
        title="무거운 빨래 대신 루틴"
        subtitle="바로 움직이지 않아도 세탁물이 먼저 케어돼요"
        description="임신 중 부담이 될 수 있는 젖은 빨래, 이불 세탁, 세탁물 이동을 줄일 수 있도록 세탁기·건조기·스타일러가 세탁 이후 케어를 이어갑니다."
        aiMessage="세탁이 끝났지만 지금 바로 움직이지 않아도 괜찮아요. 세탁물 케어를 유지하고, 함께 확인할 수 있도록 아빠손길에 알려둘게요."
        items={[
          '세탁 완료 후 케어 유지',
          '건조 완료 후 구김 방지',
          '무거운 빨래 아빠손길 공유',
          '스타일러 외출복 케어',
          '컨디션 낮은 날 세탁 알림 최소화',
        ]}
        deviceBadges={[
          { label: '세탁기', status: 'demo' },
          { label: '건조기', status: 'demo' },
          { label: '아빠손길 메시지', status: 'shared' },
          { label: '스타일러', status: 'planned' },
        ]}
        cardIntegration={{ label: '메시지 연동 · 가전 제어는 시연/Mock', type: 'demo' }}
        statusMessage={statusByCard.laundry}
        theme="rose"
        buttons={[
          {
            label: '빨래 도움 요청하기',
            loading: loadingKey === 'laundry',
            onClick: () =>
              void runAction('laundry', async () => {
                await sendRoleMessage('wife', '무거운 빨래 도움이 필요해요. 함께 확인해주실 수 있을까요?')
                await logFeatureEvent('LAUNDRY_HELP_REQUESTED', {
                  routine: 'LAUNDRY_CARE',
                  devices: ['WASHER', 'DRYER', 'STYLER'],
                  mock: true,
                  source: 'wife_feature_tab',
                })
                setCardStatus('laundry', '아빠손길에 빨래 도움을 요청했어요')
                showToast('빨래 도움을 요청했어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="🌙"
        title="밤잠 지킴 루틴"
        subtitle="온도·공기·빛·소리를 수면 중심으로 낮춰요"
        description="밤에 덥거나 답답하고, 빛과 소음에 예민할 수 있는 임산부를 위해 침실 환경을 수면에 맞게 조정합니다."
        aiMessage="오늘은 잠을 깊게 자기 어려울 수 있어요. 침실 조명을 낮추고, 공기청정기는 저소음으로 맞춰둘게요."
        items={[
          '취침 전 침실 온도 조정',
          '공기청정기 저소음/수면 모드',
          '조명 밝기 낮춤',
          'TV/스피커 자동 종료',
          '늦은 시간 로봇청소기 제한',
          '에어컨 직바람 회피',
          '습도 관리',
        ]}
        deviceBadges={[
          { label: '공기청정기 SLEEP', status: 'available' },
          { label: '에어컨', status: 'planned' },
          { label: '조명', status: 'planned' },
          { label: 'TV', status: 'planned' },
        ]}
        cardIntegration={{ label: 'ThinQ 실제 연동 · 공기청정기 SLEEP 제어', type: 'thinq' }}
        highlighted
        statusMessage={statusByCard.sleep}
        theme="rose"
        buttons={[
          {
            label: '밤잠 루틴 시작하기',
            loading: loadingKey === 'sleep',
            onClick: () =>
              void runAction('sleep', async () => {
                const result = await controlThinQ('SLEEP_MODE')
                await logFeatureEvent('SLEEP_ROUTINE_STARTED', {
                  routine: 'SLEEP_ROUTINE',
                  devices: ['AIR_PURIFIER'],
                  power: result.deviceStatus?.power ?? 'ON',
                  mode: result.deviceStatus?.mode ?? 'SLEEP',
                  source: 'wife_feature_tab',
                })
                await sendRoleMessage('wife', '오늘은 조용한 밤 환경이 필요해요. 밤잠 지킴 루틴을 시작했어요.')
                setCardStatus('sleep', '공기청정기 수면 모드가 적용됐어요 🌙')
                showToast('밤잠 루틴을 시작했어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="🏝️"
        title="집 안 여행 모드"
        subtitle="외출이 어려운 날 집 안을 휴양지처럼 바꿔요"
        description="멀리 외출하기 부담스러운 날, 공기청정기 쾌적 모드로 공기를 먼저 맞추고 분위기 연출은 단계적으로 확장해요. TV·조명·스피커는 확장 예정이에요."
        aiMessage="오늘은 공기청정기 쾌적 모드부터 적용할게요. 바다·숲·호텔 분위기 영상과 소리는 확장 예정이에요."
        items={[
          '바다/숲/호텔 라운지 영상',
          '파도 소리, 숲소리, 잔잔한 음악',
          '산뜻한 바람 설정',
          '공기청정기 쾌적 모드',
          '조명 색감과 밝기 조정',
          '로봇청소기 일시 중지',
          '냉장고 재료 기반 간식 추천',
        ]}
        deviceBadges={[
          { label: '공기청정기 AUTO', status: 'available' },
          { label: 'TV', status: 'planned' },
          { label: '스피커', status: 'planned' },
          { label: '조명', status: 'planned' },
        ]}
        cardIntegration={{ label: '공기청정기만 ThinQ 실제 연동 · 나머지 확장 예정', type: 'thinq' }}
        highlighted
        statusMessage={
          travelMode
            ? `${travelMode} · 공기청정기 쾌적 모드 적용됨 · TV·조명·스피커는 확장 예정`
            : statusByCard.travel
        }
        theme="rose"
        buttons={[
          {
            label: '바다 휴양지 모드',
            loading: loadingKey === 'travel-sea',
            onClick: () =>
              void runAction('travel-sea', () => startTravelMode('바다 휴양지')),
          },
          {
            label: '숲속 힐링 모드',
            variant: 'secondary',
            loading: loadingKey === 'travel-forest',
            onClick: () =>
              void runAction('travel-forest', () => startTravelMode('숲속 힐링')),
          },
          {
            label: '호텔 라운지 모드',
            variant: 'secondary',
            loading: loadingKey === 'travel-hotel',
            onClick: () =>
              void runAction('travel-hotel', () => startTravelMode('호텔 라운지')),
          },
        ]}
      />
    </div>
  )

  async function startTravelMode(modeLabel: string) {
    try {
      const result = await controlThinQ('AUTO')
      await logFeatureEvent('HOME_TRAVEL_STARTED', {
        routine: 'HOME_TRAVEL',
        travelMode: modeLabel,
        devices: ['AIR_PURIFIER'],
        power: result.deviceStatus?.power ?? 'ON',
        mode: result.deviceStatus?.mode ?? 'AUTO',
        source: 'wife_feature_tab',
      })
      setTravelMode(modeLabel)
      setCardStatus(
        'travel',
        '공기청정기 쾌적 모드가 적용됐어요 · TV·조명·스피커는 확장 예정',
      )
      showToast('공기청정기 쾌적 모드를 적용했어요', 'success')
    } catch (error) {
      await logFeatureEvent('HOME_TRAVEL_STARTED', {
        routine: 'HOME_TRAVEL',
        travelMode: modeLabel,
        devices: ['TV', 'SPEAKER', 'LIGHTING'],
        mock: true,
        source: 'wife_feature_tab',
      })
      setTravelMode(modeLabel)
      setCardStatus(
        'travel',
        `${modeLabel} 분위기 미리보기 · 공기청정기 연동 실패, TV·조명·스피커는 확장 예정`,
      )
      showToast('분위기 미리보기만 적용됐어요 (공기청정기 연동 실패)', 'success')
      console.warn('[wife features] air purifier AUTO failed, mock travel only:', error)
    }
  }
}
