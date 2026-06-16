import { Baby, CalendarHeart, Syringe, Moon, Milk, Sticker } from "lucide-react";
import { useAppStore, todayLabel } from "../store";
import {
  babyMonths,
  checkupForWeek,
  ddayLabel,
  developmentForMonth,
  fmtKorean,
  nextOvulation,
  nextPeriod,
  vaccineForMonth,
} from "../data";
import { SectionCard, ConditionCard, HomeCareStatusCard, RoleCareCard } from "../components/cards";
import { CycleCalendar } from "../components/CycleCalendar";
import { BabyGrowthBar } from "../components/BabyGrowthBar";

export function HomeScreen({ onGoHomeCare }: { onGoHomeCare?: () => void }) {
  const { state, viewRole } = useAppStore();
  const { profile } = state;
  const name = viewRole === "mom" ? profile.momName : profile.dadName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "편안한 저녁이에요";

  return (
    <div className="home-screen">
      <header className="home-head">
        <div>
          <p className="home-date">{todayLabel()}</p>
          <h2 className="home-greeting">
            {greeting}, {name} 님
          </h2>
        </div>
        <span className="thinq-chip">ThinQ ON</span>
      </header>

      {profile.stage === "prep" && <PrepHome onGoHomeCare={onGoHomeCare} />}
      {profile.stage === "pregnancy" && <PregnancyHome onGoHomeCare={onGoHomeCare} />}
      {profile.stage === "parenting" && <ParentingHome onGoHomeCare={onGoHomeCare} />}
    </div>
  );
}

// ---------------------------------------------------------------- 임신준비 홈

const PREP_CHECKLIST = [
  { id: "folate", label: "엽산 챙겨먹기 (둘 다!)" },
  { id: "checkup", label: "검진 예약 확인하기" },
  { id: "caffeine", label: "카페인 줄이기" },
  { id: "walk", label: "함께 30분 산책" },
  { id: "sleep", label: "12시 전에 잠들기" },
];

function PrepHome({ onGoHomeCare }: { onGoHomeCare?: () => void }) {
  const { state, toggleChecklist } = useAppStore();
  const { profile } = state;
  const ovulation = nextOvulation(profile.lastPeriodStart, profile.cycleLength);
  const period = nextPeriod(profile.lastPeriodStart, profile.cycleLength);
  const doneCount = PREP_CHECKLIST.filter((c) => state.checklist[c.id]).length;

  return (
    <>
      <div className="dday-strip">
        <div className="dday-chip ovulation">
          <em>다음 배란일</em>
          <strong>{ddayLabel(ovulation)}</strong>
          <span>{fmtKorean(ovulation)}</span>
        </div>
        <div className="dday-chip period">
          <em>다음 생리</em>
          <strong>{ddayLabel(period)}</strong>
          <span>{fmtKorean(period)}</span>
        </div>
        <div className="dday-chip checkup">
          <em>병원 검진</em>
          <strong>{ddayLabel(profile.checkupDate)}</strong>
          <span>{fmtKorean(profile.checkupDate)}</span>
        </div>
      </div>

      <SectionCard title="검진 · 주기 캘린더">
        <CycleCalendar profile={profile} />
      </SectionCard>

      <ConditionCard />

      <SectionCard
        title="부부 준비 체크"
        action={
          <span className="check-count">
            {doneCount}/{PREP_CHECKLIST.length}
          </span>
        }
      >
        <ul className="checklist">
          {PREP_CHECKLIST.map((c) => (
            <li key={c.id}>
              <button
                className={`check-item${state.checklist[c.id] ? " done" : ""}`}
                onClick={() => toggleChecklist(c.id)}
              >
                <span className="check-box" />
                <span>{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      <HomeCareStatusCard onGo={onGoHomeCare} />
      <RoleCareCard />
    </>
  );
}

// ---------------------------------------------------------------- 임신중 홈

function PregnancyHome({ onGoHomeCare }: { onGoHomeCare?: () => void }) {
  const { state } = useAppStore();
  const { profile } = state;
  const checkup = checkupForWeek(profile.pregnancyWeek);

  return (
    <>
      <BabyGrowthBar profile={profile} />

      <SectionCard title="다가오는 검진">
        <div className="checkup-row">
          <span className="checkup-icon">
            <CalendarHeart size={20} />
          </span>
          <div className="checkup-text">
            <strong>{checkup.name}</strong>
            <em>{checkup.window} 권장</em>
          </div>
        </div>
      </SectionCard>

      <ConditionCard />
      <HomeCareStatusCard onGo={onGoHomeCare} />
      <RoleCareCard />
    </>
  );
}

// ---------------------------------------------------------------- 육아중 홈

const EVENT_META = {
  feed: { label: "수유", icon: Milk },
  sleep: { label: "수면", icon: Moon },
  diaper: { label: "기저귀", icon: Sticker },
} as const;

function ParentingHome({ onGoHomeCare }: { onGoHomeCare?: () => void }) {
  const { state, addBabyEvent } = useAppStore();
  const { profile } = state;
  const months = babyMonths(profile.babyBirth);
  const vaccine = vaccineForMonth(months);

  return (
    <>
      <SectionCard className="baby-card">
        <div className="baby-head">
          <span className="baby-avatar">
            <Baby size={26} />
          </span>
          <div>
            <strong className="baby-name">{profile.babyName}</strong>
            <em className="baby-age">생후 {months}개월</em>
          </div>
        </div>
        <p className="baby-dev">{developmentForMonth(months)}</p>
      </SectionCard>

      <SectionCard title="오늘 돌봄 루틴">
        <div className="routine-grid">
          {(Object.keys(EVENT_META) as Array<keyof typeof EVENT_META>).map((type) => {
            const meta = EVENT_META[type];
            const events = state.babyEvents.filter((e) => e.type === type);
            const last = events[0];
            const Icon = meta.icon;
            return (
              <div key={type} className={`routine-tile routine-${type}`}>
                <Icon size={18} />
                <strong>{meta.label}</strong>
                <em>{last ? `${last.time} 마지막` : "기록 없음"}</em>
                <span className="routine-count">오늘 {events.length}회</span>
                <button className="routine-add" onClick={() => addBabyEvent(type)}>
                  + 기록
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="예방접종">
        <div className="checkup-row">
          <span className="checkup-icon vaccine">
            <Syringe size={20} />
          </span>
          <div className="checkup-text">
            <strong>{vaccine.name}</strong>
            <em>{vaccine.due} 권장 접종</em>
          </div>
        </div>
      </SectionCard>

      <ConditionCard title="오늘 아이 컨디션" />
      <HomeCareStatusCard onGo={onGoHomeCare} />
      <RoleCareCard />
    </>
  );
}
