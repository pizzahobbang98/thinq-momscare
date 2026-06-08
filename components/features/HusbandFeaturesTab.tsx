'use client'

import { useState } from 'react'
import FeatureCard from '@/components/features/FeatureCard'
import {
  fetchThinQState,
  isSleepModeActive,
  logFeatureEvent,
  sendHusbandHeart,
  sendRoleMessage,
} from '@/lib/features'

type HusbandFeaturesTabProps = {
  showToast: (message: string, type: 'success' | 'error') => void
}

type CardStatus = Record<string, string>

export default function HusbandFeaturesTab({ showToast }: HusbandFeaturesTabProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [statusByCard, setStatusByCard] = useState<CardStatus>({})
  const [dadSupportConfirmed, setDadSupportConfirmed] = useState(false)

  function setCardStatus(key: string, message: string) {
    setStatusByCard((prev) => ({ ...prev, [key]: message }))
  }

  async function runAction(key: string, action: () => Promise<void>) {
    setLoadingKey(key)
    try {
      await action()
    } catch (error) {
      console.error(`[husband features] ${key} failed:`, error)
      showToast('요청 처리에 실패했어요', 'error')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-700">아빠손길 케어</p>
        <p className="mt-1 text-xs leading-relaxed text-blue-600">
          오늘 어떤 배려를 하면 좋은지, 바로 보낼 수 있는 구체적인 행동 문장으로 안내해요.
        </p>
      </div>

      <FeatureCard
        emoji="💙"
        title="아빠손길"
        subtitle="오늘 필요한 배려를 구체적으로 알려줘요"
        description="처음 아빠가 되어가는 배우자에게 오늘 조심하면 좋은 생활 포인트와 대화 힌트를 알려줍니다."
        aiMessage="오늘은 주방 냄새와 늦은 시간 소음에 예민할 수 있어요. 강한 냄새 조리보다 간단한 메뉴를 함께 고르면 좋아요."
        items={[
          '오늘 조심하면 좋은 생활 포인트',
          '냄새 · 소음 · 식사',
          '대화 힌트',
          '강한 냄새 조리 주의',
          '늦은 시간 청소기 사용 자제',
        ]}
        deviceBadges={[
          { label: 'AI Hub', status: 'ai' },
          { label: '아내 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: '메시지·하트 연동', type: 'shared' }}
        statusMessage={
          dadSupportConfirmed
            ? '오늘의 배려 포인트를 확인했어요'
            : statusByCard.dadSupport
        }
        theme="blue"
        buttons={[
          {
            label: '아내에게 응원 보내기',
            loading: loadingKey === 'dad-heart',
            onClick: () =>
              void runAction('dad-heart', async () => {
                await sendHusbandHeart()
                await sendRoleMessage('husband', '오늘도 정말 수고했어. 내가 옆에 있을게.')
                await logFeatureEvent('DAD_SUPPORT_SENT', {
                  routine: 'DAD_SUPPORT',
                  source: 'husband_feature_tab',
                  message: '응원 보내기',
                })
                setCardStatus('dadSupport', '아내에게 응원을 보냈어요 💕')
                showToast('응원을 보냈어요', 'success')
              }),
          },
          {
            label: '오늘 배려 포인트 확인했어요',
            variant: 'secondary',
            onClick: () => {
              setDadSupportConfirmed(true)
              setCardStatus('dadSupport', '오늘의 배려 포인트를 확인했어요')
            },
          },
        ]}
      />

      <FeatureCard
        emoji="🥗"
        title="먹을 수 있는 식탁 도와주기"
        subtitle="오늘은 냄새 부담이 적은 식사를 함께 준비해요"
        description="아내의 입맛과 냄새 민감도를 기준으로 오늘 피하면 좋은 음식과 함께 고르면 좋은 메뉴를 보여줍니다."
        aiMessage="오늘은 입맛이 낮고 냄새에 예민할 수 있어요. 두부, 계란, 죽처럼 냄새 부담이 낮은 메뉴를 함께 골라보세요."
        items={[
          '강한 냄새 조리 주의',
          '기름진 음식 피하기',
          '조리 시간 짧은 메뉴 추천',
          '아내가 최근 거부한 음식 확인',
          '간단한 메뉴 함께 고르기',
        ]}
        deviceBadges={[
          { label: '냉장고', status: 'ai' },
          { label: '오븐', status: 'planned' },
          { label: '아내 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: '메시지 연동 · 식단 추천은 AI/Mock', type: 'mock' }}
        statusMessage={statusByCard.mealHelp}
        theme="blue"
        buttons={[
          {
            label: '오늘 저녁은 냄새 적은 메뉴로 고를게',
            loading: loadingKey === 'meal-help',
            onClick: () =>
              void runAction('meal-help', async () => {
                await sendRoleMessage('husband', '오늘 저녁은 냄새 적은 메뉴로 고를게.')
                setCardStatus('mealHelp', '아내에게 저녁 메뉴 약속 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
          {
            label: '먹고 싶은 메뉴 있으면 말해줘',
            variant: 'secondary',
            loading: loadingKey === 'meal-ask',
            onClick: () =>
              void runAction('meal-ask', async () => {
                await sendRoleMessage('husband', '오늘 먹고 싶은 메뉴가 있어? 내가 같이 준비할게.')
                setCardStatus('mealHelp', '아내에게 메뉴를 물어봤어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="👕"
        title="무거운 빨래 도와주기"
        subtitle="젖은 빨래와 이불은 대신 확인해 주세요"
        description="임신 중에는 젖은 빨래나 이불처럼 무겁고 허리를 숙여야 하는 일이 부담될 수 있습니다. 세탁/건조 완료 상태를 함께 확인하고 필요한 경우 대신 움직일 수 있도록 알려줍니다."
        aiMessage="세탁이 끝났다면 아내가 바로 움직이지 않아도 괜찮도록 먼저 세탁물을 확인해 주세요."
        items={[
          '세탁 완료 확인',
          '건조 완료 확인',
          '이불 세탁 도움',
          '젖은 빨래 옮기기',
          '스타일러 외출복 케어',
        ]}
        deviceBadges={[
          { label: '세탁기', status: 'demo' },
          { label: '건조기', status: 'demo' },
          { label: '아내 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: '메시지 연동 · 가전 상태는 시연/Mock', type: 'demo' }}
        statusMessage={statusByCard.laundryHelp}
        theme="blue"
        buttons={[
          {
            label: '빨래는 내가 확인할게',
            loading: loadingKey === 'laundry-check',
            onClick: () =>
              void runAction('laundry-check', async () => {
                await sendRoleMessage('husband', '빨래는 내가 확인할게.')
                setCardStatus('laundryHelp', '아내에게 빨래 확인 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
          {
            label: '세탁물은 내가 대신 옮길게',
            variant: 'secondary',
            loading: loadingKey === 'laundry-move',
            onClick: () =>
              void runAction('laundry-move', async () => {
                await sendRoleMessage('husband', '세탁물은 내가 대신 옮길게. 편하게 쉬어.')
                setCardStatus('laundryHelp', '아내에게 도움 약속 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="😴"
        title="밤잠 지켜주기"
        subtitle="오늘은 조용하고 편안한 밤 환경을 만들어 주세요"
        description="아내가 깊게 잘 수 있도록 늦은 시간 소음, 밝은 조명, TV 소리, 청소기 사용을 줄이는 배려 포인트를 보여줍니다."
        aiMessage="오늘은 잠을 깊게 자기 어려울 수 있어요. 늦은 시간 소음과 밝은 조명을 줄이면 좋아요."
        items={[
          '늦은 시간 청소기 사용 자제',
          'TV 볼륨 낮추기',
          '침실 조명 낮추기',
          '에어컨 직바람 확인',
          '공기청정기 수면 모드 확인',
          '밤중 대화는 짧고 부드럽게',
        ]}
        deviceBadges={[
          { label: '공기청정기', status: 'available' },
          { label: '아내 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: 'ThinQ 상태 확인 · 메시지 연동', type: 'thinq' }}
        statusMessage={statusByCard.sleepHelp}
        theme="blue"
        buttons={[
          {
            label: '오늘은 조용히 쉬게 해줄게',
            loading: loadingKey === 'sleep-msg',
            onClick: () =>
              void runAction('sleep-msg', async () => {
                await sendRoleMessage('husband', '오늘은 조용히 쉬게 해줄게.')
                setCardStatus('sleepHelp', '아내에게 조용한 밤 약속 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
          {
            label: '공기청정기 수면 모드 확인하기',
            variant: 'secondary',
            loading: loadingKey === 'sleep-check',
            onClick: () =>
              void runAction('sleep-check', async () => {
                const state = await fetchThinQState()
                if (isSleepModeActive(state)) {
                  setCardStatus('sleepHelp', '공기청정기 수면 모드가 적용 중이에요 ✅')
                  showToast('수면 모드가 확인됐어요', 'success')
                } else {
                  setCardStatus('sleepHelp', '아직 수면 모드가 아니에요. 아내가 밤잠 루틴을 시작하면 좋아요.')
                  showToast('아직 수면 모드가 아니에요', 'error')
                }
              }),
          },
        ]}
      />

      <FeatureCard
        emoji="🛋️"
        title="집 안 여행 함께하기"
        subtitle="외출이 어려운 날 집에서 기분 전환을 도와요"
        description="외출이 부담스러운 날 아내가 집 안에서도 쉬어갈 수 있도록 영상, 음악, 조명, 공기 환경을 함께 만들어주는 루틴입니다."
        aiMessage="오늘은 멀리 나가지 않아도 집 안을 휴양지처럼 바꿔볼 수 있어요. 간단한 음료를 준비하고 함께 쉬어가면 좋아요."
        items={[
          '바다 휴양지 모드',
          '숲속 힐링 모드',
          '호텔 라운지 모드',
          '간단한 음료/간식 준비',
          '로봇청소기 일시 중지',
          '대화보다 조용한 동행',
        ]}
        deviceBadges={[
          { label: 'TV', status: 'planned' },
          { label: '스피커', status: 'planned' },
          { label: '공기청정기', status: 'available' },
          { label: '아내 메시지', status: 'shared' },
        ]}
        cardIntegration={{ label: '메시지 연동 · 분위기 가전은 확장 예정', type: 'planned' }}
        statusMessage={statusByCard.travelHelp}
        theme="blue"
        buttons={[
          {
            label: '같이 쉬자고 보내기',
            loading: loadingKey === 'travel-rest',
            onClick: () =>
              void runAction('travel-rest', async () => {
                await sendRoleMessage('husband', '오늘은 집에서 같이 쉬어요. 내가 옆에 있을게.')
                setCardStatus('travelHelp', '아내에게 함께 쉬자는 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
          {
            label: '간식 준비했어요',
            variant: 'secondary',
            loading: loadingKey === 'travel-snack',
            onClick: () =>
              void runAction('travel-snack', async () => {
                await sendRoleMessage('husband', '간단한 간식 준비했어. 편하게 먹어.')
                setCardStatus('travelHelp', '아내에게 간식 준비 메시지를 보냈어요')
                showToast('메시지를 보냈어요', 'success')
              }),
          },
        ]}
      />
    </div>
  )
}
