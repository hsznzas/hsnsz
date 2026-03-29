import { getSupabase } from '@/lib/supabase/client'
import {
  type PosterDesignConfig,
  DEFAULT_POSTER_CONFIG,
} from '@/lib/hsnyojz/poster-config'

let cachedConfig: PosterDesignConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5_000

export function invalidateConfigCache() {
  cachedConfig = null
  cacheTimestamp = 0
}

export async function getActiveConfig(): Promise<PosterDesignConfig> {
  const now = Date.now()
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig
  }

  const supabase = getSupabase()
  if (!supabase) {
    return { ...DEFAULT_POSTER_CONFIG }
  }

  const { data, error } = await supabase
    .from('poster_presets')
    .select('config')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data?.config) {
    return { ...DEFAULT_POSTER_CONFIG }
  }

  const merged = deepMerge(
    JSON.parse(JSON.stringify(DEFAULT_POSTER_CONFIG)),
    data.config as Record<string, unknown>,
  ) as unknown as PosterDesignConfig

  cachedConfig = merged
  cacheTimestamp = now
  return merged
}

export const getActiveDesignConfig = getActiveConfig

export async function setActiveDesignConfig(
  config: PosterDesignConfig,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  // Deactivate all existing presets
  await supabase
    .from('poster_presets')
    .update({ is_active: false })
    .eq('is_active', true)

  // Insert new active preset
  await supabase.from('poster_presets').insert({
    name: `API — ${new Date().toISOString()}`,
    config: config as unknown as Record<string, unknown>,
    aspect_ratio: config.aspectRatio,
    is_active: true,
  })

  invalidateConfigCache()
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
