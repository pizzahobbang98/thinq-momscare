export function isRecoverableThinQApiError(status: number, errorText: string) {
  const normalized = errorText.toLowerCase()

  if (status === 416) return true
  if (normalized.includes('not connected device')) return true
  if (normalized.includes('"code":"1222"') || normalized.includes('"code":1222')) return true
  if (normalized.includes('1222')) return true

  return false
}

export function isRecoverableThinQErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  return (
    normalized.includes('thinq api 416') ||
    normalized.includes('not connected device') ||
    normalized.includes('"code":"1222"') ||
    normalized.includes('"code":1222')
  )
}

export function summarizeThinQErrorText(errorText: string, maxLength = 160) {
  const trimmed = errorText.trim()
  if (trimmed.length <= maxLength) return trimmed

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { message?: string; code?: string | number }
    }
    const message = parsed.error?.message
    const code = parsed.error?.code
    if (message && code != null) return `${message} (code ${code})`
    if (message) return message
  } catch {
    // keep raw text fallback
  }

  return `${trimmed.slice(0, maxLength)}…`
}
