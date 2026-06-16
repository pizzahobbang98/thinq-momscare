import type { ReactNode } from "react";
import { Link2, Mic, Bell, MonitorPlay, RotateCcw } from "lucide-react";
import { useAppStore } from "../store";
import { APPLIANCE_OPTIONS, type Stage } from "../data";
import { SectionCard } from "../components/cards";

const STAGE_LABEL: Record<Stage, string> = {
  prep: "임신준비",
  pregnancy: "임신중",
  parenting: "육아중",
};

export function SettingsScreen() {
  const { state, viewRole, setViewRole, updateProfile, resetAll } = useAppStore();
  const { profile } = state;

  return (
    <div className="settings-screen">
      <header className="screen-title-row">
        <h2 className="screen-title">설정</h2>
      </header>

      <SectionCard className="profile-card">
        <div className="profile-row">
          <span className="profile-avatar">{viewRole === "mom" ? "🤰" : "👨"}</span>
          <div>
            <strong>{viewRole === "mom" ? profile.momName : profile.dadName} 님</strong>
            <em>
              {viewRole === "mom" ? "엄마" : "아빠"} · {STAGE_LABEL[profile.stage]}
            </em>
          </div>
        </div>
        <div className="role-switch">
          <button className={viewRole === "mom" ? "active" : ""} onClick={() => setViewRole("mom")}>
            엄마 앱 보기
          </button>
          <button className={viewRole === "dad" ? "active" : ""} onClick={() => setViewRole("dad")}>
            아빠 앱 보기
          </button>
        </div>
        <p className="role-switch-hint">
          {viewRole === "mom" ? "엄마품 카드가 표시돼요." : "아빠손길 카드가 표시돼요."}
        </p>
      </SectionCard>

      <SectionCard title="현재 단계">
        <div className="mode-chip-row">
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <button
              key={s}
              className={`mode-chip${profile.stage === s ? " active" : ""}`}
              onClick={() => updateProfile({ stage: s })}
            >
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        {profile.stage === "pregnancy" && (
          <label className="field slim">
            <span>임신 주차 — {profile.pregnancyWeek}주</span>
            <input
              type="range"
              min={4}
              max={40}
              value={profile.pregnancyWeek}
              onChange={(e) => updateProfile({ pregnancyWeek: Number(e.target.value) })}
            />
          </label>
        )}
        {profile.stage === "prep" && (
          <label className="field slim">
            <span>마지막 생리 시작일</span>
            <input
              type="date"
              value={profile.lastPeriodStart}
              onChange={(e) => updateProfile({ lastPeriodStart: e.target.value })}
            />
          </label>
        )}
        {profile.stage === "parenting" && (
          <label className="field slim">
            <span>아이 생년월일</span>
            <input
              type="date"
              value={profile.babyBirth}
              onChange={(e) => updateProfile({ babyBirth: e.target.value })}
            />
          </label>
        )}
      </SectionCard>

      <SectionCard title="배우자 연결">
        <button
          className={`connect-button${profile.spouseConnected ? " connected" : ""}`}
          onClick={() => updateProfile({ spouseConnected: !profile.spouseConnected })}
        >
          <Link2 size={18} />
          {profile.spouseConnected
            ? `${viewRole === "mom" ? profile.dadName : profile.momName} 님과 연결됨`
            : "배우자 연결하기"}
        </button>
      </SectionCard>

      <SectionCard title="연결 가전">
        <div className="appliance-tag-row">
          {profile.appliances.map((id) => {
            const meta = APPLIANCE_OPTIONS.find((a) => a.id === id);
            if (!meta) return null;
            return (
              <span key={id} className="appliance-tag">
                {meta.icon} {meta.label}
              </span>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="권한">
        <ToggleRow
          icon={<Mic size={18} />}
          label="마이크"
          on={profile.allowMic}
          onToggle={() => updateProfile({ allowMic: !profile.allowMic })}
        />
        <ToggleRow
          icon={<Bell size={18} />}
          label="알림"
          on={profile.allowNotification}
          onToggle={() => updateProfile({ allowNotification: !profile.allowNotification })}
        />
      </SectionCard>

      <SectionCard title="시연 도구">
        <button className="tool-button" onClick={() => window.open("/", "_blank")}>
          <MonitorPlay size={18} />
          3D 대시보드 열기
        </button>
        <button className="tool-button danger" onClick={resetAll}>
          <RotateCcw size={18} />
          데모 초기화 (정보등록부터 다시)
        </button>
      </SectionCard>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  on,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="toggle-row">
      <span className="toggle-icon">{icon}</span>
      <span className="toggle-label">{label}</span>
      <button className={`switch${on ? " on" : ""}`} onClick={onToggle} aria-label={label}>
        <span className="switch-knob" />
      </button>
    </div>
  );
}
