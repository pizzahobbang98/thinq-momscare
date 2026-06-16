import type { ACMode, AirflowDirection } from "../../../types/appliance";

export type ACModeConfig = {
  temperature: string;
  flapAngle: number;
  louverAngle: number;
  airflowOpacity: number;
  airflowSpeed: number;
  airflowDirection: AirflowDirection;
  displayBrightness: number;
  swingRange: number;
};

export const modeConfigs: Record<ACMode, ACModeConfig> = {
  default: {
    temperature: "24",
    flapAngle: 35,
    louverAngle: 28,
    airflowOpacity: 0.35,
    airflowSpeed: 0.72,
    airflowDirection: "front_soft",
    displayBrightness: 0.88,
    swingRange: 2,
  },
  sleep: {
    temperature: "24",
    flapAngle: 30,
    louverAngle: 18,
    airflowOpacity: 0.25,
    airflowSpeed: 0.5,
    airflowDirection: "upward_soft",
    displayBrightness: 0.45,
    swingRange: 1,
  },
  nausea: {
    temperature: "25",
    flapAngle: 34,
    louverAngle: 24,
    airflowOpacity: 0.35,
    airflowSpeed: 0.64,
    airflowDirection: "circulation",
    displayBrightness: 0.72,
    swingRange: 2,
  },
  destination: {
    temperature: "24",
    flapAngle: 38,
    louverAngle: 30,
    airflowOpacity: 0.4,
    airflowSpeed: 0.82,
    airflowDirection: "breeze",
    displayBrightness: 0.82,
    swingRange: 4,
  },
};

export const idlePose = {
  displayOpacity: 0,
  ledIntensity: 0,
  flapAngle: 0,
  louverAngle: 0,
  airflowOpacity: 0,
  airflowSpeed: 0,
};

export function getModeConfig(mode: ACMode) {
  return modeConfigs[mode];
}
