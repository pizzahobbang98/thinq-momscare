import Image from 'next/image'

const CARE_CARDS = [
  {
    src: '/images/standby-mom/pregnancy-prep-calm-room.png',
    title: '마음을 쉬게 하는 공간',
    description: '휴식이 필요한 순간, 조명과 생활 환경을 차분하게 맞춰요.',
    alt: '햇살이 드는 편안한 실내 휴식 공간',
  },
  {
    src: '/images/standby-mom/pregnancy-prep-air-care.png',
    title: '예민한 순간의 공기 케어',
    description: '냄새와 공기 변화가 신경 쓰일 때 실내 공기부터 산뜻하게 관리해요.',
    alt: '맑은 공기가 드는 창가와 초록 식물',
  },
  {
    src: '/images/standby-mom/pregnancy-prep-sleep.png',
    title: '편안한 밤의 수면 케어',
    description: '피로가 쌓인 날에는 빛과 공기, 소음을 낮춰 회복을 도와요.',
    alt: '은은한 조명과 달빛이 비치는 편안한 침실',
  },
]

export function StandbyMomHero() {
  return (
    <section className="relative isolate min-h-[180px] overflow-hidden rounded-[24px] bg-emerald-950 shadow-sm sm:min-h-[210px]">
      <Image
        src="/images/standby-mom/pregnancy-prep-main.png"
        alt="햇살이 비치는 숲속의 편안한 휴식 공간"
        fill
        sizes="(max-width: 430px) calc(100vw - 32px), 398px"
        className="object-cover object-[center_58%]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#16362f]/90 via-[#24483a]/35 to-white/5"
        aria-hidden="true"
      />
      <div className="relative flex min-h-[180px] flex-col justify-end p-5 text-white sm:min-h-[210px] sm:p-6">
        <p className="text-xs font-semibold tracking-[0.08em] text-emerald-50/90">
          임신 준비부터 초기 컨디션까지
        </p>
        <h2 className="mt-2 max-w-[290px] text-[22px] font-bold leading-tight">
          오늘의 몸 상태에 맞춰
          <br />
          집 안을 부드럽게 돌봐요
        </h2>
        <p className="mt-2 max-w-[330px] text-sm leading-relaxed text-white/85">
          몸이 평소보다 민감한 시기에도 부담 없이 이어지는 생활 케어를 제안해요.
        </p>
      </div>
    </section>
  )
}

export function StandbyMomCareCards() {
  return (
    <section aria-labelledby="standby-mom-care-title">
      <div className="mb-3">
        <p className="text-xs font-semibold text-emerald-700">오늘의 생활 케어</p>
        <h2 id="standby-mom-care-title" className="mt-1 text-base font-bold text-gray-900">
          컨디션에 맞는 편안한 환경
        </h2>
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CARE_CARDS.map((card) => (
          <article
            key={card.src}
            className="w-[78%] min-w-[250px] max-w-[290px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-stone-100 bg-white shadow-sm"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-stone-100">
              <Image
                src={card.src}
                alt={card.alt}
                fill
                sizes="(max-width: 430px) 78vw, 290px"
                className="object-cover object-center"
              />
              <div
                className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-900">{card.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{card.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
