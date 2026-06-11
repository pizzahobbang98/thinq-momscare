type LogErrorDetails = {
  message: string
  name?: string
  stack?: string
  code?: string
  details?: string
  hint?: string
  status?: number
  statusText?: string
  raw?: unknown
}

export function formatLogError(error: unknown): LogErrorDetails {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      raw: error,
    }
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const message =
      typeof record.message === 'string'
        ? record.message
        : typeof record.error === 'string'
          ? record.error
          : JSON.stringify(record)

    return {
      message: message || 'Unknown error',
      name: typeof record.name === 'string' ? record.name : undefined,
      stack: typeof record.stack === 'string' ? record.stack : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      details: typeof record.details === 'string' ? record.details : undefined,
      hint: typeof record.hint === 'string' ? record.hint : undefined,
      status: typeof record.status === 'number' ? record.status : undefined,
      statusText: typeof record.statusText === 'string' ? record.statusText : undefined,
      raw: error,
    }
  }

  return {
    message: String(error),
    raw: error,
  }
}

export function warnRecoverableError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.warn(context, {
    ...formatLogError(error),
    ...extra,
  })
}
