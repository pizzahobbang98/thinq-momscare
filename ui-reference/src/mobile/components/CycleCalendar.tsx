import { useState } from "react";
import { ChevronLeft, ChevronRight, Stethoscope } from "lucide-react";
import { cyclePhaseFor, toISO, todayISO, type Profile } from "../data";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CycleCalendar({ profile }: { profile: Profile }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  function move(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayISO();

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: toISO(new Date(year, month, d)) });
  }

  return (
    <div className="cycle-calendar">
      <div className="calendar-head">
        <button className="calendar-nav" onClick={() => move(-1)} aria-label="이전 달">
          <ChevronLeft size={18} />
        </button>
        <strong>
          {year}년 {month + 1}월
        </strong>
        <button className="calendar-nav" onClick={() => move(1)} aria-label="다음 달">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendar-grid weekday-row">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 0 ? "sunday" : undefined}>
            {w}
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`empty-${i}`} className="day-cell empty" />;
          const phase = cyclePhaseFor(
            cell.iso,
            profile.lastPeriodStart,
            profile.cycleLength,
            profile.periodLength
          );
          const isToday = cell.iso === today;
          const isCheckup = cell.iso === profile.checkupDate;
          const classes = ["day-cell", `phase-${phase}`];
          if (isToday) classes.push("today");
          return (
            <span key={cell.iso} className={classes.join(" ")}>
              <span className="day-number">{cell.day}</span>
              {isCheckup && (
                <span className="checkup-dot" title="병원 검진">
                  <Stethoscope size={10} />
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span className="legend-item">
          <i className="legend-swatch swatch-period" /> 생리 예정
        </span>
        <span className="legend-item">
          <i className="legend-swatch swatch-fertile" /> 가임기
        </span>
        <span className="legend-item">
          <i className="legend-swatch swatch-ovulation" /> 배란일
        </span>
        <span className="legend-item">
          <i className="legend-swatch swatch-checkup" /> 검진
        </span>
      </div>
    </div>
  );
}
