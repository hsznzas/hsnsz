// HsnYojz - Telegram Webhook Handler (Interactive Keyboard Flow)
// Every interaction creates or updates a poster_drafts row in Supabase

import { NextRequest, NextResponse } from 'next/server'
import {
  sendMessage,
  sendMessageWithKeyboard,
  sendDocument,
  answerCallbackQuery,
  editMessageText,
  deleteMessage,
  isAdminChat,
  extractUrls,
  downloadTelegramFile,
  type TelegramUpdate,
  type InlineKeyboardButton,
} from '@/lib/hsnyojz/telegram'
import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import {
  summarizeArticle,
  type CombinedSummarySource,
  summarizeCombinedSources,
  summarizeFromText,
  summarizeFromImage,
  type NewsSummary,
  type SummarizeOptions,
} from '@/lib/hsnyojz/summarizer'
import { resolveAvatar } from '@/lib/hsnyojz/avatars'
import { generateImage, type ImageGenErrorType } from '@/lib/hsnyojz/image-gen'
import { getSupabase } from '@/lib/supabase/client'
import { getActiveDesignConfig } from '@/lib/hsnyojz/active-config'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ── Types ──

interface DraftRow {
  id: string
  user_id: string
  status: string
  source_url: string | null
  source_type: string
  raw_content: string | null
  summary_headline: string | null
  summary_bullets: string[]
  summary_source_label: string | null
  style: string
  custom_framing_prompt: string | null
  bullet_count: number
  custom_notes: string | null
  hero_image_base64: string | null
  avatar_entity_name: string | null
  avatar_entity_org: string | null
  flag_emoji: string | null
  telegram_chat_id: string | null
  telegram_preview_message_id: number | null
  pending_action: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  published_at: string | null
}

interface ParsedIncomingText {
  urls: string[]
  temporaryPromptText: string | null
  contentText: string | null
}

interface StoredLinkSourcePayload {
  urls: string[]
  additionalContentText?: string | null
}

// ── Supabase Helpers ──

async function getDraft(draftId: string): Promise<DraftRow | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('poster_drafts')
    .select('*')
    .eq('id', draftId)
    .single()
  return data as DraftRow | null
}

async function getDraftByChatPending(chatId: string): Promise<DraftRow | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('poster_drafts')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .not('pending_action', 'is', null)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  return data as DraftRow | null
}

async function createDraft(fields: Partial<DraftRow>): Promise<DraftRow | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('poster_drafts')
    .insert(fields)
    .select()
    .single()
  return data as DraftRow | null
}

async function updateDraft(draftId: string, fields: Partial<DraftRow>): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase
    .from('poster_drafts')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', draftId)
}

const CONTENT_MARKER = 'Use the text below as a content.'

function stripCommands(text: string): string {
  return text.replace(/\/\w+/g, ' ')
}

function removeUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s]+/gi, ' ')
}

function cleanFreeText(text: string): string {
  return stripCommands(removeUrls(text)).replace(/\s+/g, ' ').trim()
}

