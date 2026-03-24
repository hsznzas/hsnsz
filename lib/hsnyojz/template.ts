// HsnYojz - Instagram Story Poster Template
// Generates HTML for a 1080x1920 Instagram story poster
// Design: circular image → headline → bullet points → brand footer

import type { NewsSummary } from './summarizer'

interface TemplateOptions {
  summary: NewsSummary
  imageBase64: string | null  // base64 data URI for the news image
  imageUrl: string | null     // fallback URL if no base64
}

/**
 * Generates the full HTML string for the news poster.
 * This HTML will be screenshotted by Puppeteer to produce the final PNG.
 *
 * Font note: Replace 'Manal' with your actual font path.
 * The @font-face src should point to the font file on your server
 * (e.g., /fonts/Manal-Regular.woff2). Update FONT_URL below.
 */

// TODO: Update this to match your actual font file path on hsnsz.com
const FONT_URL = '/fonts/Manal-Regular.woff2'

export function generatePosterHtml(options: TemplateOptions): string {
  const { summary, imageBase64, imageUrl } = options

  const imageSrc = imageBase64 || imageUrl || ''
  const hasImage = !!imageSrc

  // Build bullet points HTML
  const bulletsHtml = summary.bullets
    .map(
      (bullet) => `
      <div class="bullet-row">
        <span class="bullet-dash">—</span>
        <span class="bullet-text">${escapeHtml(bullet)}</span>
      </div>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <style>
    @font-face {
      font-family: 'Manal';
      src: url('${FONT_URL}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: 1080px;
      height: 1920px;
      background: #ffffff;
      font-family: 'Manal', 'Geeza Pro', 'Noto Sans Arabic', 'Arial', sans-serif;
      direction: rtl;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 70px;
    }

    .poster-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: 48px;
    }

    /* ── Circular Image ── */
    .image-container {
      width: 380px;
      height: 380px;
      border-radius: 50%;
      overflow: hidden;
      border: 5px solid #d4d4d4;
      flex-shrink: 0;
      background: #f5f5f5;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* ── Headline ── */
    .headline {
      font-size: 52px;
      font-weight: 700;
      color: #1a1a1a;
      text-align: center;
      line-height: 1.5;
      max-width: 900px;
      padding: 0 20px;
    }

    /* ── Bullet Points ── */
    .bullets-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 880px;
      padding: 0 20px;
    }

    .bullet-row {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      direction: rtl;
    }

    .bullet-dash {
      font-size: 38px;
      color: #888888;
      flex-shrink: 0;
      line-height: 1.6;
      font-weight: 300;
    }

    .bullet-text {
      font-size: 38px;
      color: #333333;
      line-height: 1.6;
      font-weight: 400;
    }

    /* ── Brand Footer ── */
    .brand-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: auto;
      padding-top: 40px;
    }

    .brand-name {
      font-size: 48px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 2px;
    }

    .brand-handle {
      font-size: 28px;
      color: #999999;
      font-weight: 400;
      direction: ltr;
    }

    /* ── No Image Layout ── */
    .no-image .headline {
      font-size: 58px;
      margin-top: 80px;
    }
  </style>
</head>
<body>
  <div class="poster-container ${hasImage ? '' : 'no-image'}">

    ${hasImage ? `
    <div class="image-container">
      <img src="${imageSrc}" alt="news" crossorigin="anonymous" />
    </div>
    ` : ''}

    <div class="headline">${escapeHtml(summary.headline)}</div>

    <div class="bullets-container">
      ${bulletsHtml}
    </div>

    <div class="brand-footer">
      <div class="brand-name">حسن يوجز</div>
      <div class="brand-handle">@hsnyojz</div>
    </div>

  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
