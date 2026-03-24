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
import { summarizeArticle } from '@/lib/hsnyojz/summarizer'
import { generatePosterHtml } from '@/lib/hsnyojz/template'

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
        '1️⃣ أرسل رابط خبر',
        '2️⃣ (اختياري) أرسل صورة مع الرابط في التعليق',
        '3️⃣ انتظر البوستر!',
        '',
        '⚡ سيتم تلخيص الخبر وإنشاء بوستر Instagram Story جاهز.',
      ].join('\n'))
      return NextResponse.json({ ok: true })
    }

    // Extract URL from message
    const url = extractUrl(text)
    if (!url) {
      await sendMessage(chatId, '❌ لم أجد رابطاً في رسالتك. أرسل رابط الخبر.')
      return NextResponse.json({ ok: true })
    }

    // Notify user that processing started
    await sendMessage(chatId, '⏳ جاري المعالجة...\n📰 قراءة المقال → ✍️ تلخيص → 🎨 تصميم')

    // Step 1: Scrape the article
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

    // Step 2: Handle image
    let imageBase64: string | null = null
    let imageUrl: string | null = article.ogImage

    // If user sent a photo with the message, use that instead of OG image
    if (msg.photo && msg.photo.length > 0) {
      try {
        // Get the highest resolution photo
        const bestPhoto = msg.photo[msg.photo.length - 1]
        const photoBuffer = await downloadTelegramFile(bestPhoto.file_id)
        imageBase64 = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`
        imageUrl = null // User photo takes priority
      } catch (err) {
        console.error('[HsnYojz] Failed to download user photo:', err)
        // Fall back to OG image
      }
    }

    // If we have an OG image URL but no base64, convert it
    if (!imageBase64 && imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, {
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

    // Step 3: Summarize with Claude
    let summary
    try {
      summary = await summarizeArticle(article.title, article.content, article.siteName)
    } catch {
      await sendMessage(chatId, '❌ تعذر تلخيص المقال. حاول مرة أخرى.')
      return NextResponse.json({ ok: true })
    }

    // Step 4: Generate HTML poster
    const posterHtml = generatePosterHtml({
      summary,
      imageBase64,
      imageUrl: null, // We already converted to base64
    })

    // Step 5: Render HTML to PNG
    let pngBuffer: Buffer
    try {
      const baseUrl = getBaseUrl(request)
      const renderRes = await fetch(`${baseUrl}/api/hsnyojz/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: posterHtml }),
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

    // Step 6: Send the poster back as a document (for full quality)
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `hsnyojz-${timestamp}.png`
    const caption = `📰 ${summary.headline}\n\n🔗 ${url}`

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
