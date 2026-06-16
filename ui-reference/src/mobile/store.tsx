// 맘스케어 앱 전역 스토어 (localStorage 영속 + 탭 간 동기화)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BabyEvent,
  CareModeKey,
  DayLog,
  DeviceState,
  HomeCareState,
  Profile,
  Role,
} from "./data";
import { defaultDevices, todayISO } from "./data";
import { CARE_PRESETS } from "./careModes";

const STORAGE_KEY = "momscare-app-v1";
const VIEW_ROLE_KEY = "momscare-view-role";

export type AppState = {
  profile: Profile;
  homeCare: HomeCareState;
  condition: string; // 오늘 컨디션 이모지 키
  checklist: Record<string, boolean>; // 부부 준비 체크
  babyEvents: BabyEvent[]; // 오늘 수유/수면/기저귀 기록
  dayLogs: DayLog[];
};

export const defaultProfile: Profile = {
  registered: false,
  role: "mom",
  stage: "pregnancy",
  momName: "지우",
  dadName: "현수",
  lastPeriodStart: "2026-06-02",
  cycleLength: 28,
  periodLength: 5,
  checkupDate: "2026-06-19",
  pregnancyWeek: 18,
  babyName: "봄이",
  babyBirth: "2025-12-20",
  concerns: [],
  appliances: ["airPurifier", "light", "aircon", "tv", "fridge"],
  spouseConnected: false,
  allowNotification: false,
  allowMic: false,
};

const defaultHomeCare: HomeCareState = {
  mode: "basic",
  devices: defaultDevices,
  updatedAt: "",
  momPoom: CARE_PRESETS.basic.momPoom,
  dadTitle: CARE_PRESETS.basic.dadTitle,
  dadLines: CARE_PRESETS.basic.dadLines,
};

const defaultState: AppState = {
  profile: defaultProfile,
  homeCare: defaultHomeCare,
  condition: "",
  checklist: {},
  babyEvents: [
    { id: 1, type: "feed", time: "07:30" },
    { id: 2, type: "diaper", time: "08:10" },
    { id: 3, type: "sleep", time: "09:00" },
  ],
  dayLogs: [],
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...parsed,
      profile: { ...defaultProfile, ...(parsed.profile ?? {}) },
      homeCare: { ...defaultHomeCare, ...(parsed.homeCare ?? {}) },
    };
  } catch {
    return defaultState;
  }
}

type AppStore = {
  state: AppState;
  viewRole: Role; // 이 탭에서 보고 있는 역할 (엄마 앱 / 아빠 앱)
  setViewRole: (role: Role) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: (profile: Profile) => void;
  setCondition: (key: string) => void;
  toggleChecklist: (id: string) => void;
  applyCareMode: (mode: CareModeKey) => void;
  patchDevices: (patch: Partial<DeviceState>) => void;
  addBabyEvent: (type: BabyEvent["type"]) => void;
  addDayLog: (log: Omit<DayLog, "id">) => void;
  resetAll: () => void;
};

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [viewRole, setViewRoleState] = useState<Role>(() => {
    const saved = sessionStorage.getItem(VIEW_ROLE_KEY);
    return saved === "mom" || saved === "dad" ? saved : loadState().profile.role;
  });

  // 영속화
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // 다른 탭(엄마 앱/아빠 앱 동시 시연)과 동기화
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setState(loadState());
        } catch {
          /* noop */
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setViewRole = useCallback((role: Role) => {
    sessionStorage.setItem(VIEW_ROLE_KEY, role);
    setViewRoleState(role);
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const completeOnboarding = useCallback(
    (profile: Profile) => {
      setState((s) => ({ ...s, profile: { ...profile, registered: true } }));
      setViewRole(profile.role);
    },
    [setViewRole]
  );

  const setCondition = useCallback((key: string) => {
    setState((s) => ({ ...s, condition: key }));
  }, []);

  const toggleChecklist = useCallback((id: string) => {
    setState((s) => ({ ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } }));
  }, []);

  const applyCareMode = useCallback((mode: CareModeKey) => {
    const preset = CARE_PRESETS[mode];
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setState((s) => ({
      ...s,
      homeCare: {
        mode,
        devices: preset.devices,
        updatedAt: time,
        momPoom: preset.momPoom,
        dadTitle: preset.dadTitle,
        dadLines: preset.dadLines,
      },
    }));
  }, []);

  const patchDevices = useCallback((patch: Partial<DeviceState>) => {
    setState((s) => ({
      ...s,
      homeCare: { ...s.homeCare, devices: { ...s.homeCare.devices, ...patch } },
    }));
  }, []);

  const addBabyEvent = useCallback((type: BabyEvent["type"]) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setState((s) => ({
      ...s,
      babyEvents: [{ id: Date.now(), type, time }, ...s.babyEvents].slice(0, 20),
    }));
  }, []);

  const addDayLog = useCallback((log: Omit<DayLog, "id">) => {
    setState((s) => {
      const withoutToday = s.dayLogs.filter(
        (l) => !(l.date === log.date && l.stage === log.stage)
      );
      return { ...s, dayLogs: [{ ...log, id: Date.now() }, ...withoutToday].slice(0, 30) };
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(VIEW_ROLE_KEY);
    setState(defaultState);
    setViewRoleState("mom");
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      state,
      viewRole,
      setViewRole,
      updateProfile,
      completeOnboarding,
      setCondition,
      toggleChecklist,
      applyCareMode,
      patchDevices,
      addBabyEvent,
      addDayLog,
      resetAll,
    }),
    [
      state,
      viewRole,
      setViewRole,
      updateProfile,
      completeOnboarding,
      setCondition,
      toggleChecklist,
      applyCareMode,
      patchDevices,
      addBabyEvent,
      addDayLog,
      resetAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppStore must be used within AppStoreProvider");
  return store;
}

export function todayLabel(): string {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

export { todayISO };
