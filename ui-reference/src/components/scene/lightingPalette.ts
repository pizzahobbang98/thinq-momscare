import type { SceneState } from "../../types/applianceTypes";

// Room surfaces stay neutral. The mood is created by colored LIGHT:
// - moodColor drives a localized ceiling lamp (a real, visible fixture)
// - day drives the window daylight (a neutral anchor so colour reads as light)
const ROOM = {
  floor: "#d8dad7",
  wall: "#ebedea",
  sideWall: "#e4e6e3",
};

export function getLightingPalette(light: SceneState["ceilingLight"]) {
  switch (light.mood) {
    case "calm":
      return { ...ROOM, color: "#ffd9b8", moodColor: "#ffb178", background: "#ece0d2", ambient: 0.26, key: 0.55, ceiling: 6.6, day: 0.7 };
    case "sleep":
      return { ...ROOM, color: "#ffcaa0", moodColor: "#ff9a52", background: "#130d09", ambient: 0.07, key: 0.14, ceiling: 2.6, day: 0.1 };
    case "forest":
      return { ...ROOM, color: "#cbe9b6", moodColor: "#82d16b", background: "#e1ecdc", ambient: 0.3, key: 0.58, ceiling: 6.2, day: 0.95 };
    case "ocean":
      return { ...ROOM, color: "#bfe2f6", moodColor: "#4fb4ea", background: "#dce8f0", ambient: 0.32, key: 0.6, ceiling: 7.0, day: 1.05 };
    case "city":
      return { ...ROOM, color: "#ffd8a8", moodColor: "#ffa747", background: "#e6dbca", ambient: 0.26, key: 0.5, ceiling: 6.0, day: 0.7 };
    default:
      return { ...ROOM, color: "#fff3e4", moodColor: "#ffe7c8", background: "#e9edea", ambient: 0.36, key: 0.85, ceiling: 6.8, day: 1.15 };
  }
}
