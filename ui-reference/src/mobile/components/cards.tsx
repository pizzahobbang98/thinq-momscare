import type { ReactNode } from "react";
import { Wind, Lightbulb, Snowflake, Tv, Bot, Refrigerator, ChevronRight } from "lucide-react";
import { useAppStore } from "../store";
import { CARE_MODE_LABEL } from "../data";
import { dailyTipFor } from "../careTips";

export function SectionCard({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card${className ? ` ${className}` : ""}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- 오늘 컨디션

const CONDITIONS = [
  { key: "good", emoji: "😊", label: "좋아요" },
  { key: "soso", emoji: "🙂", label: "보통" },
  { key: "tired", emoji: "😪", label: "피곤해요" },
  { key: "nausea", emoji: "🤢", label: "울렁거려요" },
  { key: "hard", emoji: "😢", label: "힘들어요" },
];

export function ConditionCard({ title = "오늘 컨디션" }: { title?: string }) {
  const { state, setCondition } = useAppStore();
  return (
    <SectionCard title={title}>
      <div className="condition-row">
        {CONDITIONS.map((c) => (
          <button
            key={c.key}
            className={`condition-chip${state.condition === c.key ? " selected" : ""}`}
            onClick={() => setCondition(c.key)}
          >
            <span className="condition-emoji">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {state.condition && (
        <p className="condition-note">
          {state.condition === "nausea" || state.condition === "hard" || state.condition === "tired"
            ? "음성허브에 말하면 맞는 홈케어 모드를 추천해드려요."
            : "좋은 하루예요! 컨디션이 기록에 반영돼요."}
        </p>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------- 현재 홈케어 상태

export function HomeCareStatusCard({ onGo }: { onGo?: () => void }) {
  const { state } = useAppStore();
  const { homeCare } = state;
  const d = homeCare.devices;
  const lines = [
    { icon: Wind, text: d.airPurifier.on ? `공기청정기 · ${d.airPurifier.level}` : "공기청정기 꺼짐" },
    { icon: Lightbulb, text: d.light.on ? `조명 밝기 ${d.light.brightness}%` : "조명 꺼짐" },
    { icon: Snowflake, text: d.aircon.on ? `에어컨 ${d.aircon.temp}°C · ${d.aircon.mode}` : "에어컨 대기" },
  ];

  return (
    <SectionCard
      title="현재 홈케어"
      action={
        onGo && (
          <button className="card-link" onClick={onGo}>
            전체보기 <ChevronRight size={14} />
          </button>
        )
      }
    >
      <div className="homecare-mode-row">
        <span className={`mode-badge mode-${homeCare.mode}`}>{CARE_MODE_LABEL[homeCare.mode]}</span>
        {homeCare.updatedAt && <span className="mode-time">{homeCare.updatedAt} 업데이트</span>}
      </div>
      <ul className="device-mini-list">
        {lines.map((l, i) => (
          <li key={i}>
            <l.icon size={15} />
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// ---------------------------------------------------------------- 엄마품 (엄마 앱 전용)

export function MomPoomCard() {
  const { state } = useAppStore();
  const tip = dailyTipFor(state.profile);
  const careActive = state.homeCare.mode !== "basic";

  return (
    <SectionCard title="엄마품" className="care-card mom-card">
      <div className="tip-phase">
        <span className="tip-phase-emoji">{tip.phaseEmoji}</span>
        <span className="tip-phase-label">{tip.phaseLabel}</span>
      </div>
      <p className="tip-emotion">{tip.emotion}</p>
      <div className="tip-group">
        <h4>오늘 나를 위한 케어</h4>
        <ul>
          {tip.momTips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      {careActive && (
        <div className="tip-group ai-group">
          <h4>AI가 집을 이렇게 바꿨어요</h4>
          <ul>
            {state.homeCare.momPoom.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------- 아빠손길 (아빠 앱 전용)

export function DadSonCard() {
  const { state } = useAppStore();
  const tip = dailyTipFor(state.profile);
  const careActive = state.homeCare.mode !== "basic";
  const wife = state.profile.momName;

  return (
    <SectionCard title="아빠손길" className="care-card dad-card">
      <div className="tip-phase">
        <span className="tip-phase-emoji">{tip.phaseEmoji}</span>
        <span className="tip-phase-label">{tip.phaseLabel}</span>
      </div>
      <p className="tip-emotion">
        오늘 {wife} 님은 — {tip.emotion}
      </p>
      <div className="tip-group">
        <h4>이렇게 해보세요</h4>
        <ul>
          {tip.dadTips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="tip-group avoid-group">
        <h4>오늘은 피해주세요</h4>
        <ul>
          {tip.dadAvoid.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      {careActive && (
        <div className="tip-group ai-group">
          <h4>{state.homeCare.dadTitle}</h4>
          <ul>
            {state.homeCare.dadLines.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

// 역할에 맞는 카드 하나만 노출
export function RoleCareCard() {
  const { viewRole } = useAppStore();
  return viewRole === "mom" ? <MomPoomCard /> : <DadSonCard />;
}

export const DEVICE_ICONS = { Wind, Lightbulb, Snowflake, Tv, Bot, Refrigerator };
