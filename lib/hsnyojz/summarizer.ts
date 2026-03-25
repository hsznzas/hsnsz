import { getPrompt } from '@/lib/hsnyojz/prompt-config'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

export interface NewsSummary {
  headline: string
  bullets: string[]
  sourceLabel: string
}

export interface SummarizeExtras {
  sourceOverride?: string
  direction?: string
}

export async function summarizeArticle(
  title: string,
  content: string,
  siteName: string | null,
  extras?: SummarizeExtras,
): Promise<NewsSummary> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const systemPrompt = await getPrompt()

  let userMessage = `لخّص هذا الخبر:

العنوان: ${title}
المصدر: ${siteName || 'غير معروف'}

المحتوى:
${content.slice(0, 4000)}`

  if (extras?.direction) {
    userMessage += `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}`
  }

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
        system: systemPrompt,
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
    if (!textContent) throw new Error('No response from Claude API')

    const result = parseJsonResponse(textContent)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    console.error('[HsnYojz Summarizer] Error:', error)
    throw error
  }
}

export async function summarizeFromText(
  rawText: string,
  extras?: SummarizeExtras,
): Promise<NewsSummary> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const systemPrompt = await getPrompt()
  let userMessage = `لخّص هذا النص الإخباري:\n\n${rawText.slice(0, 4000)}`

  if (extras?.direction) {
    userMessage += `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}`
  }

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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const textContent = data?.content?.[0]?.text
    if (!textContent) throw new Error('No response from Claude API')

    const result = parseJsonResponse(textContent)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    console.error('[HsnYojz summarizeFromText] Error:', error)
    throw error
  }
}

export async function summarizeFromImage(
  imageBase64: string,
  extras?: SummarizeExtras,
): Promise<NewsSummary> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const systemPrompt = await getPrompt()

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
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'اقرأ النص في هذه الصورة ولخصه كخبر عربي. استخرج المعلومات الرئيسية وأنشئ عنواناً و 2-3 نقاط ملخصة. أجب بصيغة JSON المطلوبة فقط.'
                  + (extras?.direction ? `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}` : ''),
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const textContent = data?.content?.[0]?.text
    if (!textContent) throw new Error('No response from Claude API')

    const result = parseJsonResponse(textContent)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    console.error('[HsnYojz summarizeFromImage] Error:', error)
    throw error
  }
}

function parseJsonResponse(textContent: string): NewsSummary {
  let jsonStr = textContent.trim()
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  const result = JSON.parse(jsonStr) as NewsSummary

  if (!result.headline || !Array.isArray(result.bullets)) {
    throw new Error('Invalid summary structure from AI')
  }

  result.bullets = result.bullets.slice(0, 3)
  if (!result.sourceLabel) result.sourceLabel = ''

  return result
}
