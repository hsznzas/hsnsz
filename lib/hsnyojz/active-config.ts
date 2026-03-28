import { getSupabase } from '@/lib/supabase/client'
import { type PosterDesignConfig, DEFAULT_POSTER_CONFIG } from './poster-config'

const ACTIVE_PRESET_NAME = '__active__'

export async function getActiveDesignConfig(): Promise<PosterDesignConfig> {
  const supabase = getSupabase()
  if (!supabase) return DEFAULT_POSTER_CONFIG

  const { data } = await supabase
    .from('poster_presets')
    .select('config')
    .eq('name', ACTIVE_PRESET_NAME)
    .single()

  if (!data?.config) return DEFAULT_POSTER_CONFIG

  return deepMerge(DEFAULT_POSTER_CONFIG, data.config as Record<string, unknown>)
}

export async function setActiveDesignConfig(config: PosterDesignConfig): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { data: existing } = await supabase
    .from('poster_presets')
    .select('id')
    .eq('name', ACTIVE_PRESET_NAME)
    .single()

  const payload = {
    config: config as unknown as Record<string, unknown>,
    aspect_ratio: config.aspectRatio,
  }

  if (existing) {
    await supabase
      .from('poster_presets')
      .update(payload)
      .eq('id', existing.id)
  } else {
    await supabase
      .from('poster_presets')
      .insert({ name: ACTIVE_PRESET_NAME, ...payload })
  }
}

function deepMerge(
  base: PosterDesignConfig,
  overrides: Record<string, unknown>,
): PosterDesignConfig {
  const result = JSON.parse(JSON.stringify(base))
  function merge(target: Record<string, unknown>, source: Record<string, unknown>) {
    for (const key of Object.keys(source)) {
      const val = source[key]
      if (
        val && typeof val === 'object' && !Array.isArray(val) &&
        typeof target[key] === 'object' && target[key] !== null
      ) {
        merge(target[key] as Record<string, unknown>, val as Record<string, unknown>)
      } else if (val !== undefined) {
        target[key] = val
      }
    }
  }
  merge(result, overrides)
  return result as PosterDesignConfig
}
