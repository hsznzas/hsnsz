import { getPrompt } from '@/lib/hsnyojz/prompt-config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash']

export interface NewsSummary {
  headline: string
  bullets: string[]
  sourceLabel: string
  entityName: string | null
  entityOrg: string | null
  flagEmoji: string | null
}

export interface SummarizeExtras {
  sourceOverride?: string
  direction?: string
  additionalContentText?: string
}

export interface SummarizeOptions {
  bulletCount?: number // 0-5, default 3
  style?: 'default' | 'gulf' | 'custom'
  customFramingPrompt?: string
  temporaryPrompt?: string
}

export interface CombinedSummarySource {
  label: string
  title?: string
  sourceLabel?: string | null
  content: string
}

const BULLET_INSTRUCTIONS: Record<number, string> = {
  0: 'اكتب عنواناً رئيسياً فقط بدون نقاط. أعد bullets كمصفوفة فارغة []',
  1: 'اكتب نقطة واحدة فقط، جملة مختصرة لا تتجاوز 15 كلمة',
  2: 'اكتب نقطتين، كل نقطة جملة قصيرة لا تتجاوز 12 كلمة',
  3: 'اكتب 3 نقاط، كل نقطة جملة قصيرة لا تتجاوز 10 كلمات',
  4: 'اكتب 4 نقاط، كل نقطة لا تتجاوز 8 كلمات',
  5: 'اكتب 5 نقاط، كل نقطة لا تتجاوز 6 كلمات',
}

const GULF_STYLE_APPEND = `
اكتب بالعامية الخليجية (لهجة سعودية/إماراتية). استخدم كلمات مثل:
- "بيغير" بدل "سيغير"
- "يعني" كأداة ربط
- "وش" بدل "ماذا"
- "حق" بدل "لـ"
- "كذا" بدل "هكذا"
- "الحين" بدل "الآن"
- "ذا/ذي" بدل "هذا/هذه"
- "بس" بدل "لكن/فقط"
- "يبي/يبون" بدل "يريد/يريدون"
- "شي" بدل "شيء"
حافظ على المعنى والدقة، بس غيّر الأسلوب للعامية الخليجية.`

const ENTITY_DETECTION_PROMPT = `
بالإضافة للحقول السابقة، أضف ثلاثة حقول جديدة في الـ JSON:

"entityName": اسم الشخص أو الكيان الرئيسي في الخبر بالإنجليزية، مع استبدال المسافات بـ underscore (مثل: "Tim_Cook", "Elon", "Mohammed_bin_Salman", "Bitcoin"). هذا الاسم يُستخدم للبحث عن صورة أفاتار. إذا لم يكن هناك شخص أو كيان واضح، اكتب null.

"entityOrg": اسم الشركة أو المنظمة الأم المرتبطة بالشخص في الخبر بالإنجليزية (مثل: "Apple", "Tesla", "SpaceX", "Saudi_Aramco"). يُستخدم كبديل إذا لم تتوفر صورة للشخص. أمثلة:
- خبر عن Tim Cook → entityName: "Tim_Cook", entityOrg: "Apple"
- خبر عن Elon Musk و Tesla → entityName: "Elon", entityOrg: "Tesla"
- خبر عن شركة بدون شخص محدد → entityName: "Apple", entityOrg: "Apple" (نفس القيمة)
- خبر عام بدون شخص أو شركة → entityName: null, entityOrg: null
إذا كان الخبر عن شركة وليس شخص، ضع اسم الشركة في entityName و entityOrg معاً.

"flagEmoji": إيموجي علم الدولة المرتبطة بالخبر. أمثلة:
- أخبار أمريكية: "🇺🇸"
- أخبار سعودية: "🇸🇦"
- أخبار إماراتية: "🇦🇪"
- أخبار صينية: "🇨🇳"
- أخبار بريطانية: "🇬🇧"
- أخبار يابانية: "🇯🇵"
- أخبار عالمية بدون دولة محددة: null
- بيتكوين/كريبتو: null`

const CONTEXT_GROUNDING_PROMPT = `
═══ فهم السياق ═══
لا تكتفِ بالتلخيص الحرفي للنص. حاول فهم السياق الأوسع للخبر: ما الذي يعنيه الحدث، ولماذا يهم، وما الخلفية القريبة اللازمة لفهمه.

إذا كانت لديك قدرة فعلية على البحث أو التحقق الخارجي، استخدمها بشكل خفيف جداً فقط لتثبيت السياق العام أو إزالة الالتباس، وليس لإعادة كتابة الخبر من الصفر.

إذا لم تكن لديك قدرة فعلية على التحقق الخارجي، فاعتمد فقط على:
1. النص والمصدر المرسل لك
2. معرفتك العامة السابقة

في جميع الحالات:
- لا تخترع أي معلومة غير مذكورة أو غير مؤكدة
- لا تضف "سياقاً" يبدو حديثاً أو آنيّاً إلا إذا كنت متأكداً منه
- إذا كان السياق غير واضح، التزم بالخبر نفسه وقدّم أفضل فهم تحليلي محافظ
- الهدف: ملخص يفهم الخبر ضمن معناه، لا مجرد اختصار حرفي للجمل`

