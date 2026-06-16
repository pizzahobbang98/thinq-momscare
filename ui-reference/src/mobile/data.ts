// 맘스케어 앱 공용 타입 · 상수 · 날짜 유틸

export type Role = "mom" | "dad";
export type Stage = "prep" | "pregnancy" | "parenting";
export type CareModeKey = "basic" | "nausea" | "sleep" | "housework";

export type Profile = {
  registered: boolean;
  role: Role;
  stage: Stage;
  momName: string;
  dadName: string;
  // 임신준비
  lastPeriodStart: string; // ISO yyyy-mm-dd
  cycleLength: number;
  periodLength: number;
  checkupDate: string; // ISO
  // 임신중
  pregnancyWeek: number;
  // 육아중
  babyName: string;
  babyBirth: string; // ISO
  concerns: string[];
  appliances: string[];
  spouseConnected: boolean;
  allowNotification: boolean;
  allowMic: boolean;
};

export type DeviceState = {
  airPurifier: { on: boolean; level: string };
  light: { on: boolean; brightness: number; tone: string };
  aircon: { on: boolean; temp: number; mode: string };
  tv: { on: boolean; note: string };
  vacuum: { scheduled: boolean; note: string };
  fridge: { note: string };
};

export type DayLog = {
  id: number;
  date: string; // ISO
  stage: Stage;
  title: string;
  mood: string;
  lines: string[];
};

export type BabyEvent = {
  id: number;
  type: "feed" | "sleep" | "diaper";
  time: string; // HH:mm
};

export type HomeCareState = {
  mode: CareModeKey;
  devices: DeviceState;
  updatedAt: string;
  momPoom: string[]; // 엄마품 카드 문구 (엄마 앱 전용)
  dadTitle: string; // 아빠손길 카드 타이틀 (아빠 앱 전용)
  dadLines: string[]; // 아빠손길 추천 행동 팁
};

// ---------------------------------------------------------------- 상수

export const CONCERN_OPTIONS: Record<Stage, string[]> = {
  prep: ["생리주기 불규칙", "검진 준비", "영양제 루틴", "수면 질", "스트레스", "체중 관리"],
  pregnancy: ["입덧·냄새 민감", "피로·수면", "허리 통증", "부종", "감정 기복", "식단 고민"],
  parenting: ["밤중 수유", "수면 교육", "이유식", "예방접종", "발달 체크", "육아 분담"],
};

export const APPLIANCE_OPTIONS = [
  { id: "airPurifier", label: "공기청정기", icon: "🌀" },
  { id: "light", label: "스마트 조명", icon: "💡" },
  { id: "aircon", label: "에어컨", icon: "❄️" },
  { id: "tv", label: "스탠바이미", icon: "📺" },
  { id: "washer", label: "워시타워", icon: "🫧" },
  { id: "fridge", label: "냉장고", icon: "🧊" },
  { id: "vacuum", label: "로봇청소기", icon: "🤖" },
];

export const CARE_MODE_LABEL: Record<CareModeKey, string> = {
  basic: "기본 모드",
  nausea: "입덧 케어",
  sleep: "수면 케어",
  housework: "가사 도움",
};

export const defaultDevices: DeviceState = {
  airPurifier: { on: true, level: "약" },
  light: { on: true, brightness: 62, tone: "주백색" },
  aircon: { on: false, temp: 24, mode: "대기" },
  tv: { on: false, note: "대기 중" },
  vacuum: { scheduled: false, note: "대기 중" },
  fridge: { note: "정상 보관 중" },
};

// 임신 주차 → 과일 비교
export const FRUIT_BY_WEEK: Array<{
  minWeek: number;
  fruit: string;
  emoji: string;
  size: string;
  weight: string;
}> = [
  { minWeek: 36, fruit: "수박", emoji: "🍉", size: "약 47cm", weight: "약 2.7kg" },
  { minWeek: 32, fruit: "멜론", emoji: "🍈", size: "약 43cm", weight: "약 1.9kg" },
  { minWeek: 29, fruit: "파인애플", emoji: "🍍", size: "약 39cm", weight: "약 1.3kg" },
  { minWeek: 26, fruit: "가지", emoji: "🍆", size: "약 35cm", weight: "약 900g" },
  { minWeek: 23, fruit: "옥수수", emoji: "🌽", size: "약 30cm", weight: "약 600g" },
  { minWeek: 20, fruit: "바나나", emoji: "🍌", size: "약 25cm", weight: "약 320g" },
  { minWeek: 18, fruit: "망고", emoji: "🥭", size: "약 14cm", weight: "약 190g" },
  { minWeek: 16, fruit: "아보카도", emoji: "🥑", size: "약 11.5cm", weight: "약 100g" },
  { minWeek: 14, fruit: "레몬", emoji: "🍋", size: "약 8.5cm", weight: "약 45g" },
  { minWeek: 12, fruit: "라임", emoji: "🍏", size: "약 6cm", weight: "약 18g" },
  { minWeek: 9, fruit: "딸기", emoji: "🍓", size: "약 3cm", weight: "약 4g" },
  { minWeek: 0, fruit: "블루베리", emoji: "🫐", size: "약 1cm", weight: "약 1g" },
];

