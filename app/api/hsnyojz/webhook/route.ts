// HsnYojz - Telegram Webhook Handler
// Flow: Input → Scrape → Summarize → Preview for approval → Render on confirm

import { NextRequest, NextResponse } from 'next/server'
import {
  sendMessage,
  sendMessageWithButtons,
  sendDocument,
  answerCallbackQuery,
  editMessageReplyMarkup,
  isAdminChat,
  extractUrl,
  downloadTelegramFile,
  type TelegramUpdate,
} from '@/lib/hsnyojz/telegram'
import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import { summarizeArticle, summarizeFromText, summarizeFromImage, type NewsSummary } from '@/lib/hsnyojz/summarizer'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ── In-memory pending state (single-admin bot, survives while instance is warm) ──

interface PendingPoster {
  summary: NewsSummary
  imageBase64: string | null
  url: string | null
  createdAt: number
}

const pendingPosters = new Map<number, PendingPoster>()
const awaitingEdit = new Set<number>()

const PENDING_TTL_MS = 30 * 60 * 1000 // 30 min

function cleanStale() {
  const now = Date.now()
  for (const [key, val] of Array.from(pendingPosters.entries())) {
    if (now - val.createdAt > PENDING_TTL_MS) {
      pendingPosters.delete(key)
      awaitingEdit.delete(key)
    }
  }
}

function formatSummaryMessage(summary: NewsSummary): string {
  const lines = [
    `📰 <b>${summary.headline}</b>`,
    '',
    ...summary.bullets.map((b) => `← ${b}`),
  ]
  if (summary.sourceLabel) {
    lines.push('', `📌 المصدر: ${summary.sourceLabel}`)
  }
  return lines.join('\n')
}

const APPROVAL_BUTTONS = [
  [
    { text: '✅ اعتمد', callback_data: 'approve' },
    { text: '✏️ عدّل', callback_data: 'edit' },
  ],
]

