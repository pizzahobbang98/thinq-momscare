const TOKEN_ENV_NAMES = ['THINQ_PAT_TOKEN', 'THINQ_ACCESS_TOKEN'] as const
const REQUIRED_ENV_GROUPS = [['THINQ_PAT_TOKEN', 'THINQ_ACCESS_TOKEN'], ['THINQ_DEVICE_ID']] as const
const RECOMMENDED_ENV_NAMES = ['THINQ_CLIENT_ID', 'THINQ_MOCK_FALLBACK'] as const

export function maskSensitiveValue(value: string | undefined | null, head = 6, tail = 4) {
  if (!value) return null
  if (value.length <= head + tail) return `${value.slice(0, 2)}...`
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function isThinQMockFallbackEnabled() {
  const value = process.env.THINQ_MOCK_FALLBACK
  if (value === undefined) return true
  return value !== 'false' && value !== '0'
}

export function getThinQAuthToken() {
  const patToken = process.env.THINQ_PAT_TOKEN
  if (patToken) return { token: patToken, source: 'THINQ_PAT_TOKEN' as const }

  const accessToken = process.env.THINQ_ACCESS_TOKEN
  if (accessToken) return { token: accessToken, source: 'THINQ_ACCESS_TOKEN' as const }

  throw new Error('ThinQ 인증 토큰이 없습니다. THINQ_PAT_TOKEN 또는 THINQ_ACCESS_TOKEN 중 하나가 필요합니다.')
}

export function getThinQEnvDiagnostics() {
  const missingRequired = REQUIRED_ENV_GROUPS.flatMap((group) =>
    group.some((name) => Boolean(process.env[name])) ? [] : [group.join(' or ')],
  )
  const missingRecommended = RECOMMENDED_ENV_NAMES.filter((name) => !process.env[name])
  const tokenSource = TOKEN_ENV_NAMES.find((name) => Boolean(process.env[name])) ?? null

  return {
    mockFallbackEnabled: isThinQMockFallbackEnabled(),
    missingRequired,
    missingRecommended,
    tokenSource,
    hasPatToken: Boolean(process.env.THINQ_PAT_TOKEN),
    hasAccessToken: Boolean(process.env.THINQ_ACCESS_TOKEN),
    deviceId: maskSensitiveValue(process.env.THINQ_DEVICE_ID),
    clientId: maskSensitiveValue(process.env.THINQ_CLIENT_ID),
  }
}

export function logThinQEnvDiagnostics(context: string) {
  const diagnostics = getThinQEnvDiagnostics()
  const payload = { context, ...diagnostics }

  if (diagnostics.missingRequired.length > 0) {
    console.error('[thinq] environment missing required values:', payload)
  } else {
    console.log('[thinq] environment:', payload)
  }

  if (diagnostics.missingRecommended.length > 0) {
    console.warn('[thinq] environment missing recommended values:', {
      context,
      missingRecommended: diagnostics.missingRecommended,
    })
  }
}

export function redactSensitiveText(text: string) {
  let redacted = text

  for (const name of TOKEN_ENV_NAMES) {
    const value = process.env[name]
    if (value) redacted = redacted.split(value).join(`[redacted:${name}]`)
  }

  const deviceId = process.env.THINQ_DEVICE_ID
  if (deviceId) redacted = redacted.split(deviceId).join(maskSensitiveValue(deviceId) ?? '[redacted:THINQ_DEVICE_ID]')

  return redacted
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[redacted]"')
    .replace(/"pat_token"\s*:\s*"[^"]+"/gi, '"pat_token":"[redacted]"')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"')
}

export function summarizeForLog(value: unknown, maxLength = 500) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  const redacted = redactSensitiveText(raw)
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}...` : redacted
}

export function maskThinQPath(path: string) {
  const deviceId = process.env.THINQ_DEVICE_ID
  if (!deviceId) return path
  return path.split(deviceId).join(maskSensitiveValue(deviceId) ?? '[redacted:THINQ_DEVICE_ID]')
}
