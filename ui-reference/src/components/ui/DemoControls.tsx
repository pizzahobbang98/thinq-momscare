import { Bed, Building2, CircleSlash, Leaf, Maximize, Moon, RotateCcw, Soup, Waves } from "lucide-react";
import { useEffect } from "react";
import { koText } from "../../data/koText";
import type { DemoMode } from "../../types/demoTypes";

type DemoControlsProps = {
  mode: DemoMode;
  isRunning: boolean;
  debugMode: boolean;
  onRunRoutine: (mode: Exclude<DemoMode, "idle">) => void;
  onReset: () => void;
  onToggleDebug: () => void;
};

const controls: Array<{
  mode: Exclude<DemoMode, "idle">;
  label: string;
  title: string;
  icon: typeof Soup;
}> = [
  { mode: "nausea_food", label: koText.buttons.nausea_food, title: "1", icon: Soup },
  { mode: "sleep_care", label: koText.buttons.sleep_care, title: "2", icon: Moon },
  { mode: "housework_care", label: koText.buttons.housework_care, title: "3", icon: Bed },
  { mode: "destination_forest", label: koText.buttons.destination_forest, title: "4", icon: Leaf },
  { mode: "destination_ocean", label: koText.buttons.destination_ocean, title: "5", icon: Waves },
  { mode: "destination_city", label: koText.buttons.destination_city, title: "6", icon: Building2 },
];

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen?.();
  }
}

export function DemoControls({
  mode,
  isRunning,
  debugMode,
  onRunRoutine,
  onReset,
  onToggleDebug,
}: DemoControlsProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.key === "1") onRunRoutine("nausea_food");
      if (event.key === "2") onRunRoutine("sleep_care");
      if (event.key === "3") onRunRoutine("housework_care");
      if (event.key === "4") onRunRoutine("destination_forest");
      if (event.key === "5") onRunRoutine("destination_ocean");
      if (event.key === "6") onRunRoutine("destination_city");
      if (event.key === "0") onReset();
      if (event.key.toLowerCase() === "d") onToggleDebug();
      if (event.key.toLowerCase() === "f") toggleFullscreen();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRunRoutine, onReset, onToggleDebug]);

  return (
    <section className={debugMode ? "control-panel debug" : "control-panel"} aria-label="루틴 데모 컨트롤">
      <div className="status-strip">
        <span className={mode !== "idle" ? "status-dot is-on" : "status-dot"} />
        <span>{isRunning ? "실행 중" : mode === "idle" ? "대기" : koText.routines[mode].title}</span>
      </div>
      <div className="mode-buttons">
        {controls.map((control) => {
          const Icon = control.icon;
          return (
            <button
              key={control.mode}
              className={mode === control.mode ? "mode-button active" : "mode-button"}
              type="button"
              title={`${control.label} (${control.title})`}
              onClick={() => onRunRoutine(control.mode)}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{control.label}</span>
            </button>
          );
        })}
      </div>
      <div className="utility-buttons">
        <button className="icon-button" type="button" title="초기화" onClick={onReset}>
          <RotateCcw size={18} strokeWidth={1.9} />
        </button>
        <button className="icon-button" type="button" title="초기화 (0)" onClick={onReset}>
          <CircleSlash size={18} strokeWidth={1.9} />
        </button>
        <button className="icon-button" type="button" title="전체 화면 (F)" onClick={toggleFullscreen}>
          <Maximize size={18} strokeWidth={1.9} />
        </button>
      </div>
    </section>
  );
}
