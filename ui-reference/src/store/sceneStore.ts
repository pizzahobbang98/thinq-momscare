import { useCallback, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { DemoMode, RoutineConfig, RoutineStep } from "../types/demoTypes";
import type { SceneState } from "../types/applianceTypes";
import { routineConfigs } from "../components/orchestrator/routineConfigs";
import { turnOnAirPurifier } from "../components/appliances/AirPurifierProxy/useRealAirPurifierControl";
import { koText } from "../data/koText";

const initialSceneState: SceneState = {
  mode: "idle",
  debugMode: false,
  isRoutineRunning: false,
  routineToken: 0,
  hub: {
    listening: false,
    thinking: false,
    speaking: false,
    message: koText.idleSubtitle,
  },
  airPurifier: {
    power: false,
    level: "off",
    realDeviceConnected: true,
  },
  refrigerator: {
    scanActive: false,
    doorGlow: false,
    highlightedIngredients: [],
    excludedIngredients: [],
    recommendationVisible: false,
  },
  washerTower: {
    panelOn: false,
    drumActive: false,
    status: "idle",
    groupedAlert: false,
    partnerShareVisible: false,
  },
  standbyMe: {
    power: false,
    content: "off",
    screenBrightness: 0,
  },
  airConditioner: {
    power: false,
    state: "idle",
    mode: "off",
    displayBrightness: 0,
    ventDoorAngle: 0,
    louverAngle: 0,
    airflowOpacity: 0,
    airflowSpeed: 0,
    swingRange: 0,
  },
  ceilingLight: {
    brightness: 0.62,
    color: "#fff5ea",
    colorTemp: 3800,
    mood: "neutral",
  },
  routineLog: [],
};

export function useSceneStore() {
  const [sceneState, setSceneState] = useState<SceneState>(initialSceneState);
  const tokenRef = useRef(0);

  const applyStep = useCallback((step: RoutineStep) => {
    setSceneState((current) => reduceStep(current, step));
    if (step.target === "airPurifier" && step.action === "power_on_real") {
      const level = (step.payload as { level?: "low" | "normal" | "sleep" })?.level ?? "normal";
      void turnOnAirPurifier(level).catch(() => undefined);
    }
  }, []);

  const runRoutine = useCallback(
    (mode: Exclude<DemoMode, "idle">) => {
      const config = routineConfigs[mode];
      const token = tokenRef.current + 1;
      tokenRef.current = token;

      setSceneState({
        ...initialSceneState,
        debugMode: sceneState.debugMode,
        mode,
        isRoutineRunning: true,
        routineToken: token,
        hub: {
          listening: false,
          thinking: true,
          speaking: false,
          message: config.hubMessage,
        },
      });

      runTimeline(config, token, tokenRef, applyStep, () => {
        setSceneState((current) =>
          current.routineToken === token
            ? { ...current, isRoutineRunning: false, hub: { ...current.hub, thinking: false } }
            : current
        );
      });
    },
    [applyStep, sceneState.debugMode]
  );

  const reset = useCallback(() => {
    tokenRef.current += 1;
    setSceneState((current) => ({
      ...initialSceneState,
      debugMode: current.debugMode,
      routineToken: tokenRef.current,
    }));
  }, []);

  const toggleDebug = useCallback(() => {
    setSceneState((current) => ({ ...current, debugMode: !current.debugMode }));
  }, []);

  const setAgentResponse = useCallback((message: string) => {
    setSceneState((current) => ({
      ...current,
      hub: {
        listening: false,
        thinking: false,
        speaking: true,
        message,
      },
    }));
  }, []);

  const setHubThinking = useCallback((message: string) => {
    setSceneState((current) => ({
      ...current,
      hub: {
        listening: false,
        thinking: true,
        speaking: false,
        message,
      },
    }));
  }, []);

  return useMemo(
    () => ({
      sceneState,
      activeRoutine: sceneState.mode === "idle" ? undefined : routineConfigs[sceneState.mode],
      runRoutine,
      reset,
      toggleDebug,
      setAgentResponse,
      setHubThinking,
    }),
    [sceneState, runRoutine, reset, toggleDebug, setAgentResponse, setHubThinking]
  );
}

function runTimeline(
  config: RoutineConfig,
  token: number,
  tokenRef: MutableRefObject<number>,
  applyStep: (step: RoutineStep) => void,
  onComplete: () => void
) {
  const start = performance.now();
  const completed = new Set<number>();
  const endMs = Math.max(...config.steps.map((step) => step.time)) * 1000 + 900;

  function tick(now: number) {
    if (tokenRef.current !== token) return;

    const elapsed = now - start;
    config.steps.forEach((step, index) => {
      if (!completed.has(index) && elapsed >= step.time * 1000) {
        completed.add(index);
        applyStep(step);
      }
    });

    if (elapsed < endMs) {
      requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(tick);
}

function reduceStep(state: SceneState, step: RoutineStep): SceneState {
  const payload = step.payload as Record<string, unknown> | undefined;

  if (step.target === "hub") {
    if (step.action === "thinking") {
      return { ...state, hub: { ...state.hub, thinking: Boolean(step.payload) } };
    }
    if (step.action === "speak") {
      return {
        ...state,
        hub: { listening: false, thinking: false, speaking: true, message: String(step.payload) },
      };
    }
  }

  if (step.target === "airPurifier" && step.action === "power_on_real") {
    return {
      ...state,
      airPurifier: {
        ...state.airPurifier,
        power: true,
        level: (payload?.level as SceneState["airPurifier"]["level"]) ?? "normal",
      },
    };
  }

  if (step.target === "refrigerator") {
    if (step.action === "start_scan") {
      return {
        ...state,
        refrigerator: { ...state.refrigerator, scanActive: true, doorGlow: true },
      };
    }
    if (step.action === "filter_ingredients") {
      return {
        ...state,
        refrigerator: {
          ...state.refrigerator,
          highlightedIngredients: (payload?.highlightedIngredients as string[]) ?? [],
          excludedIngredients: (payload?.excludedIngredients as string[]) ?? [],
          recommendationVisible: true,
        },
      };
    }
  }

  if (step.target === "washerTower") {
    if (step.action === "panel_on") {
      return { ...state, washerTower: { ...state.washerTower, panelOn: true } };
    }
    if (step.action === "set_status") {
      return {
        ...state,
        washerTower: {
          ...state.washerTower,
          panelOn: true,
          status: (payload?.status as SceneState["washerTower"]["status"]) ?? "care_hold",
        },
      };
    }
    if (step.action === "drum_gentle_motion") {
      return { ...state, washerTower: { ...state.washerTower, drumActive: true } };
    }
    if (step.action === "group_alerts") {
      return { ...state, washerTower: { ...state.washerTower, groupedAlert: true } };
    }
    if (step.action === "show_partner_share") {
      return { ...state, washerTower: { ...state.washerTower, partnerShareVisible: true } };
    }
  }

  if (step.target === "standbyMe") {
    if (step.action === "show_content") {
      return {
        ...state,
        standbyMe: {
          power: Boolean(payload?.power ?? true),
          content: (payload?.content as SceneState["standbyMe"]["content"]) ?? "forest",
          screenBrightness: Number(payload?.screenBrightness ?? 1),
        },
      };
    }
    if (step.action === "fade_off") {
      return {
        ...state,
        standbyMe: {
          power: true,
          content: "sleep_fade",
          screenBrightness: Number(payload?.screenBrightness ?? 0),
        },
      };
    }
  }

  if (step.target === "airConditioner" && step.action === "power_on") {
    const mode = (payload?.mode as SceneState["airConditioner"]["mode"]) ?? "circulation";
    const config = {
      sleep: { ventDoorAngle: 30, louverAngle: 18, airflowOpacity: 0.34, airflowSpeed: 0.32, swingRange: 2, displayBrightness: 0.48 },
      circulation: { ventDoorAngle: 36, louverAngle: 27, airflowOpacity: 0.54, airflowSpeed: 0.42, swingRange: 5, displayBrightness: 0.78 },
      breeze: { ventDoorAngle: 38, louverAngle: 33, airflowOpacity: 0.66, airflowSpeed: 0.5, swingRange: 8, displayBrightness: 0.86 },
      off: { ventDoorAngle: 0, louverAngle: 0, airflowOpacity: 0, airflowSpeed: 0, swingRange: 0, displayBrightness: 0 },
    }[mode];

    return {
      ...state,
      airConditioner: {
        ...state.airConditioner,
        power: true,
        state: "running",
        mode,
        ...config,
      },
    };
  }

  if (step.target === "ceilingLight" && step.action === "set_mood") {
    return {
      ...state,
      ceilingLight: {
        mood: (payload?.mood as SceneState["ceilingLight"]["mood"]) ?? "neutral",
        brightness: Number(payload?.brightness ?? state.ceilingLight.brightness),
        colorTemp: Number(payload?.colorTemp ?? state.ceilingLight.colorTemp),
        color: String(payload?.color ?? state.ceilingLight.color),
      },
    };
  }

  if (step.target === "routineLog" && step.action === "add") {
    return { ...state, routineLog: [String(step.payload), ...state.routineLog].slice(0, 2) };
  }

  return state;
}
