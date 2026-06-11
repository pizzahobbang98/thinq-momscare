'use client'

import { useState } from 'react'
import ExpandIconButton from '@/components/ui/ExpandIconButton'
import {
  CARE_INTEREST_OPTIONS,
  PREGNANCY_STATUS_LABELS,
  type PregnancyStatus,
} from '@/lib/pregnancy-status'
import type { WifeProfileData } from '@/lib/wife-profile-storage'

type MyInfoCardProps = {
  profile: WifeProfileData
  accountId: string
  onSave: (profile: WifeProfileData) => void
  onExpand?: () => void
  headerOnly?: boolean
}

function formatDateLabel(dateStr: string | null) {
  if (!dateStr) return '미설정'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function statusLabel(status: PregnancyStatus | null) {
  if (!status) return '미설정'
  return PREGNANCY_STATUS_LABELS[status]
}

export default function MyInfoCard({
  profile,
  accountId,
  onSave,
  onExpand,
  headerOnly = false,
}: MyInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(profile)

  function startEditing() {
    setDraft(profile)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft(profile)
    setIsEditing(false)
  }

  const summaryStatus = statusLabel(profile.pregnancyStatus)

  if (headerOnly) {
    return (
      <section className="min-h-[92px] w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">내 정보</h2>
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">
              {profile.userLabel}
              {` · ${summaryStatus}`}
              {profile.pregnancyStatus === 'pregnant' && profile.pregnancyWeek
                ? ` · ${profile.pregnancyWeek}주차`
                : ''}
            </p>
          </div>
          {onExpand && <ExpandIconButton onClick={onExpand} />}
        </div>
      </section>
    )
  }

  return (
    <section className="w-full overflow-x-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">내 정보</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={startEditing}
            className="min-h-[44px] rounded-full px-3 text-sm font-medium text-rose-500 transition hover:bg-rose-50"
          >
            수정
          </button>
        ) : null}
      </div>

      {!isEditing ? (
        <dl className="mt-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
            <dt className="text-sm text-gray-500">사용자</dt>
            <dd className="text-sm font-medium text-gray-900">{profile.userLabel}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
            <dt className="text-sm text-gray-500">임신 상태</dt>
            <dd className="text-sm font-medium text-gray-900">{summaryStatus}</dd>
          </div>
          {profile.pregnancyStatus === 'pregnant' && (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
                <dt className="text-sm text-gray-500">태명</dt>
                <dd className="text-sm font-medium text-gray-900">{profile.babyName || '미설정'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
                <dt className="text-sm text-gray-500">임신 주차</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {profile.pregnancyWeek && profile.pregnancyWeek > 0
                    ? `${profile.pregnancyWeek}주차`
                    : '미설정'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
                <dt className="text-sm text-gray-500">출산 예정일</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDateLabel(profile.dueDate)}</dd>
              </div>
            </>
          )}
          {profile.pregnancyStatus === 'preparing' && (
            <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
              <dt className="text-sm text-gray-500">준비 시작일</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatDateLabel(profile.preparationStartDate)}
              </dd>
            </div>
          )}
          {profile.pregnancyStatus === 'postpartum' && (
            <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
              <dt className="text-sm text-gray-500">출산일</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDateLabel(profile.postpartumDate)}</dd>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
            <dt className="text-sm text-gray-500">배우자 연결</dt>
            <dd className="text-sm font-medium text-green-600">
              {profile.spouseConnected ? '연결됨 💙' : '연결 안 됨'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
            <dt className="text-sm text-gray-500">관심 케어 항목</dt>
            <dd className="max-w-[180px] text-right text-sm font-medium text-gray-900">
              {profile.careInterests.join(', ')}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-sm text-gray-500">계정 ID</dt>
            <dd className="max-w-[180px] truncate text-xs font-medium text-gray-600">{accountId}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm text-gray-500">사용자</span>
            <input
              value={draft.userLabel}
              onChange={(e) => setDraft((prev) => ({ ...prev, userLabel: e.target.value }))}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-500">임신 상태</span>
            <select
              value={draft.pregnancyStatus ?? 'preparing'}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  pregnancyStatus: e.target.value as PregnancyStatus,
                }))
              }
              className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
            >
              {(Object.keys(PREGNANCY_STATUS_LABELS) as PregnancyStatus[]).map((value) => (
                <option key={value} value={value}>
                  {PREGNANCY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          {draft.pregnancyStatus === 'pregnant' && (
            <>
              <label className="block">
                <span className="text-sm text-gray-500">태명</span>
                <input
                  value={draft.babyName}
                  onChange={(e) => setDraft((prev) => ({ ...prev, babyName: e.target.value }))}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">임신 주차</span>
                <input
                  type="number"
                  min={1}
                  max={42}
                  value={draft.pregnancyWeek ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      pregnancyWeek: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-500">출산 예정일</span>
                <input
                  type="date"
                  value={draft.dueDate ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, dueDate: e.target.value || null }))
                  }
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
                />
              </label>
            </>
          )}
          {draft.pregnancyStatus === 'preparing' && (
            <label className="block">
              <span className="text-sm text-gray-500">준비 시작일 또는 기준일</span>
              <input
                type="date"
                value={draft.preparationStartDate ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    preparationStartDate: e.target.value || null,
                  }))
                }
                className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
              />
            </label>
          )}
          {draft.pregnancyStatus === 'postpartum' && (
            <label className="block">
              <span className="text-sm text-gray-500">출산일 또는 아기 생년월일</span>
              <input
                type="date"
                value={draft.postpartumDate ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    postpartumDate: e.target.value || null,
                  }))
                }
                className="mt-1 min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900"
              />
            </label>
          )}
          <fieldset>
            <legend className="text-sm text-gray-500">관심 케어 항목</legend>
            <div className="mt-2 space-y-2">
              {CARE_INTEREST_OPTIONS.map((interest) => (
                <label key={interest} className="flex min-h-[44px] items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={draft.careInterests.includes(interest)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        careInterests: e.target.checked
                          ? [...prev.careInterests, interest]
                          : prev.careInterests.filter((item) => item !== interest),
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {interest}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-[44px] items-center justify-between gap-3">
            <span className="text-sm text-gray-500">배우자 연결</span>
            <input
              type="checkbox"
              checked={draft.spouseConnected}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, spouseConnected: e.target.checked }))
              }
              className="h-5 w-5 rounded border-gray-300"
            />
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="min-h-[44px] flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft)
                setIsEditing(false)
              }}
              className="min-h-[44px] flex-1 rounded-2xl bg-rose-500 px-4 text-sm font-semibold text-white"
            >
              저장
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
