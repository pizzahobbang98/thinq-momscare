// 엄마품 · 아빠손길 일일 팁 (봄캘린더 스타일)
// 생리주기 / 임신 주차 / 아이 월령에 따라 오늘의 상태와 추천 행동을 계산한다.
// 엄마품 = 엄마 앱 전용, 아빠손길 = 아빠 앱 전용.

import type { Profile } from "./data";
import { babyMonths, diffDays, todayISO } from "./data";

export type DailyTip = {
  phaseLabel: string; // 오늘 단계 라벨 (예: 배란기 · 임신 18주 · 생후 5개월)
  phaseEmoji: string;
  emotion: string; // 오늘의 몸·감정 상태 요약
  momTips: string[]; // 엄마품: 나를 위한 케어 포인트
  dadTips: string[]; // 아빠손길: 오늘의 추천 행동
  dadAvoid: string[]; // 아빠손길: 오늘 피하면 좋은 것
};

export function dailyTipFor(profile: Profile): DailyTip {
  if (profile.stage === "prep") return prepTip(profile);
  if (profile.stage === "pregnancy") return pregnancyTip(profile.pregnancyWeek);
  return parentingTip(babyMonths(profile.babyBirth));
}

// ---------------------------------------------------------------- 임신준비: 생리주기 기반

function prepTip(profile: Profile): DailyTip {
  const { lastPeriodStart, cycleLength, periodLength } = profile;
  const raw = diffDays(lastPeriodStart, todayISO());
  const offset = ((raw % cycleLength) + cycleLength) % cycleLength;
  const ovulation = cycleLength - 14;

  if (offset < periodLength) {
    return {
      phaseLabel: `생리 ${offset + 1}일차`,
      phaseEmoji: "🌙",
      emotion: "몸이 무겁고 컨디션이 낮아지기 쉬운 시기예요.",
      momTips: ["따뜻한 물을 자주 마셔요", "철분이 풍부한 음식 챙기기", "무리한 운동은 쉬어가요"],
      dadTips: ["따뜻한 핫팩이나 차를 건네보세요", "오늘 설거지와 빨래는 아빠가 맡아주세요", "일찍 쉴 수 있게 배려해주세요"],
      dadAvoid: ["“예민하네” 같은 말", "차가운 음식 권하기", "늦은 약속 잡기"],
    };
  }
  if (offset >= ovulation - 4 && offset <= ovulation + 1) {
    const isOvulationDay = offset === ovulation;
    return {
      phaseLabel: isOvulationDay ? "배란일" : "가임기",
      phaseEmoji: "🌸",
      emotion: "컨디션이 좋아지는 시기예요. 임신 가능성이 가장 높은 기간이에요.",
      momTips: ["기초체온을 기록해보세요", "엽산 챙겨 먹기", "스트레스 없이 편안한 하루 보내기"],
      dadTips: ["함께 저녁 산책을 해보세요", "둘만의 따뜻한 시간을 만들어보세요", "아빠도 엽산·운동 루틴을 지켜주세요"],
      dadAvoid: ["과음·흡연", "야근 후 늦은 귀가", "부담 주는 말"],
    };
  }
  if (offset >= cycleLength - 5) {
    return {
      phaseLabel: "생리 전 (PMS)",
      phaseEmoji: "🌧️",
      emotion: "호르몬 변화로 감정 기복과 피로가 커질 수 있는 시기예요.",
      momTips: ["카페인 줄이기", "가벼운 스트레칭으로 긴장 풀기", "기분 변화를 기록해두면 좋아요"],
      dadTips: ["말을 끝까지 들어주세요", "달콤한 간식을 준비해보세요", "집안일을 먼저 나서서 해주세요"],
      dadAvoid: ["감정에 대한 평가", "약속 갑자기 바꾸기", "혼자만의 시간 방해하기"],
    };
  }
  return {
    phaseLabel: "안정기 (난포기)",
    phaseEmoji: "☀️",
    emotion: "에너지가 올라오는 시기예요. 새로운 루틴을 시작하기 좋아요.",
    momTips: ["검진 일정을 미리 예약해두세요", "규칙적인 수면 리듬 만들기", "함께 운동 루틴 시작하기"],
    dadTips: ["다음 검진 일정을 함께 확인해주세요", "주말 데이트를 계획해보세요", "건강검진도 함께 챙겨요"],
    dadAvoid: ["검진 일정 잊어버리기", "혼자 일정 잡기"],
  };
}

