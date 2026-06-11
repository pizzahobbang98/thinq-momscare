'use client'

type PreparingCardDetailProps = {
  onViewDiary?: () => void
  onOpenCalendar?: () => void
  nextApptTitle?: string | null
  nextApptHospital?: string | null
}

export function PreparingCareDetail() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      <p>생활 리듬과 집안 환경을 차분히 맞추는 데 도움이 되는 항목이에요.</p>
      <ul className="space-y-3">
        <li className="rounded-2xl bg-green-50/70 px-4 py-3">
          <p className="font-semibold text-gray-900">수면 리듬 관리</p>
          <p className="mt-1 text-xs text-gray-600">취침 전 조명을 낮추고 기상 시간을 일정하게 맞춰요.</p>
        </li>
        <li className="rounded-2xl bg-green-50/70 px-4 py-3">
          <p className="font-semibold text-gray-900">실내 공기 관리</p>
          <p className="mt-1 text-xs text-gray-600">환기 후 공기청정기를 켜 두면 집안 공기가 한결 편안해져요.</p>
        </li>
        <li className="rounded-2xl bg-green-50/70 px-4 py-3">
          <p className="font-semibold text-gray-900">카페인/식사 루틴 메모</p>
          <p className="mt-1 text-xs text-gray-600">오늘 마신 음료와 식사 시간을 가볍게 적어 두세요.</p>
        </li>
        <li className="rounded-2xl bg-green-50/70 px-4 py-3">
          <p className="font-semibold text-gray-900">스트레스 완화 루틴</p>
          <p className="mt-1 text-xs text-gray-600">짧은 스트레칭이나 좋아하는 음악으로 하루를 마무리해요.</p>
        </li>
        <li className="rounded-2xl bg-green-50/70 px-4 py-3">
          <p className="font-semibold text-gray-900">병원 방문 준비 체크</p>
          <p className="mt-1 text-xs text-gray-600">다음 방문 전에 궁금한 점과 챙길 것을 메모해 두세요.</p>
        </li>
      </ul>
    </div>
  )
}

export function HomeConditionDetail() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      <p>ThinQ ON과 연결된 가전 상태를 바탕으로 집안 컨디션을 살펴봐요.</p>
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="font-semibold text-gray-900">공기청정기</p>
          <p className="mt-1 text-xs text-green-700">양호 · 자동 모드 작동 중</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="font-semibold text-gray-900">실내 습도/온도</p>
          <p className="mt-1 text-xs text-gray-600">습도 48% · 온도 23°C · 쾌적한 범위예요</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="font-semibold text-gray-900">수면 전 조명 루틴</p>
          <p className="mt-1 text-xs text-gray-600">22:30에 거실 조명이 은은하게 낮아져요</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="font-semibold text-gray-900">집안 냄새/환기</p>
          <p className="mt-1 text-xs text-gray-600">오후에 10분 환기 알림이 설정되어 있어요</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="font-semibold text-gray-900">연결된 가전 요약</p>
          <p className="mt-1 text-xs text-gray-600">공기청정기, 세탁기, 조명 3대가 연결되어 있어요</p>
        </div>
      </div>
    </div>
  )
}

export function PreparingDiaryDetail({ onViewDiary }: { onViewDiary?: () => void }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      <p>오늘의 몸과 마음, 생활 루틴을 가볍게 남겨 두세요.</p>
      <ul className="space-y-2 text-xs text-gray-600">
        <li className="rounded-xl bg-gray-50 px-3 py-2">오늘의 컨디션 기록</li>
        <li className="rounded-xl bg-gray-50 px-3 py-2">병원 방문 전 메모</li>
        <li className="rounded-xl bg-gray-50 px-3 py-2">생활 루틴 메모</li>
        <li className="rounded-xl bg-gray-50 px-3 py-2">배우자와 공유할 한 줄 메모</li>
      </ul>
      {onViewDiary && (
        <button
          type="button"
          onClick={onViewDiary}
          className="min-h-[44px] w-full rounded-2xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          기록 보기
        </button>
      )}
    </div>
  )
}

export function HospitalPrepDetail({
  onOpenCalendar,
  nextApptTitle,
  nextApptHospital,
}: PreparingCardDetailProps) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-gray-700">
      {nextApptTitle ? (
        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <p className="font-semibold text-gray-900">{nextApptTitle}</p>
          {nextApptHospital && <p className="mt-1 text-xs text-gray-600">{nextApptHospital}</p>}
        </div>
      ) : (
        <p className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          예정된 병원 방문이 없어요. 일정을 추가해 보세요.
        </p>
      )}
      <ul className="space-y-2 text-xs text-gray-600">
        <li className="rounded-xl bg-gray-50 px-3 py-2">상담 때 물어볼 질문 메모</li>
        <li className="rounded-xl bg-gray-50 px-3 py-2">검사/상담 준비 체크</li>
        <li className="rounded-xl bg-gray-50 px-3 py-2">배우자 동행 여부 메모</li>
      </ul>
      {onOpenCalendar && (
        <button
          type="button"
          onClick={onOpenCalendar}
          className="min-h-[44px] w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-green-200"
        >
          병원 일정 캘린더 보기
        </button>
      )}
    </div>
  )
}
