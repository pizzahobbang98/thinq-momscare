export type ACState =
  | "idle"
  | "powering_on"
  | "flap_opening"
  | "louver_adjusting"
  | "airflow_active"
  | "running"
  | "powering_off";

export type ACMode = "default" | "sleep" | "nausea" | "destination";

export type AirflowDirection =
  | "front_soft"
  | "upward_soft"
  | "circulation"
  | "breeze";
