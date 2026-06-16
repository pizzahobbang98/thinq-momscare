import { Home, BookHeart, Fan, Settings } from "lucide-react";

export type TabKey = "home" | "records" | "homecare" | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Home }> = [
  { key: "home", label: "홈", icon: Home },
  { key: "records", label: "기록", icon: BookHeart },
  { key: "homecare", label: "홈케어", icon: Fan },
  { key: "settings", label: "설정", icon: Settings },
];

// 불규칙한 바코드형(파형) 음성허브 아이콘 — 마이크 모양 X, 텍스트 라벨 X
export function VoiceHubIcon({ size = 26 }: { size?: number }) {
  const bars = [9, 16, 23, 12, 26, 17, 8];
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={2 + i * 4}
          y={15 - h / 2}
          width={2.4}
          height={h}
          rx={1.2}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export function BottomNav({
  tab,
  onTab,
  onVoice,
}: {
  tab: TabKey;
  onTab: (tab: TabKey) => void;
  onVoice: () => void;
}) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav className="bottom-nav">
      {left.map((t) => (
        <NavButton key={t.key} item={t} active={tab === t.key} onClick={() => onTab(t.key)} />
      ))}
      <button className="voice-hub-button" onClick={onVoice} aria-label="음성허브">
        <VoiceHubIcon />
      </button>
      {right.map((t) => (
        <NavButton key={t.key} item={t} active={tab === t.key} onClick={() => onTab(t.key)} />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button className={`nav-button${active ? " active" : ""}`} onClick={onClick}>
      <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
      <span>{item.label}</span>
    </button>
  );
}
