// 홈케어 모드 프리셋 + 음성 명령 시나리오

import type { CareModeKey, DeviceState } from "./data";
import { defaultDevices } from "./data";

export type CareModePreset = {
  devices: DeviceState;
  momPoom: string[];
  dadTitle: string;
  dadLines: string[];
};

export const CARE_PRESETS: Record<CareModeKey, CareModePreset> = {
  basic: {
    devices: defaultDevices,
    momPoom: ["집안 환경이 기본 상태로 유지되고 있어요.", "필요할 때 음성허브를 불러주세요."],
    dadTitle: "지금은 편안한 상태예요",
    dadLines: ["특별히 필요한 도움이 없어요.", "오늘도 따뜻한 말 한마디면 충분해요."],
  },
  nausea: {
    devices: {
      airPurifier: { on: true, level: "강풍" },
      light: { on: true, brightness: 40, tone: "따뜻한 저조도" },
      aircon: { on: true, temp: 24, mode: "약풍 환기" },
      tv: { on: false, note: "꺼짐 (자극 최소화)" },
      vacuum: { scheduled: false, note: "대기 중" },
      fridge: { note: "냄새 민감 케어 표시 중" },
    },
    momPoom: [
      "입덧 케어 모드가 실행됐어요.",
      "공기청정기를 강풍으로 전환했어요.",
      "조명을 낮추고 환기를 시작했어요.",
      "잠시 쉬어도 괜찮아요.",
    ],
    dadTitle: "지금 냄새에 민감한 상태예요",
    dadLines: [
      "냄새가 강한 음식은 피해주세요.",
      "창문을 열어 환기를 도와주세요.",
      "음식물 쓰레기 정리를 부탁해요.",
    ],
  },
  sleep: {
    devices: {
      airPurifier: { on: true, level: "저소음" },
      light: { on: true, brightness: 14, tone: "수면 무드" },
      aircon: { on: true, temp: 22, mode: "수면 운전" },
      tv: { on: false, note: "꺼짐" },
      vacuum: { scheduled: false, note: "대기 중" },
      fridge: { note: "야간 절전 모드" },
    },
    momPoom: [
      "수면 케어 모드가 실행됐어요.",
      "조명과 실내 온도가 편안하게 조정됐어요.",
      "공기청정기는 저소음으로 돌아가요.",
    ],
    dadTitle: "지금 휴식이 필요한 상태예요",
    dadLines: ["소음이 나는 집안일은 잠시 미뤄주세요.", "조용한 환경을 함께 지켜주세요."],
  },
  housework: {
    devices: {
      airPurifier: { on: true, level: "중" },
      light: { on: true, brightness: 70, tone: "주백색" },
      aircon: { on: true, temp: 24, mode: "쾌적 운전" },
      tv: { on: false, note: "대기 중" },
      vacuum: { scheduled: true, note: "30분 뒤 청소 예약" },
      fridge: { note: "저녁 식단 추천 준비" },
    },
    momPoom: [
      "가사 도움 모드가 실행됐어요.",
      "로봇청소기 청소를 예약했어요.",
      "오늘은 무리하지 않아도 괜찮아요.",
    ],
    dadTitle: "오늘 피로도가 높은 상태예요",
    dadLines: ["오늘은 집안일 부담을 덜어주면 좋아요.", "따뜻한 저녁 한 끼가 큰 힘이 돼요."],
  },
};

// ---------------------------------------------------------------- 음성 시나리오

export type VoiceScenario = {
  id: string;
  utterance: string;
  keywords: string[];
  intent: string;
  proposal: string;
  careMode: CareModeKey;
  dashboardMode: "nausea_food" | "sleep_care" | "housework_care";
  execMessage: string;
};

export const VOICE_SCENARIOS: VoiceScenario[] = [
  {
    id: "nausea",
    utterance: "냄새 때문에 너무 힘들어",
    keywords: ["냄새", "입덧", "메스껍", "메스꺼", "속이", "울렁"],
    intent: "냄새 민감 · 입덧 상황으로 판단했어요",
    proposal: "입덧 케어 모드를 실행할까요?",
    careMode: "nausea",
    dashboardMode: "nausea_food",
    execMessage: "공기청정기와 조명을 조정했어요.",
  },
  {
    id: "tired",
    utterance: "오늘 너무 피곤해",
    keywords: ["피곤", "지쳤", "지친", "힘들어", "기운"],
    intent: "피로 · 휴식이 필요한 상태로 판단했어요",
    proposal: "가사 도움 모드를 실행할까요?",
    careMode: "housework",
    dashboardMode: "housework_care",
    execMessage: "로봇청소기를 예약하고 실내 환경을 조정했어요.",
  },
  {
    id: "sleep",
    utterance: "수면모드 실행해줘",
    keywords: ["수면", "잘게", "잘래", "재워", "잠"],
    intent: "수면 케어 실행 명령으로 인식했어요",
    proposal: "수면 케어 모드를 실행할까요?",
    careMode: "sleep",
    dashboardMode: "sleep_care",
    execMessage: "조명을 낮추고 에어컨을 수면 온도로 맞췄어요.",
  },
];

export function matchScenario(text: string): VoiceScenario {
  const found = VOICE_SCENARIOS.find((s) => s.keywords.some((k) => text.includes(k)));
  return found ?? VOICE_SCENARIOS[0];
}
