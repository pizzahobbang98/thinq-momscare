import { normalizeHueLocalMode } from '@/lib/hue-local-modes'

export type LocalLightAction = 'on' | 'off' | 'mode'

export type TriggerLocalLightOptions = {
  action: LocalLightAction
  mode?: unknown
  effect?: string
  source?: string
  commandId?: string
}

export type TriggerHueLocalModeOptions = {
  mode: unknown
  effect?: string
  source?: string
  commandId?: string
}

export async function triggerLocalLight(options: TriggerLocalLightOptions) {
  if (options.action === 'mode') {
    const hueMode = normalizeHueLocalMode(options.mode)
    const key = typeof options.mode === 'string'
      ? options.mode.trim().replace(/_/g, '-').toLowerCase()
      : ''
    if (!hueMode && key !== 'default' && key !== 'idle') return
  }

  try {
    const response = await fetch(`/api/light/${options.action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: options.mode,
        effect: options.effect ?? 'solid',
        source: options.source ?? 'unknown',
        commandId: options.commandId,
      }),
    })
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string; status?: number } | null
    if (!response.ok || data?.ok === false) {
      console.warn('[light-local] local light action failed; care flow continues:', {
        action: options.action,
        mode: options.mode,
        error: data?.error ?? data?.status ?? response.status,
      })
    }
  } catch (error) {
    console.warn('[light-local] local light action failed; care flow continues:', {
      action: options.action,
      mode: options.mode,
      error,
    })
  }
}

export async function triggerHueLocalMode(options: TriggerHueLocalModeOptions) {
  return triggerLocalLight({
    action: 'mode',
    mode: options.mode,
    effect: options.effect,
    source: options.source,
    commandId: options.commandId,
  })
}

export async function triggerHueLocalOn(options: Omit<TriggerLocalLightOptions, 'action'> = {}) {
  return triggerLocalLight({ ...options, action: 'on' })
}

export async function triggerHueLocalOff(options: Omit<TriggerLocalLightOptions, 'action'> = {}) {
  return triggerLocalLight({ ...options, action: 'off' })
}
