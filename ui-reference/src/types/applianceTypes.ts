import type { DemoMode } from "./demoTypes";

export type AirPurifierLevel = "off" | "low" | "normal" | "sleep";
export type StandbyMeContent =
  | "off"
  | "food_recommendation"
  | "forest"
  | "ocean"
  | "city"
  | "sleep_fade";
export type ACSceneMode = "off" | "sleep" | "circulation" | "breeze";
export type StandingACState =
  | "idle"
  | "powering_on"
  | "display_on"
  | "vent_opening"
  | "louver_adjusting"
  | "airflow_active"
  | "running"
  | "powering_off";
export type CeilingMood =
  | "neutral"
  | "calm"
  | "sleep"
  | "forest"
  | "ocean"
  | "city";

export type SceneState = {
  mode: DemoMode;
  debugMode: boolean;
  isRoutineRunning: boolean;
  routineToken: number;
  hub: {
    listening: boolean;
    thinking: boolean;
    speaking: boolean;
    message: string;
  };
  airPurifier: {
    power: boolean;
    level: AirPurifierLevel;
    realDeviceConnected: boolean;
  };
  refrigerator: {
    scanActive: boolean;
    doorGlow: boolean;
    highlightedIngredients: string[];
    excludedIngredients: string[];
    recommendationVisible: boolean;
  };
  washerTower: {
    panelOn: boolean;
    drumActive: boolean;
    status: "idle" | "done" | "care_hold" | "wrinkle_care";
    groupedAlert: boolean;
    partnerShareVisible: boolean;
  };
  standbyMe: {
    power: boolean;
    content: StandbyMeContent;
    screenBrightness: number;
  };
  airConditioner: {
    power: boolean;
    state: StandingACState;
    mode: ACSceneMode;
    displayBrightness: number;
    ventDoorAngle: number;
    louverAngle: number;
    airflowOpacity: number;
    airflowSpeed: number;
    swingRange: number;
  };
  ceilingLight: {
    brightness: number;
    color: string;
    colorTemp: number;
    mood: CeilingMood;
  };
  routineLog: string[];
};
