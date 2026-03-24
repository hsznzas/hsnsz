// HsnYojz - AI Summarizer
// Uses Claude API to summarize news articles into Arabic bullet points

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

export interface NewsSummary {
  headline: string       // Arabic headline (bold, top of poster)
  bullets: string[]      // 2-3 Arabic bullet points
  sourceLabel: string    // Source name in Arabic if possible
}

const SYSTEM_PROMPT = `أنت مُلخِّص أخبار محترف. مهمتك تلخيص المقالات الإخبارية إلى نقاط موجزة باللغة العربية.

القواعد:
1. اكتب عنواناً رئيسياً قصيراً وجذاباً (5-10 كلمات) يلخص الخبر
2. اكتب 2-3 نقاط فقط، كل نقطة جملة واحدة قصيرة ومباشرة
3. استخدم العربية الفصحى البسيطة مع إمكانية استخدام كلمات إنجليزية للمصطلحات التقنية أو أسماء الشركات
4. لا تستخدم علامات ترقيم زائدة
5. كل نقطة يجب أن تبدأ بفعل أو معلومة مباشرة
6. لا تضف رأيك الشخصي، فقط الحقائق

الشكل المطلوب (JSON فقط):
{
  "headline": "العنوان الرئيسي هنا",
  "bullets": [
    "النقطة الأولى",
    "النقطة الثانية",
    "النقطة الثالثة"
  ],
  "sourceLabel": "اسم المصدر"
}

أجب بـ JSON فقط بدون أي نص إضافي أو markdown.`

export async function summarizeArticle(
  title: string,
  content: string,
  siteName: string | null
): Promise<NewsSummary> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const userMessage = `لخّص هذا الخبر:

العنوان: ${title}
المصدر: ${siteName || 'غير معروف'}

المحتوى:
${content.slice(0, 4000)}` // Limit content to avoid token overflow

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const textContent = data?.content?.[0]?.text

    if (!textContent) {
      throw new Error('No response from Claude API')
    }

    // Parse JSON response
    let jsonStr = textContent.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
    jsonStr = jsonStr.trim()

    const result = JSON.parse(jsonStr) as NewsSummary

    // Validate
    if (!result.headline || !result.bullets || result.bullets.length === 0) {
      throw new Error('Invalid summary structure from AI')
    }

    // Enforce 2-3 bullets max
    result.bullets = result.bullets.slice(0, 3)

    return result
  } catch (error) {
    console.error('[HsnYojz Summarizer] Error:', error)
    throw error
  }
}
