import { normalizeHueLocalMode } from '@/lib/hue-local-modes'

export type TriggerHueLocalModeOptions = {
  mode: unknown
  effect?: string
  source?: string
  commandId?: string
}

export async function triggerHueLocalMode(options: TriggerHueLocalModeOptions) {
  const hueMode = normalizeHueLocalMode(options.mode)
  if (!hueMode) return

  try {
    const response = await fetch('/api/hue-local/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: hueMode,
        effect: options.effect ?? 'gradient',
        source: options.source ?? 'unknown',
        commandId: options.commandId,
        originalMode: typeof options.mode === 'string' ? options.mode : undefined,
      }),
    })
    const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null
    if (!response.ok || data?.ok === false) {
      console.warn('[hue-local] local Hue mode failed; care flow continues:', data?.error ?? response.status)
    }
  } catch (error) {
    console.warn('[hue-local] local Hue mode failed; care flow continues:', error)
  }
}