function buildSystemPrompt(basePrompt: string, options?: SummarizeOptions): string {
  let prompt = basePrompt

  prompt += '\n\n' + ENTITY_DETECTION_PROMPT
  prompt += '\n\n' + CONTEXT_GROUNDING_PROMPT

  const bulletCount = options?.bulletCount ?? 3
  const bulletInstruction = BULLET_INSTRUCTIONS[bulletCount] ?? BULLET_INSTRUCTIONS[3]
  prompt += `\n\n═══ تعليمات النقاط ═══\n${bulletInstruction}`

  if (options?.style === 'gulf') {
    prompt += '\n\n═══ أسلوب الكتابة ═══' + GULF_STYLE_APPEND
  } else if (options?.style === 'custom' && options.customFramingPrompt) {
    prompt += `\n\nتوجيه خاص من المستخدم: ${options.customFramingPrompt}`
  }

  if (options?.temporaryPrompt) {
    prompt += `\n\n═══ Prompt إضافي مؤقت من المستخدم ═══\n${options.temporaryPrompt}`
  }

  prompt = prompt.replace(
    /الشكل المطلوب \(JSON فقط\):[\s\S]*?أجب بـ JSON فقط بدون أي نص إضافي أو markdown\./,
    `الشكل المطلوب (JSON فقط):
{
  "headline": "العنوان الرئيسي هنا",
  "bullets": ["نقطة 1", "نقطة 2"],
  "sourceLabel": "اسم المصدر الحقيقي أو فارغ إذا غير معروف",
  "entityName": "Tim_Cook",
  "entityOrg": "Apple",
  "flagEmoji": "🇺🇸"
}

bullets يمكن أن تكون مصفوفة فارغة [] إذا العنوان يغطي الخبر بالكامل.
sourceLabel = المصدر الأصلي للخبر (صحيفة، وكالة، جهة رسمية). إذا لم يوجد مصدر حقيقي واضح، أرجع "" فارغاً.
entityName و entityOrg و flagEmoji تُستخدم لعرض أفاتار وعلم في البوستر.

أجب بـ JSON فقط بدون أي نص إضافي أو markdown.`,
  )

  return prompt
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } }

async function callGemini(
  systemPrompt: string,
  parts: GeminiPart[],
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  let lastError: Error | null = null

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const ed = errorData as { error?: { message?: string } }
        const errMsg = ed?.error?.message || JSON.stringify(errorData).slice(0, 80)
        // #region agent log
        console.error(`[HSY-GEMINI-ERR] model=${model} status=${response.status} ${errMsg.slice(0, 80)}`)
        // #endregion
        lastError = new Error(`Gemini ${model} HTTP${response.status}: ${errMsg}`)
        continue
      }

      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      const finishReason = data?.candidates?.[0]?.finishReason
      // #region agent log
      console.error(`[HSY-GEMINI-OK] model=${model} len=${text?.length} finish=${finishReason}`)
      // #endregion
      if (!text) {
        lastError = new Error(`Gemini ${model}: no text in response (finish=${finishReason})`)
        continue
      }
      return text
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // #region agent log
      console.error(`[HSY-GEMINI-THROW] model=${model} ${lastError.message.slice(0, 80)}`)
      // #endregion
      continue
    }
  }

  throw lastError || new Error('All Gemini models failed')
}

export async function summarizeArticle(
  title: string,
  content: string,
  siteName: string | null,
  extras?: SummarizeExtras,
  options?: SummarizeOptions,
): Promise<NewsSummary> {
  const basePrompt = await getPrompt()
  const systemPrompt = buildSystemPrompt(basePrompt, options)

  let userMessage = `لخّص هذا الخبر:

العنوان: ${title}
المصدر: ${siteName || 'غير معروف'}

المحتوى:
${content.slice(0, 4000)}`

  if (extras?.additionalContentText) {
    userMessage += `\n\nنص إضافي من المستخدم باعتباره جزءاً من المحتوى:\n${extras.additionalContentText.slice(0, 2000)}`
  }

  if (extras?.direction) {
    userMessage += `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}`
  }

  try {
    const textContent = await callGemini(systemPrompt, [{ text: userMessage }])
    const result = parseJsonResponse(textContent, options?.bulletCount)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[HSY-ARTICLE]', errMsg.slice(0, 120))
    // #endregion
    throw error
  }
}