export function fruitForWeek(week: number) {
  return FRUIT_BY_WEEK.find((f) => week >= f.minWeek) ?? FRUIT_BY_WEEK[FRUIT_BY_WEEK.length - 1];
}

// 임신 주차별 다음 검진 안내
export function checkupForWeek(week: number): { name: string; window: string } {
  if (week < 11) return { name: "1차 기형아 검사 (NT 초음파)", window: "11~13주" };
  if (week < 16) return { name: "2차 기형아 검사 (쿼드)", window: "15~20주" };
  if (week < 20) return { name: "정밀 초음파", window: "20~24주" };
  if (week < 24) return { name: "임신성 당뇨 검사", window: "24~28주" };
  if (week < 28) return { name: "빈혈 검사 · Tdap 접종", window: "27~36주" };
  if (week < 36) return { name: "막달 검사", window: "36주~" };
  return { name: "주 1회 정기 검진", window: "매주" };
}

// 아이 월령 → 다음 예방접종
export function vaccineForMonth(month: number): { name: string; due: string } {
  if (month < 1) return { name: "B형간염 2차", due: "생후 1개월" };
  if (month < 2) return { name: "DTaP·폴리오·폐렴구균 1차", due: "생후 2개월" };
  if (month < 4) return { name: "DTaP·폴리오·폐렴구균 2차", due: "생후 4개월" };
  if (month < 6) return { name: "DTaP 3차 · B형간염 3차", due: "생후 6개월" };
  if (month < 12) return { name: "MMR · 수두 1차", due: "생후 12개월" };
  return { name: "DTaP 추가 접종", due: "생후 15~18개월" };
}

export function developmentForMonth(month: number): string {
  if (month < 2) return "소리에 반응하고 엄마 아빠 얼굴을 바라봐요";
  if (month < 4) return "고개를 가누고 옹알이를 시작해요";
  if (month < 6) return "뒤집기를 연습하고 손을 뻗어 장난감을 잡아요";
  if (month < 9) return "혼자 앉고 배밀이로 움직이기 시작해요";
  if (month < 12) return "잡고 일어서고 까꿍 놀이를 좋아해요";
  return "첫 걸음마를 연습하고 간단한 단어를 따라 해요";
}

// ---------------------------------------------------------------- 날짜 유틸

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((fromISO(toIso).getTime() - fromISO(fromIso).getTime()) / 86400000);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function fmtKorean(iso: string): string {
  const d = fromISO(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function ddayLabel(targetIso: string): string {
  const n = diffDays(todayISO(), targetIso);
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export function babyMonths(birthIso: string): number {
  const birth = fromISO(birthIso);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function dueDateFromWeek(week: number): string {
  return addDays(todayISO(), (40 - week) * 7);
}

// 생리주기 계산: 해당 날짜가 어떤 구간인지
export type CyclePhase = "period" | "fertile" | "ovulation" | "none";

export function cyclePhaseFor(
  iso: string,
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number
): CyclePhase {
  const offsetRaw = diffDays(lastPeriodStart, iso);
  const offset = ((offsetRaw % cycleLength) + cycleLength) % cycleLength;
  const ovulation = cycleLength - 14;
  if (offset < periodLength) return "period";
  if (offset === ovulation) return "ovulation";
  if (offset >= ovulation - 4 && offset <= ovulation + 1) return "fertile";
  return "none";
}

export function nextOvulation(lastPeriodStart: string, cycleLength: number): string {
  const ovulationOffset = cycleLength - 14;
  let candidate = addDays(lastPeriodStart, ovulationOffset);
  while (diffDays(todayISO(), candidate) < 0) {
    candidate = addDays(candidate, cycleLength);
  }
  return candidate;
}

export function nextPeriod(lastPeriodStart: string, cycleLength: number): string {
  let candidate = addDays(lastPeriodStart, cycleLength);
  while (diffDays(todayISO(), candidate) < 0) {
    candidate = addDays(candidate, cycleLength);
  }
  return candidate;
}