// ── Main handler ──

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()
    cleanStale()

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

    const text = msg.text || msg.caption || ''

    if (text === '/start') {
      awaitingEdit.delete(chatId)
      pendingPosters.delete(chatId)
      await sendMessage(chatId, [
        '🗞 <b>حسن يوجز</b> - أداة إنشاء بوسترات الأخبار',
        '',
        '📌 <b>طريقة الاستخدام:</b>',
        '1️⃣ أرسل رابط خبر (مع أو بدون صورة)',
        '2️⃣ أرسل نص خبر (مع أو بدون صورة)',
        '3️⃣ أرسل صورة (سكرين شوت) للخبر',
        '',
        '⚡ سيتم تلخيص الخبر ثم عرضه عليك للموافقة قبل التصميم.',
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // ── Awaiting edited text ──

    if (awaitingEdit.has(chatId)) {
      return handleEditedText(chatId, text)
    }

    // ── New input ──

    const url = extractUrl(text)
    const hasPhoto = !!(msg.photo && msg.photo.length > 0)
    const hasUrl = !!url
    const cleanText = text.replace(/https?:\/\/[^\s]+/gi, '').replace(/\/\w+/g, '').trim()
    const hasText = cleanText.length > 0

    if (!hasUrl && !hasPhoto && !hasText) {
      await sendMessage(chatId, '❌ أرسل رابط أو نص أو صورة للخبر')
      return NextResponse.json({ ok: true })
    }

    awaitingEdit.delete(chatId)
    pendingPosters.delete(chatId)

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

    if (hasUrl) {
      let article
      try {
        article = await scrapeArticle(url)
      } catch {
        await sendMessage(chatId, '❌ تعذر قراءة المقال. تأكد من صحة الرابط.')
        return NextResponse.json({ ok: true })
      }

      if (!article.content && !article.title) {
        await sendMessage(chatId, '❌ لم أتمكن من استخراج محتوى من هذا الرابط.')
        return NextResponse.json({ ok: true })
      }

      try {
        summary = await summarizeArticle(article.title, article.content, article.siteName)
      } catch {
        await sendMessage(chatId, '❌ تعذر تلخيص المقال. حاول مرة أخرى.')
        return NextResponse.json({ ok: true })
      }

      if (!imageBase64 && article.ogImage) {
        try {
          const imgRes = await fetch(article.ogImage, {
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

    } else if (hasText) {
      try {
        summary = await summarizeFromText(cleanText)
      } catch {
        await sendMessage(chatId, '❌ تعذر تلخيص النص. حاول مرة أخرى.')
        return NextResponse.json({ ok: true })
      }

    } else if (hasPhoto) {
      if (!imageBase64) {
        await sendMessage(chatId, '❌ تعذر تحميل الصورة. حاول مرة أخرى.')
        return NextResponse.json({ ok: true })
      }
      const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      try {
        summary = await summarizeFromImage(rawBase64)
      } catch {
        await sendMessage(chatId, '❌ تعذر قراءة النص من الصورة. حاول مرة أخرى.')
        return NextResponse.json({ ok: true })
      }

    } else {
      await sendMessage(chatId, '❌ أرسل رابط أو نص أو صورة للخبر')
      return NextResponse.json({ ok: true })
    }

    // Store pending and show for approval
    pendingPosters.set(chatId, {
      summary,
      imageBase64,
      url,
      createdAt: Date.now(),
    })

    await sendMessageWithButtons(chatId, formatSummaryMessage(summary), APPROVAL_BUTTONS)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[HsnYojz Webhook] Unhandled error:', error)
    return NextResponse.json({ ok: true })
  }
}

// ── Callback: Approve / Edit ──

async function handleCallback(update: TelegramUpdate, request: NextRequest) {
  const cb = update.callback_query!
  const chatId = cb.message?.chat.id
  const action = cb.data

  if (!chatId || !isAdminChat(chatId)) {
    await answerCallbackQuery(cb.id)
    return NextResponse.json({ ok: true })
  }

  // Remove buttons from the message
  if (cb.message) {
    await editMessageReplyMarkup(chatId, cb.message.message_id)
  }

  if (action === 'approve') {
    await answerCallbackQuery(cb.id, '🎨 جاري التصميم...')
    const pending = pendingPosters.get(chatId)

    if (!pending) {
      await sendMessage(chatId, '⚠️ انتهت صلاحية الطلب. أرسل الخبر مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    pendingPosters.delete(chatId)
    awaitingEdit.delete(chatId)

    await sendMessage(chatId, '⏳ جاري التصميم...')

    let pngBuffer: Buffer
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: pending.summary,
          imageBase64: pending.imageBase64,
        }),
      })

      if (!renderRes.ok) throw new Error(`Render failed: ${renderRes.status}`)
      const arrayBuffer = await renderRes.arrayBuffer()
      pngBuffer = Buffer.from(arrayBuffer)
    } catch (err) {
      console.error('[HsnYojz] Render error:', err)
      await sendMessage(chatId, '❌ تعذر إنشاء الصورة. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `hsnyojz-${timestamp}.png`
    const caption = `📰 ${pending.summary.headline}${pending.url ? `\n\n🔗 ${pending.url}` : ''}`

    await sendDocument(chatId, pngBuffer, filename, caption)

  } else if (action === 'edit') {
    await answerCallbackQuery(cb.id)
    awaitingEdit.add(chatId)

    const pending = pendingPosters.get(chatId)
    if (!pending) {
      await sendMessage(chatId, '⚠️ انتهت صلاحية الطلب. أرسل الخبر مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    const currentText = [
      pending.summary.headline,
      ...pending.summary.bullets,
    ].join('\n')

    await sendMessage(chatId, [
      '✏️ <b>عدّل النص وأرسله:</b>',
      '',
      'السطر الأول = العنوان',
      'باقي الأسطر = النقاط',
      '',
      '<code>' + currentText + '</code>',
    ].join('\n'))

  } else {
    await answerCallbackQuery(cb.id)
  }

  return NextResponse.json({ ok: true })
}

// ── Handle user's edited text ──

async function handleEditedText(chatId: number, text: string) {
  awaitingEdit.delete(chatId)

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    await sendMessage(chatId, '❌ أرسل سطرين على الأقل: العنوان + نقطة واحدة.')
    awaitingEdit.add(chatId)
    return NextResponse.json({ ok: true })
  }

  const pending = pendingPosters.get(chatId)
  const headline = lines[0]
  const bullets = lines.slice(1, 4) // max 3 bullets

  const updatedSummary: NewsSummary = {
    headline,
    bullets,
    sourceLabel: pending?.summary.sourceLabel || '',
  }

  pendingPosters.set(chatId, {
    summary: updatedSummary,
    imageBase64: pending?.imageBase64 ?? null,
    url: pending?.url ?? null,
    createdAt: Date.now(),
  })

  await sendMessageWithButtons(chatId, formatSummaryMessage(updatedSummary), APPROVAL_BUTTONS)

  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ status: 'HsnYojz webhook is active' })
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}
