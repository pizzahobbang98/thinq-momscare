import { ddayLabel, dueDateFromWeek, fruitForWeek, type Profile } from "../data";

// 임신중 홈 상단: 타이틀 없는 아기 성장 애니메이션 바
export function BabyGrowthBar({ profile }: { profile: Profile }) {
  const week = profile.pregnancyWeek;
  const fruit = fruitForWeek(week);
  const progress = Math.min(100, Math.round((week / 40) * 100));
  const due = dueDateFromWeek(week);

  return (
    <div className="growth-bar-wrap">
      <div className="growth-bar">
        <span className="growth-cloud cloud-a" />
        <span className="growth-cloud cloud-b" />
        <span className="baby-crawler" aria-hidden>
          <span className="baby-bob">👶</span>
        </span>
        <span className="fruit-toy" aria-hidden>
          {fruit.emoji}
        </span>
        <span className="growth-ground" />
        <span className="growth-progress" style={{ width: `${progress}%` }} />
      </div>
      <div className="growth-chips">
        <span className="growth-chip strong">{week}주차</span>
        <span className="growth-chip">
          {fruit.emoji} {fruit.fruit}만 해요 · {fruit.size} · {fruit.weight}
        </span>
        <span className="growth-chip">출산까지 {ddayLabel(due)}</span>
      </div>
    </div>
  );
}
