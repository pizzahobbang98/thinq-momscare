import type { ReactNode } from "react";
import { Wind, Lightbulb, Snowflake, Tv, Bot, Refrigerator, Power } from "lucide-react";
import { useAppStore } from "../store";
import { CARE_MODE_LABEL, type CareModeKey } from "../data";
import { SectionCard } from "../components/cards";

const MODES: CareModeKey[] = ["basic", "nausea", "sleep", "housework"];
const PURIFIER_LEVELS = ["약", "중", "강풍", "저소음"];

export function HomeCareScreen() {
  const { state, applyCareMode, patchDevices } = useAppStore();
  const { homeCare, profile } = state;
  const d = homeCare.devices;
  const has = (id: string) => profile.appliances.includes(id);

  return (
    <div className="homecare-screen">
      <header className="screen-title-row">
        <h2 className="screen-title">홈케어</h2>
        {homeCare.updatedAt && <span className="screen-sub">{homeCare.updatedAt} 업데이트</span>}
      </header>

      <SectionCard className={`mode-hero hero-${homeCare.mode}`}>
        <em className="mode-hero-label">현재 실행 모드</em>
        <strong className="mode-hero-title">{CARE_MODE_LABEL[homeCare.mode]}</strong>
        <p className="mode-hero-desc">{homeCare.momPoom[0]}</p>
        <div className="mode-chip-row">
          {MODES.map((m) => (
            <button
              key={m}
              className={`mode-chip${homeCare.mode === m ? " active" : ""}`}
              onClick={() => applyCareMode(m)}
            >
              {CARE_MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </SectionCard>

      {has("airPurifier") && (
        <SectionCard className="device-card">
          <DeviceHead
            icon={<Wind size={20} />}
            name="공기청정기"
            status={d.airPurifier.on ? `${d.airPurifier.level} 운전 중` : "꺼짐"}
            on={d.airPurifier.on}
            onToggle={() =>
              patchDevices({ airPurifier: { ...d.airPurifier, on: !d.airPurifier.on } })
            }
          />
          {d.airPurifier.on && (
            <div className="pill-row">
              {PURIFIER_LEVELS.map((lv) => (
                <button
                  key={lv}
                  className={`pill${d.airPurifier.level === lv ? " active" : ""}`}
                  onClick={() => patchDevices({ airPurifier: { ...d.airPurifier, level: lv } })}
                >
                  {lv}
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {has("light") && (
        <SectionCard className="device-card">
          <DeviceHead
            icon={<Lightbulb size={20} />}
            name="스마트 조명"
            status={d.light.on ? `밝기 ${d.light.brightness}% · ${d.light.tone}` : "꺼짐"}
            on={d.light.on}
            onToggle={() => patchDevices({ light: { ...d.light, on: !d.light.on } })}
          />
          {d.light.on && (
            <input
              className="brightness-slider"
              type="range"
              min={5}
              max={100}
              value={d.light.brightness}
              onChange={(e) =>
                patchDevices({ light: { ...d.light, brightness: Number(e.target.value) } })
              }
            />
          )}
        </SectionCard>
      )}

      {has("aircon") && (
        <SectionCard className="device-card">
          <DeviceHead
            icon={<Snowflake size={20} />}
            name="에어컨"
            status={d.aircon.on ? `${d.aircon.temp}°C · ${d.aircon.mode}` : "대기 중"}
            on={d.aircon.on}
            onToggle={() =>
              patchDevices({
                aircon: { ...d.aircon, on: !d.aircon.on, mode: d.aircon.on ? "대기" : "쾌적 운전" },
              })
            }
          />
          {d.aircon.on && (
            <div className="temp-control">
              <button
                onClick={() =>
                  patchDevices({ aircon: { ...d.aircon, temp: Math.max(18, d.aircon.temp - 1) } })
                }
              >
                −
              </button>
              <strong>{d.aircon.temp}°C</strong>
              <button
                onClick={() =>
                  patchDevices({ aircon: { ...d.aircon, temp: Math.min(30, d.aircon.temp + 1) } })
                }
              >
                +
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {has("tv") && (
        <SectionCard className="device-card">
          <DeviceHead
            icon={<Tv size={20} />}
            name="스탠바이미"
            status={d.tv.on ? "재생 중" : d.tv.note}
            on={d.tv.on}
            onToggle={() => patchDevices({ tv: { ...d.tv, on: !d.tv.on } })}
          />
        </SectionCard>
      )}

      {has("vacuum") && (
        <SectionCard className="device-card">
          <DeviceHead
            icon={<Bot size={20} />}
            name="로봇청소기"
            status={d.vacuum.scheduled ? d.vacuum.note : "대기 중"}
            on={d.vacuum.scheduled}
            onToggle={() =>
              patchDevices({
                vacuum: {
                  scheduled: !d.vacuum.scheduled,
                  note: d.vacuum.scheduled ? "대기 중" : "30분 뒤 청소 예약",
                },
              })
            }
          />
        </SectionCard>
      )}

      {has("fridge") && (
        <SectionCard className="device-card">
          <div className="device-head">
            <span className="device-icon">
              <Refrigerator size={20} />
            </span>
            <div className="device-text">
              <strong>냉장고</strong>
              <em>{d.fridge.note}</em>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function DeviceHead({
  icon,
  name,
  status,
  on,
  onToggle,
}: {
  icon: ReactNode;
  name: string;
  status: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="device-head">
      <span className={`device-icon${on ? " on" : ""}`}>{icon}</span>
      <div className="device-text">
        <strong>{name}</strong>
        <em>{status}</em>
      </div>
      <button className={`power-toggle${on ? " on" : ""}`} onClick={onToggle} aria-label="전원">
        <Power size={16} />
      </button>
    </div>
  );
}
