import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import {
  summarizeArticle,
  summarizeFromText,
  summarizeFromImage,
  type NewsSummary,
  type SummarizeOptions,
} from '@/lib/hsnyojz/summarizer'
import { resolveAvatar } from '@/lib/hsnyojz/avatars'
import { fetchFlagAsBase64 } from '@/lib/hsnyojz/flags'
import type { PosterDesignConfig } from '@/lib/hsnyojz/poster-config'

export interface PosterConfig {
  sourceUrl?: string
  sourceType: 'link' | 'text' | 'image' | 'screenshot'
  rawContent?: string

  headline?: string
  bullets?: string[]
  sourceLabel?: string

  entityName?: string | null
  entityOrg?: string | null
  flagEmoji?: string | null

  style: 'default' | 'gulf' | 'custom'
  customFramingPrompt?: string
  bulletCount: number // 0-5
  customNotes?: string

  heroImageBase64?: string | null
  avatarEntityName?: string | null
}

export interface ProcessedSources {
  headline: string
  bullets: string[]
  sourceLabel: string
  entityName: string | null
  entityOrg: string | null
  flagEmoji: string | null
  heroImageBase64: string | null
}

export interface PosterResult {
  headline: string
  bullets: string[]
  sourceLabel: string
  entityName: string | null
  entityOrg: string | null
  flagEmoji: string | null
  flagBase64: string | null
  heroImageBase64: string | null
  avatarImageBase64: string | null
  pngBuffer: Buffer
}

export async function processSources(config: PosterConfig): Promise<ProcessedSources> {
  const summarizeOptions: SummarizeOptions = {
    bulletCount: config.bulletCount,
    style: config.style,
    customFramingPrompt: config.customFramingPrompt,
  }

  let summary: NewsSummary
  let heroImageBase64 = config.heroImageBase64 || null

  if (config.sourceType === 'link' && config.sourceUrl) {
    const article = await scrapeArticle(config.sourceUrl)

    if (!article.content && !article.title) {
      throw new Error('تعذّر استخراج محتوى من هذا الرابط')
    }

    summary = await summarizeArticle(
      article.title,
      article.content,
      article.siteName,
      undefined,
      summarizeOptions,
    )

    if (!heroImageBase64 && article.ogImage) {
      try {
        const imgRes = await fetch(article.ogImage, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer()
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
          heroImageBase64 = `data:${contentType};base64,${Buffer.from(imgBuffer).toString('base64')}`
        }
      } catch (err) {
        console.error('[HsnYojz Engine] Failed to fetch OG image:', err)
      }
    }
  } else if (config.sourceType === 'image' || config.sourceType === 'screenshot') {
    if (!config.rawContent) throw new Error('No image data provided')
    const rawBase64 = config.rawContent.replace(/^data:image\/\w+;base64,/, '')
    summary = await summarizeFromImage(rawBase64, undefined, summarizeOptions)
  } else {
    if (!config.rawContent) throw new Error('No text content provided')
    summary = await summarizeFromText(config.rawContent, undefined, summarizeOptions)
  }

  return {
    headline: summary.headline,
    bullets: summary.bullets,
    sourceLabel: summary.sourceLabel,
    entityName: summary.entityName,
    entityOrg: summary.entityOrg,
    flagEmoji: summary.flagEmoji,
    heroImageBase64,
  }
}

/**
 * Full poster generation pipeline:
 * 1. Process sources → get summary + entity info
 * 2. Resolve avatar (entityName → entityOrg fallback chain)
 * 3. Apply manual overrides
 * 4. Render poster → PNG
 */
export async function generatePoster(
  config: PosterConfig,
  renderFn: (payload: Record<string, unknown>) => Promise<Buffer>,
  designConfig?: PosterDesignConfig,
  aspectRatio?: '9:16' | '4:5',
): Promise<PosterResult> {
  const processed = await processSources(config)

  const headline = config.headline || processed.headline
  const bullets = config.bullets || processed.bullets
  const sourceLabel = config.sourceLabel || processed.sourceLabel
  const entityName = processed.entityName
  const entityOrg = processed.entityOrg
  const flagEmoji = processed.flagEmoji

  const avatarLookupName = config.avatarEntityName || entityName
  const avatarLookupOrg = entityOrg
  const avatarImageBase64 = await resolveAvatar(avatarLookupName ?? null, avatarLookupOrg ?? null)

  const effectiveFlagEmoji = avatarImageBase64 ? flagEmoji : null

  let flagBase64: string | null = null
  if (effectiveFlagEmoji) {
    flagBase64 = await fetchFlagAsBase64(effectiveFlagEmoji)
  }

  const renderPayload: Record<string, unknown> = {
    summary: {
      headline,
      bullets,
      sourceLabel,
      customNotes: config.customNotes,
    },
    imageBase64: processed.heroImageBase64,
    avatarBase64: avatarImageBase64,
    flagBase64,
    flagEmoji: effectiveFlagEmoji,
  }
  if (designConfig) renderPayload.designConfig = designConfig
  if (aspectRatio) renderPayload.aspectRatio = aspectRatio

  const pngBuffer = await renderFn(renderPayload)

  return {
    headline,
    bullets,
    sourceLabel,
    entityName,
    entityOrg,
    flagEmoji: effectiveFlagEmoji,
    flagBase64,
    heroImageBase64: processed.heroImageBase64,
    avatarImageBase64: avatarImageBase64,
    pngBuffer,
  }
}

/**
 * Generate poster from a pre-existing draft (already has summary data).
 * Skips the AI summarization step.
 */
export async function generatePosterFromDraft(
  draft: {
    headline: string
    bullets: string[]
    sourceLabel: string
    heroImageBase64: string | null
    avatarEntityName: string | null
    avatarEntityOrg: string | null
    flagEmoji: string | null
    customNotes: string | null
  },
  renderFn: (payload: Record<string, unknown>) => Promise<Buffer>,
): Promise<{ pngBuffer: Buffer; avatarImageBase64: string | null; effectiveFlagEmoji: string | null }> {
  const avatarImageBase64 = await resolveAvatar(
    draft.avatarEntityName,
    draft.avatarEntityOrg,
  )

  const effectiveFlagEmoji = avatarImageBase64 ? draft.flagEmoji : null

  let flagBase64: string | null = null
  if (effectiveFlagEmoji) {
    flagBase64 = await fetchFlagAsBase64(effectiveFlagEmoji)
  }

  const renderPayload = {
    summary: {
      headline: draft.headline,
      bullets: draft.bullets,
      sourceLabel: draft.sourceLabel,
      customNotes: draft.customNotes,
    },
    imageBase64: draft.heroImageBase64,
    avatarBase64: avatarImageBase64,
    flagBase64,
    flagEmoji: effectiveFlagEmoji,
  }

  const pngBuffer = await renderFn(renderPayload)

  return { pngBuffer, avatarImageBase64, effectiveFlagEmoji }
}
