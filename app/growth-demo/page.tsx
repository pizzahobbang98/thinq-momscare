'use client'

import { useState } from 'react'
import PregnancyGrowthCard from '@/components/pregnancy-growth/PregnancyGrowthCard'

export default function GrowthDemoPage() {
  const [week, setWeek] = useState<number | undefined>(undefined)

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        gap: 20,
        padding: 24,
        background: 'radial-gradient(circle at 50% 30%, #fdf3f7 0%, #f6e6ee 100%)',
      }}
    >
      <div style={{ width: 'min(608px, 100%)' }}>
        <PregnancyGrowthCard
          autoPlay
          showWeekSwitcher
          onWeekChange={setWeek}
          onOpenAlbum={() => alert('사진첩으로 이동')}
        />
      </div>
      <p style={{ color: '#b97a8b', fontWeight: 600, fontSize: 14 }}>
        자동 재생 중 · 현재 {week ?? '—'}주차 (좌우 버튼으로 직접 전환도 가능해요)
      </p>
    </main>
  )
}
