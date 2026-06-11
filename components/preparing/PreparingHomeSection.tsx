'use client'

import CollapsibleCardShell from '@/components/ui/CollapsibleCardShell'

type PreparingHomeSectionProps = {
  onExpand: (cardId: 'prep-care' | 'home-condition' | 'prep-diary' | 'hospital-prep') => void
}

export default function PreparingHomeSection({ onExpand }: PreparingHomeSectionProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <CollapsibleCardShell
        title="준비 케어"
        subtitle="임신을 준비하는 생활 리듬을 ThinQ Mom이 차분히 정리해요."
        tags={['#생활리듬']}
        onExpand={() => onExpand('prep-care')}
      />
      <CollapsibleCardShell
        title="우리집 컨디션"
        subtitle="공기, 온도, 조명처럼 매일의 컨디션을 만드는 환경을 살펴봐요."
        tags={['#집안환경']}
        onExpand={() => onExpand('home-condition')}
      />
      <CollapsibleCardShell
        title="준비 마음 기록"
        subtitle="오늘의 몸과 마음, 생활 루틴을 가볍게 남겨요."
        tags={['#준비기록']}
        onExpand={() => onExpand('prep-diary')}
      />
      <CollapsibleCardShell
        title="병원 준비 체크"
        subtitle="검진 일정과 준비할 내용을 한곳에서 확인해요."
        tags={['#병원일정']}
        onExpand={() => onExpand('hospital-prep')}
      />
    </div>
  )
}
