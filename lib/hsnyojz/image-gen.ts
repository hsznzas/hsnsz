const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function generateImage(userPrompt: string, newsContext: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const fullPrompt = `${userPrompt}. Context: this is for a news poster about: ${newsContext}. Style: clean, modern, editorial photography style, white or minimal background, high quality.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
            safetyFilterLevel: 'block_few',
          },
        }),
      },
    )

    if (!response.ok) {
      return await generateImageFallback(fullPrompt)
    }

    const data = await response.json()
    const imageBytes = data?.predictions?.[0]?.bytesBase64Encoded

    if (!imageBytes) return null

    return `data:image/png;base64,${imageBytes}`
  } catch (error) {
    console.error('[HsnYojz ImageGen] Error:', error)
    return null
  }
}

export default generateImage

async function generateImageFallback(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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

    if (!response.ok) return null

    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }

    return null
  } catch {
    return null
  }
}
