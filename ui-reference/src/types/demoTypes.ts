export type DemoMode =
  | "idle"
  | "nausea_food"
  | "sleep_care"
  | "housework_care"
  | "destination_forest"
  | "destination_ocean"
  | "destination_city";

export type RoutineTarget =
  | "hub"
  | "airPurifier"
  | "refrigerator"
  | "washerTower"
  | "standbyMe"
  | "airConditioner"
  | "ceilingLight"
  | "routineLog";

export type RoutineStep = {
  time: number;
  target: RoutineTarget;
  action: string;
  payload?: unknown;
};

export type RoutineConfig = {
  mode: DemoMode;
  title: string;
  spokenTrigger: string;
  hubMessage: string;
  steps: RoutineStep[];
};
