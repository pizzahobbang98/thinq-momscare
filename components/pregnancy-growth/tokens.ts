// SVG fill 등에서 쓰는 색 토큰 (CSS 변수와 동일한 값)
export const TOKENS = {
  wallBg: '#FBEAF0',
  floorBg: '#EFC0D0',
  floorDeep: '#E4AFC2',
  primaryPink: '#C85F7A',
  deepPink: '#A9475F',
  softPink: '#F8D6E2',
  softBlue: '#DDF0FB',
  screenBlue: '#CFEAF8',
  screenBlueDeep: '#B8DFF3',
  screenGrid: 'rgba(255, 255, 255, 0.75)',
  cream: '#FFF7F9',
  white: '#FFFFFF',
  textMain: '#9E4A62',
  textSoft: '#B97A8B',
  shadowSoft: 'rgba(120, 70, 90, 0.18)',
  shadowObject: 'rgba(124, 65, 91, 0.22)',
  glowBlue: 'rgba(150, 215, 245, 0.55)',
  glowWhite: 'rgba(255, 255, 255, 0.65)',
} as const

// 씬 SVG 좌표 기준값 (608 x 344)
export const SCENE = {
  width: 608,
  height: 344,
  floorY: 252, // 오브젝트가 닿는 바닥 라인
  objectX: 416,
  mascotX: 224,
  objectRadius: 52,
  mascotRadius: 44,
} as const