// ---------------------------------------------------------------- 임신중: 주차 기반

function pregnancyTip(week: number): DailyTip {
  const label = `임신 ${week}주차`;
  if (week < 8) {
    return {
      phaseLabel: label,
      phaseEmoji: "🌱",
      emotion: "호르몬 변화가 시작돼 피로와 졸음이 쏟아지는 시기예요.",
      momTips: ["충분히 자도 괜찮아요", "엽산 꾸준히 복용하기", "첫 검진 일정 확인하기"],
      dadTips: ["집안일 비중을 늘려주세요", "이른 잠자리를 함께 준비해주세요", "첫 검진에 함께 가보세요"],
      dadAvoid: ["담배 냄새 묻혀 오기", "“아직 티도 안 나네” 같은 말"],
    };
  }
  if (week < 14) {
    return {
      phaseLabel: label,
      phaseEmoji: "🤢",
      emotion: "입덧이 가장 심한 시기예요. 냄새에 매우 민감해요.",
      momTips: ["먹을 수 있는 것 위주로 조금씩 자주", "환기를 자주 해요", "수분 보충 잊지 않기"],
      dadTips: ["요리 냄새가 덜 나는 메뉴를 골라주세요", "환기와 음식물 정리를 맡아주세요", "구토 후 입을 헹굴 물을 챙겨주세요"],
      dadAvoid: ["집에서 냄새 강한 음식 먹기", "향수 진하게 뿌리기", "“입덧은 마음먹기 나름” 같은 말"],
    };
  }
  if (week < 20) {
    return {
      phaseLabel: label,
      phaseEmoji: "🍀",
      emotion: "입덧이 잦아들고 안정되는 시기예요. 태동을 느끼기 시작할 수 있어요.",
      momTips: ["가벼운 산책으로 체력 유지하기", "정밀 초음파 일정 확인하기", "체중 변화 기록하기"],
      dadTips: ["태명을 함께 불러보세요", "산책에 동행해주세요", "정밀 초음파 검진에 함께 가요"],
      dadAvoid: ["혼자 늦게까지 게임·야근", "기념일 잊기"],
    };
  }
  if (week < 28) {
    return {
      phaseLabel: label,
      phaseEmoji: "💛",
      emotion: "배가 본격적으로 나오기 시작해요. 허리 부담이 늘어나요.",
      momTips: ["임신성 당뇨 검사 준비하기", "옆으로 자는 자세 연습하기", "다리 부종은 쿠션으로 올려두기"],
      dadTips: ["배에 손을 얹고 태동을 함께 느껴보세요", "무거운 짐은 모두 아빠 담당이에요", "발 마사지를 해주세요"],
      dadAvoid: ["빨리 걷기 재촉", "무거운 장바구니 들게 하기"],
    };
  }
  if (week < 36) {
    return {
      phaseLabel: label,
      phaseEmoji: "🧸",
      emotion: "몸이 무거워지고 잠들기 어려운 시기예요. 출산 준비가 시작돼요.",
      momTips: ["출산 가방 미리 싸두기", "수면 쿠션 활용하기", "호흡법 연습 시작하기"],
      dadTips: ["아기용품 리스트를 함께 정리해요", "병원 가는 길을 미리 운전해보세요", "밤에 뒤척여도 따뜻하게 토닥여주세요"],
      dadAvoid: ["출산 준비 미루기", "회식으로 연락 두절"],
    };
  }
  return {
    phaseLabel: label,
    phaseEmoji: "👶",
    emotion: "언제든 출산할 수 있는 시기예요. 긴장과 설렘이 함께해요.",
    momTips: ["진통 간격 재는 법 확인하기", "병원 연락처를 잘 보이게 두기", "무리하지 않고 컨디션 유지하기"],
    dadTips: ["휴대폰을 항상 가까이 두세요", "출산 가방 위치를 확인해두세요", "퇴근 후 바로 귀가해주세요"],
    dadAvoid: ["음주", "장거리 출장 잡기", "전화 무음 모드"],
  };
}

