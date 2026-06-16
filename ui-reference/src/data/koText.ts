import type { DemoMode } from "../types/demoTypes";
import type { SceneState } from "../types/applianceTypes";

export const koText = {
  appTitle: "Mother Together",
  idleSubtitle: "AI Hub에게 방을 준비해 달라고 말해보세요.",
  routines: {
    nausea_food: {
      title: "입덧 식사",
      trigger: "오늘은 뭘 먹어야 할지 모르겠어.",
      speech: "자극적인 입덧 메뉴는 제외하고, 오늘 먹기 편한 식사 환경으로 바꿔볼게요.",
      log: "식사 민감도가 높은 날로 기록했어요. 다음 식사 추천에 반영합니다.",
    },
    sleep_care: {
      title: "수면 케어",
      trigger: "오늘은 잠을 잘 못 잘 것 같아.",
      speech: "직접바람과 화면 자극을 줄여, 잘 깨지 않는 밤을 준비할게요.",
      log: "TV 종료와 직접바람 회피 루틴을 실행했어요.",
    },
    housework_care: {
      title: "가사 케어",
      trigger: "오늘은 몸이 너무 무거워.",
      speech: "지금 바로 움직이지 않아도 되도록 세탁물 케어를 유지할게요.",
      log: "세탁 완료 알림을 케어 유지 상태로 전환했어요.",
    },
    destination_forest: {
      title: "오늘의 목적지: 숲",
      trigger: "오늘은 어디론가 가고 싶어.",
      speech: "오늘의 목적지를 숲으로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.",
      log: "화면과 빛, 공기가 숲의 장소감으로 전환됐어요.",
    },
    destination_ocean: {
      title: "오늘의 목적지: 바다",
      trigger: "오늘은 어디론가 가고 싶어.",
      speech: "오늘의 목적지를 바다로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.",
      log: "화면과 빛, 공기가 바다의 장소감으로 전환됐어요.",
    },
    destination_city: {
      title: "오늘의 목적지: 도시",
      trigger: "오늘은 어디론가 가고 싶어.",
      speech: "오늘의 목적지를 도시로 바꿔볼게요. 화면, 빛, 공기를 함께 맞춥니다.",
      log: "화면과 빛, 공기가 도시의 장소감으로 전환됐어요.",
    },
  } satisfies Record<Exclude<DemoMode, "idle">, { title: string; trigger: string; speech: string; log: string }>,
  buttons: {
    nausea_food: "입덧 식사",
    sleep_care: "수면 케어",
    housework_care: "가사 케어",
    destination_forest: "숲",
    destination_ocean: "바다",
    destination_city: "도시",
    reset: "초기화",
  },
  labels: {
    refrigerator: "냉장고",
    washerTower: "워시타워",
    standbyMe: "스탠바이미",
    standingAc: "스탠드 에어컨",
  },
  status(state: SceneState) {
    const ac = state.airConditioner.mode === "off" ? "에어컨 꺼짐" : `에어컨 ${acModeText(state.airConditioner.mode)}`;
    const light = `조명 ${moodText(state.ceilingLight.mood)}`;
    return [ac, light];
  },
};

function acModeText(mode: SceneState["airConditioner"]["mode"]) {
  return { off: "꺼짐", sleep: "수면", circulation: "순환", breeze: "산들바람" }[mode];
}

function moodText(mood: SceneState["ceilingLight"]["mood"]) {
  return {
    neutral: "기본",
    calm: "차분",
    sleep: "수면",
    forest: "숲",
    ocean: "바다",
    city: "도시",
  }[mood];
}
