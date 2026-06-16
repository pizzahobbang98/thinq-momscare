export const productVisualSpec = {
  thinqOnHub: {
    silhouette: "작고 낮은 원통형 puck 허브",
    references: [
      "LG Newsroom: ThinQ ON AI Home Hub, compact Matter hub with voice assistant",
      "Engadget/The Verge coverage: round puck-like table device",
    ],
    codeGuidance:
      "낮고 둥근 바디, 상단 LED halo, 미세한 패브릭/스피커 메시 느낌, 작은 물리 버튼으로 표현한다.",
  },
  refrigerator: {
    silhouette: "오브제 계열 4도어 프렌치 냉장고",
    references: ["LG refrigerator spec language: smooth, fingerprint and smudge resistant exterior"],
    codeGuidance:
      "상단 2도어와 하단 2도어의 비율을 명확히 나누고, 스프레이 화이트/크림 무광 표면으로 처리한다.",
  },
  washerTower: {
    silhouette: "상하 원형 도어가 있는 일체형 세탁건조 타워",
    references: ["LG WashTower: single unit design and space-saving stacked tower"],
    codeGuidance:
      "세로로 긴 단일 타워, 상하 원형 도어, 중앙 조작 패널, 상단 어두운 모듈과 하단 밝은 모듈을 구분한다.",
  },
  stanbyMe: {
    silhouette: "27인치 가로 화면, 슬림 스탠드, 원형 이동 베이스",
    references: [
      "LG StanbyME product pages: 27-inch portable wireless screen on a stand",
      "Tom's Guide: white stand, beige rear cover, base concealing wheels",
    ],
    codeGuidance:
      "두껍지 않은 가로형 화면, 긴 중앙 스탠드, 원형 받침을 유지하고 화면 안에는 목적지별 절차적 장면을 넣는다.",
  },
  whisenStandingAc: {
    silhouette: "긴 세로형 WHISEN 스탠드 에어컨",
    references: [
      "Red Dot: upper round illuminated display showing temperature/status and side outlet slots",
      "iF Design: vertical track outlet spreading cool air widely",
    ],
    codeGuidance:
      "상단 원형 디스플레이, 전면/측면 세로 송풍 트랙, 내부 루버 4개, 송풍 시작점이 트랙 내부에 고정되게 만든다.",
  },
} as const;