export async function summarizeFromText(
  rawText: string,
  extras?: SummarizeExtras,
  options?: SummarizeOptions,
): Promise<NewsSummary> {
  const basePrompt = await getPrompt()
  const systemPrompt = buildSystemPrompt(basePrompt, options)
  let userMessage = `لخّص هذا النص الإخباري:\n\n${rawText.slice(0, 4000)}`

  if (extras?.additionalContentText) {
    userMessage += `\n\nنص إضافي من المستخدم باعتباره جزءاً من المحتوى:\n${extras.additionalContentText.slice(0, 2000)}`
  }

  if (extras?.direction) {
    userMessage += `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}`
  }

  try {
    const textContent = await callGemini(systemPrompt, [{ text: userMessage }])
    const result = parseJsonResponse(textContent, options?.bulletCount)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[HSY-TEXT]', errMsg.slice(0, 120))
    // #endregion
    throw error
  }
}

export async function summarizeFromImage(
  imageBase64: string,
  extras?: SummarizeExtras,
  options?: SummarizeOptions,
): Promise<NewsSummary> {
  const basePrompt = await getPrompt()
  const systemPrompt = buildSystemPrompt(basePrompt, options)

  let imagePrompt = 'اقرأ النص في هذه الصورة ولخصه كخبر عربي. استخرج المعلومات الرئيسية وأنشئ عنواناً و نقاط ملخصة. أجب بصيغة JSON المطلوبة فقط (تشمل entityName و entityOrg و flagEmoji).'

  if (extras?.additionalContentText) {
    imagePrompt += `\n\nاستخدم أيضاً هذا النص المضاف من المستخدم باعتباره جزءاً من المحتوى:\n${extras.additionalContentText.slice(0, 2000)}`
  }

  if (extras?.direction) {
    imagePrompt += `\n\nتوجيه إضافي: أضف نقطة واحدة تتناول هذا الجانب: ${extras.direction}`
  }

  try {
    const textContent = await callGemini(systemPrompt, [
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      { text: imagePrompt },
    ])
    const result = parseJsonResponse(textContent, options?.bulletCount)
    if (extras?.sourceOverride) result.sourceLabel = extras.sourceOverride
    return result
  } catch (error) {
    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[HSY-IMAGE]', errMsg.slice(0, 120))
    // #endregion
    throw error
  }
}

export async function summarizeCombinedSources(
  sources: CombinedSummarySource[],
  options?: SummarizeOptions,
): Promise<NewsSummary> {
  if (sources.length === 0) {
    throw new Error('No sources provided for combined summary')
  }

  const basePrompt = await getPrompt()
  const systemPrompt = buildSystemPrompt(basePrompt, options)

  const combinedSourceText = sources
    .map((source, index) => {
      const parts = [
        `المصدر ${index + 1}: ${source.label}`,
        source.title ? `العنوان: ${source.title}` : null,
        source.sourceLabel ? `اسم المصدر: ${source.sourceLabel}` : null,
        `المحتوى:\n${source.content.slice(0, 2500)}`,
      ].filter(Boolean)

      return parts.join('\n')
    })
    .join('\n\n══════\n\n')

  const userMessage = `لخّص هذه المصادر المتعددة كخبر/بوست واحد مترابط. إذا كانت بينها علاقة، ادمجها بشكل ذكي في ملخص واحد. إذا كانت متقاربة لكن ليست متطابقة، استخرج القاسم المشترك أو الزاوية الأهم.\n\n${combinedSourceText}`

  try {
    const textContent = await callGemini(systemPrompt, [{ text: userMessage }])
    return parseJsonResponse(textContent, options?.bulletCount)
  } catch (error) {
    // #region agent log
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[HSY-COMBINED]', errMsg.slice(0, 120))
    // #endregion
    throw error
  }
}

function parseJsonResponse(textContent: string, bulletCount?: number): NewsSummary {
  let jsonStr = textContent.trim()
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  const raw = JSON.parse(jsonStr)

  if (!raw.headline || !Array.isArray(raw.bullets)) {
    throw new Error('Invalid summary structure from AI')
  }

  const maxBullets = bulletCount ?? 3
  const result: NewsSummary = {
    headline: raw.headline,
    bullets: raw.bullets.slice(0, Math.max(maxBullets, 5)),
    sourceLabel: raw.sourceLabel || '',
    entityName: raw.entityName ?? null,
    entityOrg: raw.entityOrg ?? null,
    flagEmoji: raw.flagEmoji ?? null,
  }

  return result
}
