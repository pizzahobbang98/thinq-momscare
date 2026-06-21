type CommandScopeStore = Map<string, number>

const DEFAULT_TTL_MS = 10 * 60 * 1000

type GlobalCommandStore = typeof globalThis & {
  __thinqMomCommandScopes?: Map<string, CommandScopeStore>
}

function getScopes() {
  const store = globalThis as GlobalCommandStore
  if (!store.__thinqMomCommandScopes) {
    store.__thinqMomCommandScopes = new Map()
  }
  return store.__thinqMomCommandScopes
}

function cleanup(scopeStore: CommandScopeStore, now: number, ttlMs: number) {
  for (const [commandId, timestamp] of scopeStore.entries()) {
    if (now - timestamp > ttlMs) scopeStore.delete(commandId)
  }
}

export function markCommandOnce(scope: string, commandId: string | undefined, ttlMs = DEFAULT_TTL_MS) {
  if (!commandId) return true

  const scopes = getScopes()
  const now = Date.now()
  const scopeStore = scopes.get(scope) ?? new Map<string, number>()
  cleanup(scopeStore, now, ttlMs)
  scopes.set(scope, scopeStore)

  if (scopeStore.has(commandId)) return false
  scopeStore.set(commandId, now)
  return true
}

export function logCommandEvent(
  label: string,
  payload: {
    commandId?: string
    sourceScreen?: string
    commandType?: string
    mode?: string | null
    deviceAction?: string | null
    tts?: boolean
    deviceApi?: boolean
    duplicate?: boolean
    realtime?: boolean
  },
) {
  console.log(label, {
    commandId: payload.commandId ?? null,
    sourceScreen: payload.sourceScreen ?? null,
    commandType: payload.commandType ?? null,
    mode: payload.mode ?? null,
    deviceAction: payload.deviceAction ?? null,
    tts: payload.tts ?? false,
    deviceApi: payload.deviceApi ?? false,
    duplicate: payload.duplicate ?? false,
    realtime: payload.realtime ?? false,
  })
}