function parseIncomingText(rawText: string, preferPromptText: boolean): ParsedIncomingText {
  const urls = extractUrls(rawText)
  const markerPattern = new RegExp(CONTENT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const markerMatch = rawText.match(markerPattern)

  if (markerMatch && markerMatch.index !== undefined) {
    const beforeMarker = cleanFreeText(rawText.slice(0, markerMatch.index))
    const afterMarker = stripCommands(rawText.slice(markerMatch.index + markerMatch[0].length))
      .replace(/\s+/g, ' ')
      .trim()

    return {
      urls,
      temporaryPromptText: beforeMarker || null,
      contentText: afterMarker || null,
    }
  }

  const cleanedText = cleanFreeText(rawText)
  return {
    urls,
    temporaryPromptText: preferPromptText ? (cleanedText || null) : null,
    contentText: preferPromptText ? null : (cleanedText || null),
  }
}

function serializeLinkSourcePayload(payload: StoredLinkSourcePayload): string {
  return JSON.stringify(payload)
}

function parseStoredLinkSourcePayload(draft: DraftRow): StoredLinkSourcePayload {
  const fallbackUrls = extractUrls(draft.source_url || '')

  if (!draft.raw_content) {
    return { urls: fallbackUrls, additionalContentText: null }
  }

  try {
    const parsed = JSON.parse(draft.raw_content)
    if (Array.isArray(parsed?.urls)) {
      return {
        urls: parsed.urls.filter((url: unknown): url is string => typeof url === 'string'),
        additionalContentText: typeof parsed.additionalContentText === 'string'
          ? parsed.additionalContentText
          : null,
      }
    }
  } catch {
    // Old drafts stored plain raw content; fall back to source_url.
  }

  return { urls: fallbackUrls, additionalContentText: null }
}

// ── Keyboard Builders ──

function mainKeyboard(draftId: string): InlineKeyboardButton[][] {
  return [
    [{ text: '✅ موافق', callback_data: `hsnyojz:approve:${draftId}` }],
    [
      { text: '🔢 عدد النقاط', callback_data: `hsnyojz:bullets:${draftId}` },
      { text: '🎨 الأسلوب', callback_data: `hsnyojz:style:${draftId}` },
    ],
    [
      { text: '🖼 إضافة صورة', callback_data: `hsnyojz:image:${draftId}` },
      { text: '🏷 أفاتار + علم', callback_data: `hsnyojz:avatar:${draftId}` },
    ],
    [
      { text: '📌 المصدر', callback_data: `hsnyojz:source:${draftId}` },
      { text: '📝 ملاحظة', callback_data: `hsnyojz:note:${draftId}` },
    ],
    [
      { text: '💬 توجيه خاص', callback_data: `hsnyojz:framing:${draftId}` },
      { text: '✏️ تعديل نقطة', callback_data: `hsnyojz:edit_bullet:${draftId}` },
    ],
    [
      { text: '➕ إضافة نقطة', callback_data: `hsnyojz:add_bullet:${draftId}` },
      { text: '🔄 إعادة', callback_data: `hsnyojz:redo:${draftId}` },
    ],
    [{ text: '🎆 توليد صورة AI', callback_data: `hsnyojz:image_gen:${draftId}` }],
  ]
}

function bulletsSubKeyboard(draftId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: '0️⃣ عنوان فقط', callback_data: `hsnyojz:setbullets:0:${draftId}` },
      { text: '1️⃣', callback_data: `hsnyojz:setbullets:1:${draftId}` },
      { text: '2️⃣', callback_data: `hsnyojz:setbullets:2:${draftId}` },
      { text: '3️⃣', callback_data: `hsnyojz:setbullets:3:${draftId}` },
      { text: '4️⃣', callback_data: `hsnyojz:setbullets:4:${draftId}` },
      { text: '5️⃣', callback_data: `hsnyojz:setbullets:5:${draftId}` },
    ],
    [{ text: '↩️ رجوع', callback_data: `hsnyojz:back:${draftId}` }],
  ]
}

function styleSubKeyboard(draftId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: '📋 افتراضي', callback_data: `hsnyojz:setstyle:default:${draftId}` },
      { text: '🗣 خليجي', callback_data: `hsnyojz:setstyle:gulf:${draftId}` },
      { text: '💬 توجيه خاص', callback_data: `hsnyojz:setstyle:custom:${draftId}` },
    ],
    [{ text: '↩️ رجوع', callback_data: `hsnyojz:back:${draftId}` }],
  ]
}

function flagSubKeyboard(draftId: string, currentFlag: string | null): InlineKeyboardButton[][] {
  return [
    [
      { text: '🇺🇸', callback_data: `hsnyojz:setflag:🇺🇸:${draftId}` },
      { text: '🇸🇦', callback_data: `hsnyojz:setflag:🇸🇦:${draftId}` },
      { text: '🇦🇪', callback_data: `hsnyojz:setflag:🇦🇪:${draftId}` },
      { text: '🇨🇳', callback_data: `hsnyojz:setflag:🇨🇳:${draftId}` },
      { text: '🇬🇧', callback_data: `hsnyojz:setflag:🇬🇧:${draftId}` },
      { text: '🇯🇵', callback_data: `hsnyojz:setflag:🇯🇵:${draftId}` },
    ],
    [{ text: 'بدون علم', callback_data: `hsnyojz:setflag:none:${draftId}` }],
    [{ text: `✅ إبقاء الحالي: ${currentFlag || '—'}`, callback_data: `hsnyojz:back:${draftId}` }],
    [{ text: '↩️ رجوع', callback_data: `hsnyojz:back:${draftId}` }],
  ]
}

function avatarSubKeyboard(draft: DraftRow): InlineKeyboardButton[][] {
  const avatarLabel = draft.avatar_entity_name || '—'
  const flagLabel = draft.flag_emoji || '—'
  return [
    [{ text: `✍️ تعديل الأفاتار: ${avatarLabel}`, callback_data: `hsnyojz:avatar_set:${draft.id}` }],
    [
      { text: `🏳️ اختيار العلم: ${flagLabel}`, callback_data: `hsnyojz:flag:${draft.id}` },
      { text: '🚫 حذف العلم', callback_data: `hsnyojz:setflag:none:${draft.id}` },
    ],
    [{ text: '🚫 حذف الأفاتار', callback_data: `hsnyojz:avatar_clear:${draft.id}` }],
    [{ text: '↩️ رجوع', callback_data: `hsnyojz:back:${draft.id}` }],
  ]
}

