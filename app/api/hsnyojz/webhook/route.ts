// HsnYojz - Telegram Webhook Handler
// Flow: Link received → Scrape → Summarize → Render → Send PNG back

import { NextRequest, NextResponse } from 'next/server'
import {
  sendMessage,
  sendDocument,
  isAdminChat,
  extractUrl,
  downloadTelegramFile,
  type TelegramUpdate,
} from '@/lib/hsnyojz/telegram'
import { scrapeArticle } from '@/lib/hsnyojz/scraper'
import { summarizeArticle, summarizeFromText, summarizeFromImage, type NewsSummary } from '@/lib/hsnyojz/summarizer'

export const maxDuration = 60 // Allow full pipeline to complete
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()

    // Ignore non-message updates
    if (!update.message) {
      return NextResponse.json({ ok: true })
    }

    const msg = update.message
    const chatId = msg.chat.id

    // Security: only process messages from admin
    if (!isAdminChat(chatId)) {
      await sendMessage(chatId, '⛔ غير مصرح لك باستخدام هذا البوت.')
      return NextResponse.json({ ok: true })
    }

    // Extract text (could be in message text or caption of a photo)
    const text = msg.text || msg.caption || ''

    // Handle /start command
    if (text === '/start') {
      await sendMessage(chatId, [
        '🗞 <b>حسن يوجز</b> - أداة إنشاء بوسترات الأخبار',
        '',
        '📌 <b>طريقة الاستخدام:</b>',
        '1️⃣ أرسل رابط خبر (مع أو بدون صورة)',
        '2️⃣ أرسل نص خبر (مع أو بدون صورة)',
        '3️⃣ أرسل صورة (سكرين شوت) للخبر',
        '',
        '⚡ سيتم تلخيص الخبر وإنشاء بوستر Instagram Story جاهز.',
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // --- Input detection ---
    const url = extractUrl(text)
    const hasPhoto = !!(msg.photo && msg.photo.length > 0)
    const hasUrl = !!url
    const cleanText = text.replace(/https?:\/\/[^\s]+/gi, '').replace(/\/\w+/g, '').trim()
    const hasText = cleanText.length > 0

    if (!hasUrl && !hasPhoto && !hasText) {
      await sendMessage(chatId, '❌ أرسل رابط أو نص أو صورة للخبر')
      return NextResponse.json({ ok: true })
    }

    await sendMessage(chatId, '⏳ جاري المعالجة...\n📰 قراءة → ✍️ تلخيص → 🎨 تصميم')

    // Download Telegram photo if present (used across multiple branches)
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
      // LINK_ONLY or LINK_WITH_PHOTO
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

      // If no user photo, try OG image
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
      // TEXT_ONLY or TEXT_WITH_PHOTO
      try {
        summary = await summarizeFromText(cleanText)
      } catch {
        await sendMessage(chatId, '❌ تعذر تلخيص النص. حاول مرة أخرى.')
        return NextResponse.json({ ok: true })
      }

    } else if (hasPhoto) {
      // PHOTO_ONLY — OCR via Claude Vision
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

    // Render poster to PNG
    let pngBuffer: Buffer
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: { headline: summary.headline, bullets: summary.bullets },
          imageBase64,
        }),
      })

      if (!renderRes.ok) {
        throw new Error(`Render failed: ${renderRes.status}`)
      }

      const arrayBuffer = await renderRes.arrayBuffer()
      pngBuffer = Buffer.from(arrayBuffer)
    } catch (err) {
      console.error('[HsnYojz] Render error:', err)
      await sendMessage(chatId, '❌ تعذر إنشاء الصورة. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    // Send the poster back as a document (full quality)
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `hsnyojz-${timestamp}.png`
    const caption = `📰 ${summary.headline}${url ? `\n\n🔗 ${url}` : ''}`

    await sendDocument(chatId, pngBuffer, filename, caption)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[HsnYojz Webhook] Unhandled error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// Also handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'HsnYojz webhook is active' })
}

function getBaseUrl(request: NextRequest): string {
  // Use the request's origin, or fall back to env var
  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}
