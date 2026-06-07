const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
const RIUL_BATCHIM_INDEX = 8

/**
 * 문자열의 마지막 글자를 반환합니다.
 */
function getLastChar(word: string): string {
  const trimmed = word.trim()
  if (!trimmed) return ''
  return trimmed[trimmed.length - 1]
}

/**
 * 마지막 글자가 한글인지 확인합니다.
 */
function isHangul(char: string): boolean {
  if (!char) return false
  const code = char.charCodeAt(0)
  return code >= HANGUL_START && code <= HANGUL_END
}

/**
 * 마지막 글자의 받침 여부를 반환합니다.
 * 한글이 아닌 경우(영어, 숫자 등) 받침 없음으로 처리합니다.
 */
export function hasBatchim(word: string): boolean {
  const lastChar = getLastChar(word)
  if (!isHangul(lastChar)) return false

  const code = lastChar.charCodeAt(0)
  return (code - HANGUL_START) % 28 !== 0
}

/**
 * 마지막 글자의 받침이 ㄹ인지 확인합니다.
 * 한글이 아닌 경우 false를 반환합니다.
 */
export function hasRiulBatchim(word: string): boolean {
  const lastChar = getLastChar(word)
  if (!isHangul(lastChar)) return false

  const code = lastChar.charCodeAt(0)
  return (code - HANGUL_START) % 28 === RIUL_BATCHIM_INDEX
}

/**
 * 주격 조사 이/가를 붙입니다.
 * @example withIga("호빵") → "호빵이", withIga("만두") → "만두가"
 */
export function withIga(name: string): string {
  return hasBatchim(name) ? `${name}이` : `${name}가`
}

/**
 * 호격 조사 아/야를 붙입니다.
 * @example withAya("호빵") → "호빵아", withAya("만두") → "만두야"
 */
export function withAya(name: string): string {
  return hasBatchim(name) ? `${name}아` : `${name}야`
}

/**
 * 보조사 은/는을 붙입니다.
 * @example withEunNeun("호빵") → "호빵은", withEunNeun("만두") → "만두는"
 */
export function withEunNeun(name: string): string {
  return hasBatchim(name) ? `${name}은` : `${name}는`
}

/**
 * 목적격 조사 을/를을 붙입니다.
 * @example withEulReul("호빵") → "호빵을", withEulReul("만두") → "만두를"
 */
export function withEulReul(name: string): string {
  return hasBatchim(name) ? `${name}을` : `${name}를`
}

/**
 * 접속 조사 과/와를 붙입니다.
 * @example withGwaWa("호빵") → "호빵과", withGwaWa("만두") → "만두와"
 */
export function withGwaWa(name: string): string {
  return hasBatchim(name) ? `${name}과` : `${name}와`
}

/**
 * 방향·수단 조사 으로/로를 붙입니다.
 * ㄹ 받침 또는 받침 없음 → "로", 그 외 받침 → "으로"
 * @example withEuroRo("호빵") → "호빵으로", withEuroRo("만두") → "만두로", withEuroRo("서울") → "서울로"
 */
export function withEuroRo(name: string): string {
  if (!hasBatchim(name) || hasRiulBatchim(name)) {
    return `${name}로`
  }
  return `${name}으로`
}

/**
 * 서술격 조사 이야/야를 붙입니다.
 * @example withIyaYa("호빵") → "호빵이야", withIyaYa("만두") → "만두야"
 */
export function withIyaYa(name: string): string {
  return hasBatchim(name) ? `${name}이야` : `${name}야`
}

/**
 * 구어체 접속 조사 이랑/랑을 붙입니다.
 * @example withIrangRang("호빵") → "호빵이랑", withIrangRang("만두") → "만두랑"
 */
export function withIrangRang(name: string): string {
  return hasBatchim(name) ? `${name}이랑` : `${name}랑`
}