function bulletEditSubKeyboard(draftId: string, bullets: string[]): InlineKeyboardButton[][] {
  const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
  const rows: InlineKeyboardButton[][] = bullets.map((b, i) => [
    {
      text: `${numEmoji[i]} ${b.length > 30 ? b.slice(0, 30) + '...' : b}`,
      callback_data: `hsnyojz:pickbullet:${i}:${draftId}`,
    },
  ])
  rows.push([{ text: '↩️ رجوع', callback_data: `hsnyojz:back:${draftId}` }])
  return rows
}

// ── Preview Message Builder ──

const STYLE_NAMES: Record<string, string> = {
  default: 'افتراضي',
  gulf: 'خليجي',
  custom: 'توجيه خاص',
}

function buildPreviewText(draft: DraftRow): string {
  const bullets = draft.summary_bullets || []
  const bulletsText = bullets.length > 0
    ? bullets.map((b) => `— ${b}`).join('\n')
    : '(عنوان فقط)'

  const hasImage = draft.hero_image_base64 ? '✅' : '❌'

  let avatarStatus = '— none'
  if (draft.avatar_entity_name) {
    avatarStatus = draft.avatar_entity_name
  }
  const flagStatus = draft.avatar_entity_name
    ? (draft.flag_emoji || '—')
    : (draft.flag_emoji ? `${draft.flag_emoji} (مخفي بدون أفاتار)` : '—')

  const lines = [
    `📰 <b>العنوان:</b>`,
    draft.summary_headline || '—',
    '',
    `📝 <b>النقاط:</b>`,
    bulletsText,
    '',
    `📌 المصدر: ${draft.summary_source_label || '—'}`,
    `🎨 الأسلوب: ${STYLE_NAMES[draft.style] || draft.style}`,
    `🔢 النقاط: ${draft.bullet_count}`,
    `🖼 صورة: ${hasImage}`,
    `🏷 أفاتار: ${avatarStatus}`,
    `🏳️ علم: ${flagStatus}`,
    `📝 ملاحظة: ${draft.custom_notes || '—'}`,
  ]

  return lines.join('\n')
}

// ── Re-summarize Helper ──

async function reSummarize(draft: DraftRow): Promise<NewsSummary> {
  const opts: SummarizeOptions = {
    bulletCount: draft.bullet_count,
    style: draft.style as 'default' | 'gulf' | 'custom',
    customFramingPrompt: draft.custom_framing_prompt || undefined,
  }

  if (draft.source_type === 'link' && draft.source_url) {
    const storedPayload = parseStoredLinkSourcePayload(draft)
    const urls = storedPayload.urls.length > 0 ? storedPayload.urls : extractUrls(draft.source_url)
    if (urls.length === 0) throw new Error('No source URLs for link re-summarize')

    const articles = await Promise.all(urls.map((url) => scrapeArticle(url)))
    const validArticles = articles.filter((article) => article.content || article.title)
    if (validArticles.length === 0) {
      throw new Error('No readable content found in stored links')
    }

    if (validArticles.length === 1) {
      const article = validArticles[0]
      return summarizeArticle(
        article.title,
        article.content,
        article.siteName,
        {
          additionalContentText: storedPayload.additionalContentText || undefined,
        },
        opts,
      )
    }

    const combinedSources: CombinedSummarySource[] = validArticles.map((article, index) => ({
      label: `رابط ${index + 1}`,
      title: article.title,
      sourceLabel: article.siteName,
      content: article.content || article.title,
    }))

    if (storedPayload.additionalContentText) {
      combinedSources.push({
        label: 'نص مضاف من المستخدم',
        content: storedPayload.additionalContentText,
      })
    }

    return summarizeCombinedSources(combinedSources, opts)
  } else if (draft.source_type === 'image' || draft.source_type === 'screenshot') {
    if (!draft.raw_content) throw new Error('No raw content for image re-summarize')
    const rawBase64 = draft.raw_content.replace(/^data:image\/\w+;base64,/, '')
    return summarizeFromImage(rawBase64, undefined, opts)
  } else {
    if (!draft.raw_content) throw new Error('No raw content for text re-summarize')
    return summarizeFromText(draft.raw_content, undefined, opts)
  }
}

