const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export type ImageGenErrorType =
  | 'key_missing'
  | 'key_invalid'
  | 'safety_blocked'
  | 'quota_exceeded'
  | 'model_error'
  | 'network_error'

export interface ImageGenResult {
  image: string | null
  errorType?: ImageGenErrorType
  errorDetail?: string
}

export async function generateImage(
  userPrompt: string,
  newsContext: string,
): Promise<ImageGenResult> {
  if (!GEMINI_API_KEY) {
    return { image: null, errorType: 'key_missing', errorDetail: 'GEMINI_API_KEY is not configured' }
  }

  const fullPrompt = `${userPrompt}. Context: this is for a news poster about: ${newsContext}. Style: clean, modern, editorial photography style, white or minimal background, high quality.`

  const primary = await generateWithImagen(fullPrompt)
  if (primary.image) return primary

  console.warn('[HsnYojz ImageGen] Primary (Imagen) failed, trying fallback. Reason:', primary.errorDetail)

  const fallback = await generateWithGeminiNative(fullPrompt)
  if (fallback.image) return fallback

  console.error('[HsnYojz ImageGen] Both paths failed. Primary:', primary.errorDetail, '| Fallback:', fallback.errorDetail)
  return fallback.errorType ? fallback : primary
}

export default generateImage

function classifyError(status: number, body: string): { errorType: ImageGenErrorType; errorDetail: string } {
  const lower = body.toLowerCase()

  if (status === 401 || status === 403 || lower.includes('api key not valid') || lower.includes('api key expired')) {
    return { errorType: 'key_invalid', errorDetail: `Auth error (${status}): ${truncate(body)}` }
  }
  if (status === 429 || lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource_exhausted')) {
    return { errorType: 'quota_exceeded', errorDetail: `Quota/rate limit (${status}): ${truncate(body)}` }
  }
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('responsible ai') || lower.includes('person')) {
    return { errorType: 'safety_blocked', errorDetail: `Safety filter (${status}): ${truncate(body)}` }
  }
  return { errorType: 'model_error', errorDetail: `HTTP ${status}: ${truncate(body)}` }
}

function truncate(s: string, max = 200): string {
  return s.length > max ? s.slice(0, max) + '...' : s
}

async function generateWithImagen(prompt: string): Promise<ImageGenResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
            personGeneration: 'allow_adult',
          },
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { image: null, ...classifyError(response.status, body) }
    }

    const data = await response.json()
    const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded

    if (!imageBytes) {
      return { image: null, errorType: 'model_error', errorDetail: 'Imagen returned 200 but no image bytes in predictions' }
    }

    return { image: `data:image/png;base64,${imageBytes}` }
  } catch (error) {
    return { image: null, errorType: 'network_error', errorDetail: `Imagen fetch error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

async function generateWithGeminiNative(prompt: string): Promise<ImageGenResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate an image: ${prompt}` }],
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { image: null, ...classifyError(response.status, body) }
    }

    const data = await response.json()

    const finishReason = data?.candidates?.[0]?.finishReason
    if (finishReason === 'SAFETY' || finishReason === 'BLOCKED') {
      return { image: null, errorType: 'safety_blocked', errorDetail: `Gemini native blocked: finishReason=${finishReason}` }
    }

    const parts = data?.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return { image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
      }
    }

    return { image: null, errorType: 'model_error', errorDetail: 'Gemini native returned 200 but no image part found' }
  } catch (error) {
    return { image: null, errorType: 'network_error', errorDetail: `Gemini native fetch error: ${error instanceof Error ? error.message : String(error)}` }
  }
}