// ---------------------------------------------------------------- 육아중: 월령 기반

function parentingTip(month: number): DailyTip {
  const label = `생후 ${month}개월`;
  if (month < 2) {
    return {
      phaseLabel: label,
      phaseEmoji: "🍼",
      emotion: "산후 회복과 2~3시간 간격 수유로 가장 지치는 시기예요.",
      momTips: ["아기가 잘 때 같이 자요", "산후 영양 보충 챙기기", "혼자 다 하려 하지 않아도 돼요"],
      dadTips: ["밤중 수유 한 타임은 아빠가 맡아주세요", "산모 보양식을 챙겨주세요", "기저귀 교체는 먼저 나서서"],
      dadAvoid: ["“집에서 쉬잖아” 같은 말", "늦은 회식", "아기 사진만 찍고 빠지기"],
    };
  }
  if (month < 4) {
    return {
      phaseLabel: label,
      phaseEmoji: "😊",
      emotion: "아기가 웃기 시작하지만 수면 부족이 누적되는 시기예요.",
      momTips: ["하루 30분은 나만의 시간 갖기", "손목 보호대 사용하기", "수유 텀 기록으로 리듬 찾기"],
      dadTips: ["주말 오전은 아빠 육아 타임으로", "엄마 외출 시간을 만들어주세요", "아기 목욕은 함께해요"],
      dadAvoid: ["육아를 ‘도와준다’고 표현하기", "주말 늦잠 독점"],
    };
  }
  if (month < 7) {
    return {
      phaseLabel: label,
      phaseEmoji: "🥄",
      emotion: "뒤집기와 이유식이 시작되는 시기예요. 손이 두 배로 가요.",
      momTips: ["이유식은 한 번에 많이 만들어 소분하기", "예방접종 일정 미리 확인하기", "아기 낮잠 때 허리 스트레칭"],
      dadTips: ["이유식 재료 장보기를 맡아주세요", "예방접종에 함께 가요", "저녁 설거지는 아빠 담당"],
      dadAvoid: ["접종 일정 잊기", "이유식 간 보고 “싱겁다” 하기"],
    };
  }
  if (month < 12) {
    return {
      phaseLabel: label,
      phaseEmoji: "🚼",
      emotion: "배밀이·잡고 서기로 한시도 눈을 뗄 수 없는 시기예요.",
      momTips: ["안전문·모서리 보호대 점검하기", "아기와 외출 루틴 만들기", "체력 관리를 위한 짧은 운동"],
      dadTips: ["집 안 안전용품 설치는 아빠가", "퇴근 후 30분 아기와 놀아주세요", "엄마의 저녁 휴식을 지켜주세요"],
      dadAvoid: ["위험한 물건 방치", "휴대폰 보며 건성으로 놀아주기"],
    };
  }
  return {
    phaseLabel: label,
    phaseEmoji: "🎂",
    emotion: "걸음마와 자기주장이 시작돼요. 체력전이 본격화되는 시기예요.",
    momTips: ["둘이서 교대 육아 루틴 정하기", "아이 생활 리듬표 만들기", "부부만의 대화 시간 확보하기"],
    dadTips: ["주 1회는 아빠 단독 육아 데이", "아이와 몸놀이는 아빠 전문으로", "엄마에게 반차 같은 휴식을 선물하세요"],
    dadAvoid: ["“애는 엄마가 봐야지” 같은 말", "약속 없이 늦기"],
  };
}