// ── Render Helper ──

async function renderPoster(
  draft: DraftRow,
  request: NextRequest,
): Promise<Buffer> {
  const [avatarBase64, designConfig] = await Promise.all([
    resolveAvatar(draft.avatar_entity_name, draft.avatar_entity_org),
    getActiveDesignConfig(),
  ])
  const effectiveFlag = avatarBase64 ? draft.flag_emoji : null

  const baseUrl = getBaseUrl(request)
  const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: {
        headline: draft.summary_headline,
        bullets: draft.summary_bullets || [],
        sourceLabel: draft.summary_source_label,
        customNotes: draft.custom_notes,
      },
      imageBase64: draft.hero_image_base64,
      avatarBase64,
      flagEmoji: effectiveFlag,
      designConfig,
    }),
  })

  if (!renderRes.ok) throw new Error(`Render failed: ${renderRes.status}`)
  const arrayBuffer = await renderRes.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Update preview message in-place ──

async function refreshPreview(
  draft: DraftRow,
  chatId: string | number,
  messageId: number,
  keyboard?: InlineKeyboardButton[][],
): Promise<void> {
  const text = buildPreviewText(draft)
  const kb = keyboard || mainKeyboard(draft.id)
  await editMessageText(chatId, messageId, text, kb)
}

// ── Main Handler ──

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()

    if (update.callback_query) {
      return handleCallback(update, request)
    }

    if (!update.message) {
      return NextResponse.json({ ok: true })
    }

    const msg = update.message
    const chatId = msg.chat.id

    if (!isAdminChat(chatId)) {
      await sendMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت.')
      return NextResponse.json({ ok: true })
    }

    const rawText = msg.text || msg.caption || ''

    if (rawText === '/start') {
      await sendMessage(chatId, [
        '🗞 <b>حسن يوجز</b> - أداة إنشاء بوسترات الأخبار',
        '',
        '📌 أرسل رابط أو نص أو صورة لبدء بوستر جديد.',
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Check for pending action
    const pendingDraft = await getDraftByChatPending(String(chatId))
    if (pendingDraft) {
      return handlePendingAction(pendingDraft, msg, chatId, request)
    }

    // New poster request
    return handleNewPoster(msg, chatId, rawText, request)
  } catch (error) {
    console.error('[HsnYojz Webhook] Unhandled error:', error)
    return NextResponse.json({ ok: true })
  }
}

// ── Handle New Poster ──

async function handleNewPoster(
  msg: NonNullable<TelegramUpdate['message']>,
  chatId: number,
  rawText: string,
  request: NextRequest,
) {
  const hasPhoto = !!(msg.photo && msg.photo.length > 0)
  const parsedText = parseIncomingText(rawText, hasPhoto || extractUrls(rawText).length > 0)
  const urls = parsedText.urls
  const hasUrl = urls.length > 0
  const hasText = !!parsedText.contentText

  if (!hasUrl && !hasPhoto && !hasText) {
    await sendMessage(chatId, '❌ أرسل رابط أو نص أو صورة للخبر')
    return NextResponse.json({ ok: true })
  }

  await sendMessage(chatId, '⏳ جاري القراءة والتلخيص...')

  let imageBase64: string | null = null
  if (hasPhoto) {
    try {
      const bestPhoto = msg.photo![msg.photo!.length - 1]
      const photoBuffer = await downloadTelegramFile(bestPhoto.file_id)
      imageBase64 = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`
    } catch (err) {
      console.error('[HsnYojz] Failed to download user photo:', err)
    }
  }

  let summary: NewsSummary
  let sourceType: string = 'text'
  let rawContent: string | null = null
  let primarySourceUrl: string | null = null

  if (hasUrl) {
    sourceType = 'link'
    let articles
    try {
      articles = await Promise.all(urls.map((url) => scrapeArticle(url)))
    } catch {
      await sendMessage(chatId, '❌ تعذر قراءة المقال. تأكد من صحة الرابط.')
      return NextResponse.json({ ok: true })
    }

    const validArticles = articles.filter((article) => article.content || article.title)
    if (validArticles.length === 0) {
      await sendMessage(chatId, '❌ لم أتمكن من استخراج محتوى من هذا الرابط.')
      return NextResponse.json({ ok: true })
    }

    primarySourceUrl = urls.join('\n')
    rawContent = serializeLinkSourcePayload({
      urls,
      additionalContentText: parsedText.contentText,
    })

    try {
      if (validArticles.length === 1) {
        const article = validArticles[0]
        summary = await summarizeArticle(
          article.title,
          article.content,
          article.siteName,
          {
            additionalContentText: parsedText.contentText || undefined,
          },
          {
            temporaryPrompt: parsedText.temporaryPromptText || undefined,
          },
        )
      } else {
        const combinedSources: CombinedSummarySource[] = validArticles.map((article, index) => ({
          label: `رابط ${index + 1}`,
          title: article.title,
          sourceLabel: article.siteName,
          content: article.content || article.title,
        }))

        if (parsedText.contentText) {
          combinedSources.push({
            label: 'نص مضاف من المستخدم',
            content: parsedText.contentText,
          })
        }

        summary = await summarizeCombinedSources(combinedSources, {
          temporaryPrompt: parsedText.temporaryPromptText || undefined,
        })
      }
    } catch {
      await sendMessage(chatId, '❌ تعذر تلخيص المقال. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    const firstImageArticle = validArticles.find((article) => article.ogImage)
    if (!imageBase64 && firstImageArticle?.ogImage) {
      try {
        const imgRes = await fetch(firstImageArticle.ogImage, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer()
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
          imageBase64 = `data:${contentType};base64,${Buffer.from(imgBuffer).toString('base64')}`
        }
      } catch (err) {
        console.error('[HsnYojz] Failed to fetch OG image:', err)
      }
    }
  } else if (hasText && !hasPhoto) {
    sourceType = 'text'
    rawContent = parsedText.contentText
    try {
      summary = await summarizeFromText(parsedText.contentText!, undefined, {
        temporaryPrompt: parsedText.temporaryPromptText || undefined,
      })
    } catch {
      await sendMessage(chatId, '❌ تعذر تلخيص النص. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }
  } else if (hasPhoto) {
    sourceType = 'image'
    rawContent = imageBase64
    if (!imageBase64) {
      await sendMessage(chatId, '❌ تعذر تحميل الصورة. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }
    const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    try {
      summary = await summarizeFromImage(
        rawBase64,
        {
          additionalContentText: parsedText.contentText || undefined,
        },
        {
          temporaryPrompt: parsedText.temporaryPromptText || undefined,
        },
      )
    } catch {
      await sendMessage(chatId, '❌ تعذر قراءة النص من الصورة. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }
  } else {
    await sendMessage(chatId, '❌ أرسل رابط أو نص أو صورة للخبر')
    return NextResponse.json({ ok: true })
  }

  // Resolve avatar
  const avatarBase64 = await resolveAvatar(summary.entityName, summary.entityOrg)

  // Create draft
  const draft = await createDraft({
    source_url: primarySourceUrl,
    source_type: sourceType,
    raw_content: rawContent,
    summary_headline: summary.headline,
    summary_bullets: summary.bullets as unknown as string[],
    summary_source_label: summary.sourceLabel,
    hero_image_base64: imageBase64,
    avatar_entity_name: summary.entityName,
    avatar_entity_org: summary.entityOrg,
    flag_emoji: summary.flagEmoji,
    telegram_chat_id: String(chatId),
    style: 'default',
    bullet_count: 3,
  } as Partial<DraftRow>)

  if (!draft) {
    await sendMessage(chatId, '❌ تعذر حفظ المسودة. حاول مرة أخرى.')
    return NextResponse.json({ ok: true })
  }

  // Send preview with main keyboard
  const previewText = buildPreviewText(draft)
  const msgId = await sendMessageWithKeyboard(chatId, previewText, mainKeyboard(draft.id))

  // Save preview message ID
  await updateDraft(draft.id, { telegram_preview_message_id: msgId })

  return NextResponse.json({ ok: true })
}

// ── Handle Pending Action (text/photo replies) ──

async function handlePendingAction(
  draft: DraftRow,
  msg: NonNullable<TelegramUpdate['message']>,
  chatId: number,
  request: NextRequest,
) {
  const action = draft.pending_action!
  const text = msg.text || msg.caption || ''
  const previewMsgId = draft.telegram_preview_message_id

  if (action === 'awaiting_image') {
    if (!msg.photo || msg.photo.length === 0) {
      await sendMessage(chatId, '❌ أرسل صورة.')
      return NextResponse.json({ ok: true })
    }
    const bestPhoto = msg.photo[msg.photo.length - 1]
    const photoBuffer = await downloadTelegramFile(bestPhoto.file_id)
    const imageBase64 = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`
    await updateDraft(draft.id, {
      hero_image_base64: imageBase64,
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_source') {
    await updateDraft(draft.id, {
      summary_source_label: text.trim(),
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_framing') {
    await sendMessage(chatId, '⏳ جاري إعادة الصياغة...')
    await updateDraft(draft.id, {
      custom_framing_prompt: text.trim(),
      style: 'custom',
      pending_action: null,
    } as Partial<DraftRow>)

    try {
      const updatedDraft = { ...draft, custom_framing_prompt: text.trim(), style: 'custom' } as DraftRow
      const summary = await reSummarize(updatedDraft)
      await updateDraft(draft.id, {
        summary_headline: summary.headline,
        summary_bullets: summary.bullets as unknown as string[],
        summary_source_label: summary.sourceLabel,
        avatar_entity_name: summary.entityName,
        avatar_entity_org: summary.entityOrg,
        flag_emoji: summary.flagEmoji,
      } as Partial<DraftRow>)
    } catch (err) {
      console.error('[HsnYojz] Re-summarize failed:', err)
      await sendMessage(chatId, '⚠️ تعذرت إعادة الصياغة. تم الاحتفاظ بالنص الحالي.')
    }

    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_avatar_name') {
    const avatarName = text.trim()
    await updateDraft(draft.id, {
      avatar_entity_name: avatarName,
      pending_action: null,
    } as Partial<DraftRow>)

    // Show flag sub-keyboard
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) {
      const flagKb = flagSubKeyboard(draft.id, updated.flag_emoji)
      const previewText = buildPreviewText(updated)
      await editMessageText(chatId, previewMsgId, previewText + '\n\n🏳️ اختر العلم:', flagKb)
    }

  } else if (action === 'awaiting_flag') {
    const flagText = text.trim()
    await updateDraft(draft.id, {
      flag_emoji: flagText || null,
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_note') {
    await updateDraft(draft.id, {
      custom_notes: text.trim(),
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action.startsWith('awaiting_bullet_edit:')) {
    const index = parseInt(action.split(':')[1], 10)
    const bullets = [...(draft.summary_bullets || [])]
    if (index >= 0 && index < bullets.length) {
      bullets[index] = text.trim()
    }
    await updateDraft(draft.id, {
      summary_bullets: bullets as unknown as string[],
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_custom_bullet') {
    const bullets = [...(draft.summary_bullets || []), text.trim()]
    await updateDraft(draft.id, {
      summary_bullets: bullets as unknown as string[],
      bullet_count: bullets.length,
      pending_action: null,
    } as Partial<DraftRow>)
    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else if (action === 'awaiting_image_gen_prompt') {
    await sendMessage(chatId, '⏳ جاري توليد الصورة...')
    await updateDraft(draft.id, { pending_action: null } as Partial<DraftRow>)

    try {
      const result = await generateImage(text.trim(), draft.summary_headline || '')
      if (result.image) {
        await updateDraft(draft.id, { hero_image_base64: result.image } as Partial<DraftRow>)
      } else {
        await sendMessage(chatId, imageGenErrorMessage(result.errorType))
      }
    } catch (err) {
      console.error('[HsnYojz] Image gen failed:', err)
      await sendMessage(chatId, '❌ تعذر توليد الصورة. حاول وصفاً مختلفاً.')
    }

    const updated = await getDraft(draft.id)
    if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)

  } else {
    // Unknown pending action — clear it
    await updateDraft(draft.id, { pending_action: null } as Partial<DraftRow>)
  }

  return NextResponse.json({ ok: true })
}

// ── Handle Callback Query (Button Press) ──

async function handleCallback(update: TelegramUpdate, request: NextRequest) {
  const cb = update.callback_query!
  const chatId = cb.message?.chat.id
  const callbackData = cb.data || ''

  if (!chatId || !isAdminChat(chatId)) {
    await answerCallbackQuery(cb.id)
    return NextResponse.json({ ok: true })
  }

  await answerCallbackQuery(cb.id)

  // Parse callback_data: hsnyojz:ACTION:DRAFT_ID or hsnyojz:ACTION:PARAM:DRAFT_ID
  const parts = callbackData.split(':')
  if (parts[0] !== 'hsnyojz' || parts.length < 3) {
    return NextResponse.json({ ok: true })
  }

  const action = parts[1]
  // Draft ID is always the last part
  const draftId = parts[parts.length - 1]
  // Param (if any) is between action and draftId
  const param = parts.length === 4 ? parts[2] : undefined

  const draft = await getDraft(draftId)
  if (!draft) {
    await sendMessage(chatId, '⚠️ لم يتم العثور على المسودة.')
    return NextResponse.json({ ok: true })
  }

  const previewMsgId = draft.telegram_preview_message_id || cb.message?.message_id

  switch (action) {
    case 'approve':
      return handleApprove(draft, chatId, previewMsgId!, request)

    case 'bullets':
      if (previewMsgId) {
        const text = buildPreviewText(draft) + '\n\n🔢 اختر عدد النقاط:'
        await editMessageText(chatId, previewMsgId, text, bulletsSubKeyboard(draftId))
      }
      break

    case 'setbullets': {
      const count = parseInt(param!, 10)
      await sendMessage(chatId, '⏳ جاري إعادة التلخيص...')
      await updateDraft(draftId, { bullet_count: count })

      try {
        const updatedDraft = { ...draft, bullet_count: count } as DraftRow
        const summary = await reSummarize(updatedDraft)
        await updateDraft(draftId, {
          summary_headline: summary.headline,
          summary_bullets: summary.bullets as unknown as string[],
          summary_source_label: summary.sourceLabel,
          avatar_entity_name: summary.entityName,
          avatar_entity_org: summary.entityOrg,
          flag_emoji: summary.flagEmoji,
        } as Partial<DraftRow>)
      } catch (err) {
        console.error('[HsnYojz] Re-summarize failed:', err)
        await sendMessage(chatId, '⚠️ تعذرت إعادة التلخيص.')
      }

      const updated = await getDraft(draftId)
      if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)
      break
    }

    case 'style':
      if (previewMsgId) {
        const text = buildPreviewText(draft) + '\n\n🎨 اختر الأسلوب:'
        await editMessageText(chatId, previewMsgId, text, styleSubKeyboard(draftId))
      }
      break

    case 'setstyle': {
      const style = param as string
      if (style === 'custom') {
        await updateDraft(draftId, { pending_action: 'awaiting_framing' } as Partial<DraftRow>)
        await sendMessage(chatId, 'اكتب كيف تريد أن يُصاغ هذا الخبر...')
        break
      }

      await sendMessage(chatId, '⏳ جاري إعادة الصياغة...')
      await updateDraft(draftId, { style, custom_framing_prompt: null } as Partial<DraftRow>)

      try {
        const updatedDraft = { ...draft, style, custom_framing_prompt: null } as DraftRow
        const summary = await reSummarize(updatedDraft)
        await updateDraft(draftId, {
          summary_headline: summary.headline,
          summary_bullets: summary.bullets as unknown as string[],
          summary_source_label: summary.sourceLabel,
          avatar_entity_name: summary.entityName,
          avatar_entity_org: summary.entityOrg,
          flag_emoji: summary.flagEmoji,
        } as Partial<DraftRow>)
      } catch (err) {
        console.error('[HsnYojz] Re-summarize failed:', err)
        await sendMessage(chatId, '⚠️ تعذرت إعادة الصياغة.')
      }

      const updated = await getDraft(draftId)
      if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)
      break
    }

    case 'image':
      await updateDraft(draftId, { pending_action: 'awaiting_image' } as Partial<DraftRow>)
      await sendMessage(chatId, 'أرسل الصورة...')
      break

    case 'avatar':
      if (previewMsgId) {
        const text = buildPreviewText(draft) + '\n\n🏷 إدارة الأفاتار والعلم:'
        await editMessageText(chatId, previewMsgId, text, avatarSubKeyboard(draft))
      }
      break

    case 'avatar_set':
      await updateDraft(draftId, { pending_action: 'awaiting_avatar_name' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب اسم الشخص أو الشركة (مثل: Elon, Tesla, Apple)...')
      break

    case 'avatar_clear':
      await updateDraft(draftId, {
        avatar_entity_name: null,
        avatar_entity_org: null,
        pending_action: null,
      } as Partial<DraftRow>)
      {
        const updated = await getDraft(draftId)
        if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)
      }
      break

    case 'flag':
      if (previewMsgId) {
        const text = buildPreviewText(draft) + '\n\n🏳️ اختر العلم:'
        await editMessageText(chatId, previewMsgId, text, flagSubKeyboard(draftId, draft.flag_emoji))
      }
      break

    case 'setflag': {
      const flagValue = param === 'none' ? null : param
      await updateDraft(draftId, {
        flag_emoji: flagValue ?? null,
        pending_action: null,
      } as Partial<DraftRow>)
      const updated = await getDraft(draftId)
      if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)
      break
    }

    case 'source':
      await updateDraft(draftId, { pending_action: 'awaiting_source' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب اسم المصدر...')
      break

    case 'note':
      await updateDraft(draftId, { pending_action: 'awaiting_note' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب ملاحظتك...')
      break

    case 'framing':
      await updateDraft(draftId, { pending_action: 'awaiting_framing' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب كيف تريد أن يُصاغ هذا الخبر في سطر واحد...')
      break

    case 'edit_bullet': {
      const bullets = draft.summary_bullets || []
      if (bullets.length === 0) {
        await answerCallbackQuery(cb.id, '⚠️ لا توجد نقاط للتعديل')
        break
      }
      if (previewMsgId) {
        const text = buildPreviewText(draft) + '\n\n✏️ اختر النقطة للتعديل:'
        await editMessageText(chatId, previewMsgId, text, bulletEditSubKeyboard(draftId, bullets))
      }
      break
    }

    case 'pickbullet': {
      const index = parseInt(param!, 10)
      await updateDraft(draftId, {
        pending_action: `awaiting_bullet_edit:${index}`,
      } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب النقطة الجديدة...')
      break
    }

    case 'add_bullet': {
      const bullets = draft.summary_bullets || []
      if (bullets.length >= 5) {
        await sendMessage(chatId, '⚠️ الحد الأقصى 5 نقاط')
        break
      }
      await updateDraft(draftId, { pending_action: 'awaiting_custom_bullet' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب النقطة الجديدة...')
      break
    }

    case 'redo': {
      await sendMessage(chatId, '⏳ جاري إعادة التلخيص...')
      try {
        const summary = await reSummarize(draft)
        await updateDraft(draftId, {
          summary_headline: summary.headline,
          summary_bullets: summary.bullets as unknown as string[],
          summary_source_label: summary.sourceLabel,
          avatar_entity_name: summary.entityName,
          avatar_entity_org: summary.entityOrg,
          flag_emoji: summary.flagEmoji,
        } as Partial<DraftRow>)
      } catch (err) {
        console.error('[HsnYojz] Redo re-summarize failed:', err)
        await sendMessage(chatId, '⚠️ تعذرت إعادة التلخيص.')
      }

      const updated = await getDraft(draftId)
      if (updated && previewMsgId) await refreshPreview(updated, chatId, previewMsgId)
      break
    }

    case 'image_gen':
      await updateDraft(draftId, { pending_action: 'awaiting_image_gen_prompt' } as Partial<DraftRow>)
      await sendMessage(chatId, 'اكتب وصف الصورة المطلوبة...')
      break

    case 'back':
      if (previewMsgId) await refreshPreview(draft, chatId, previewMsgId)
      break

    default:
      break
  }

  return NextResponse.json({ ok: true })
}

// ── Approve → Render + Send Document ──

async function handleApprove(
  draft: DraftRow,
  chatId: number,
  previewMsgId: number,
  request: NextRequest,
) {
  await sendMessage(chatId, '⏳ جاري التصميم...')

  let pngBuffer: Buffer
  try {
    pngBuffer = await renderPoster(draft, request)
  } catch (err) {
    console.error('[HsnYojz] Render error:', err)
    await sendMessage(chatId, '❌ تعذر إنشاء الصورة. حاول مرة أخرى.')
    return NextResponse.json({ ok: true })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `hsnyojz-${timestamp}.png`

  await sendDocument(chatId, pngBuffer, filename)

  await updateDraft(draft.id, {
    status: 'approved',
    approved_at: new Date().toISOString(),
  } as Partial<DraftRow>)

  // Edit preview to done message
  try {
    await editMessageText(chatId, previewMsgId, '✅ تم إنشاء البوستر')
  } catch {
    // Ignore if edit fails (message too old, etc.)
  }

  return NextResponse.json({ ok: true })
}

// ── Utilities ──

export async function GET() {
  return NextResponse.json({ status: 'HsnYojz webhook is active' })
}

function imageGenErrorMessage(errorType?: ImageGenErrorType): string {
  switch (errorType) {
    case 'key_missing':
    case 'key_invalid':
      return '❌ مفتاح Gemini غير صالح أو مفقود. تحقق من إعدادات السيرفر.'
    case 'safety_blocked':
      return '❌ تم حظر الصورة بسبب سياسة الأمان. حاول وصفاً مختلفاً بدون أشخاص حقيقيين.'
    case 'quota_exceeded':
      return '❌ تم تجاوز حد الاستخدام. حاول مرة أخرى لاحقاً.'
    case 'network_error':
      return '❌ خطأ في الاتصال بخدمة Google. حاول مرة أخرى.'
    default:
      return '❌ تعذر توليد الصورة. حاول وصفاً مختلفاً.'
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}
