import { getSupabase } from '@/lib/supabase/client'
import {
  type PosterDesignConfig,
  DEFAULT_POSTER_CONFIG,
} from '@/lib/hsnyojz/poster-config'

export function invalidateConfigCache() {
  // No-op — cache removed for cross-process consistency
}

export async function getActiveConfig(): Promise<PosterDesignConfig> {
  const supabase = getSupabase()
  if (!supabase) {
    return { ...DEFAULT_POSTER_CONFIG }
  }

  const { data, error } = await supabase
    .from('poster_presets')
    .select('config')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)

  const row = error ? null : data?.[0]
  if (!row?.config) {
    return { ...DEFAULT_POSTER_CONFIG }
  }

  return deepMerge(
    JSON.parse(JSON.stringify(DEFAULT_POSTER_CONFIG)),
    row.config as Record<string, unknown>,
  ) as unknown as PosterDesignConfig
}

export const getActiveDesignConfig = getActiveConfig

export async function setActiveDesignConfig(
  config: PosterDesignConfig,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  // Insert new active preset first, then deactivate old ones.
  // This ordering prevents a window where zero presets are active.
  const { data: inserted } = await supabase
    .from('poster_presets')
    .insert({
      name: `API — ${new Date().toISOString()}`,
      config: config as unknown as Record<string, unknown>,
      aspect_ratio: config.aspectRatio,
      is_active: true,
    })
    .select('id')
    .single()

  if (inserted) {
    await supabase
      .from('poster_presets')
      .update({ is_active: false })
      .eq('is_active', true)
      .neq('id', inserted.id)
  }
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const val = source[key]
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof target[key] === 'object' &&
      target[key] !== null
    ) {
      deepMerge(
        target[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      )
    } else if (val !== undefined) {
      target[key] = val
    }
  }
  return target
}
