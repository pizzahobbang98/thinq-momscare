import type { RoutineConfig } from "../../types/demoTypes";
import { koText } from "../../data/koText";

export const routineConfigs: Record<string, RoutineConfig> = {
  nausea_food: {
    mode: "nausea_food",
    title: koText.routines.nausea_food.title,
    spokenTrigger: koText.routines.nausea_food.trigger,
    hubMessage: koText.routines.nausea_food.speech,
    steps: [
      { time: 0, target: "hub", action: "thinking", payload: true },
      {
        time: 0.2,
        target: "hub",
        action: "speak",
        payload: koText.routines.nausea_food.speech,
      },
      { time: 0.3, target: "airPurifier", action: "power_on_real", payload: { level: "normal" } },
      { time: 0.4, target: "refrigerator", action: "start_scan", payload: true },
      {
        time: 0.8,
        target: "refrigerator",
        action: "filter_ingredients",
        payload: {
          excludedIngredients: ["생선", "강한 향신료", "기름진 음식"],
          highlightedIngredients: ["두부", "계란", "요거트", "과일"],
        },
      },
      { time: 1.0, target: "airConditioner", action: "power_on", payload: { mode: "circulation" } },
      {
        time: 1.2,
        target: "ceilingLight",
        action: "set_mood",
        payload: { mood: "calm", brightness: 0.55, colorTemp: 3600, color: "#fff1e8" },
      },
      {
        time: 1.7,
        target: "standbyMe",
        action: "show_content",
        payload: { power: true, content: "food_recommendation", screenBrightness: 1 },
      },
      {
        time: 2.4,
        target: "routineLog",
        action: "add",
        payload: koText.routines.nausea_food.log,
      },
    ],
  },
  sleep_care: {
    mode: "sleep_care",
    title: koText.routines.sleep_care.title,
    spokenTrigger: koText.routines.sleep_care.trigger,
    hubMessage: koText.routines.sleep_care.speech,
    steps: [
      { time: 0, target: "hub", action: "thinking", payload: true },
      {
        time: 0.2,
        target: "hub",
        action: "speak",
        payload: koText.routines.sleep_care.speech,
      },
      { time: 0.3, target: "airPurifier", action: "power_on_real", payload: { level: "sleep" } },
      {
        time: 0.5,
        target: "ceilingLight",
        action: "set_mood",
        payload: { mood: "sleep", brightness: 0.22, colorTemp: 2700, color: "#ffd8b8" },
      },
      {
        time: 0.6,
        target: "standbyMe",
        action: "fade_off",
        payload: { content: "sleep_fade", screenBrightness: 0 },
      },
      { time: 0.8, target: "airConditioner", action: "power_on", payload: { mode: "sleep" } },
      {
        time: 2.2,
        target: "routineLog",
        action: "add",
        payload: koText.routines.sleep_care.log,
      },
    ],
  },
  housework_care: {
    mode: "housework_care",
    title: koText.routines.housework_care.title,
    spokenTrigger: koText.routines.housework_care.trigger,
    hubMessage: koText.routines.housework_care.speech,
    steps: [
      { time: 0, target: "hub", action: "thinking", payload: true },
      {
        time: 0.2,
        target: "hub",
        action: "speak",
        payload: koText.routines.housework_care.speech,
      },
      { time: 0.4, target: "washerTower", action: "panel_on", payload: true },
      { time: 0.8, target: "washerTower", action: "set_status", payload: { status: "care_hold" } },
      { time: 1.1, target: "washerTower", action: "drum_gentle_motion", payload: true },
      { time: 1.3, target: "washerTower", action: "group_alerts", payload: true },
      { time: 1.6, target: "washerTower", action: "show_partner_share", payload: true },
      {
        time: 1.8,
        target: "ceilingLight",
        action: "set_mood",
        payload: { mood: "neutral", brightness: 0.65, colorTemp: 3800, color: "#fff4e6" },
      },
      {
        time: 2.3,
        target: "routineLog",
        action: "add",
        payload: koText.routines.housework_care.log,
      },
    ],
  },
  destination_forest: destinationRoutine("destination_forest", "Forest", "forest", {
    mood: "forest",
    brightness: 0.68,
    colorTemp: 4200,
    color: "#e8f4df",
  }),
  destination_ocean: destinationRoutine("destination_ocean", "Ocean", "ocean", {
    mood: "ocean",
    brightness: 0.72,
    colorTemp: 5200,
    color: "#e3f4ff",
  }),
  destination_city: destinationRoutine("destination_city", "City", "city", {
    mood: "city",
    brightness: 0.58,
    colorTemp: 3200,
    color: "#ffe1b5",
  }),
};

function destinationRoutine(
  mode: "destination_forest" | "destination_ocean" | "destination_city",
  title: string,
  content: "forest" | "ocean" | "city",
  light: { mood: string; brightness: number; colorTemp: number; color: string }
): RoutineConfig {
  return {
    mode,
    title: koText.routines[mode].title,
    spokenTrigger: koText.routines[mode].trigger,
    hubMessage: koText.routines[mode].speech,
    steps: [
      { time: 0, target: "hub", action: "thinking", payload: true },
      {
        time: 0.2,
        target: "hub",
        action: "speak",
        payload: koText.routines[mode].speech,
      },
      {
        time: 0.4,
        target: "standbyMe",
        action: "show_content",
        payload: { power: true, content, screenBrightness: 1 },
      },
      { time: 0.5, target: "airPurifier", action: "power_on_real", payload: { level: "normal" } },
      { time: 0.7, target: "ceilingLight", action: "set_mood", payload: light },
      { time: 0.9, target: "airConditioner", action: "power_on", payload: { mode: "breeze" } },
      {
        time: 2.4,
        target: "routineLog",
        action: "add",
        payload: koText.routines[mode].log,
      },
    ],
  };
}
