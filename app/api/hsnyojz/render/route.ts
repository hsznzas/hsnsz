// HsnYojz - HTML to PNG Renderer
// POST: receives HTML string, returns PNG buffer
// Uses @sparticuz/chromium for serverless Puppeteer

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30 // Vercel function timeout
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json()

    if (!html) {
      return NextResponse.json({ error: 'Missing html' }, { status: 400 })
    }

    // Dynamic imports for serverless compatibility
    let browser

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      // Running on Vercel (serverless)
      const chromium = await import('@sparticuz/chromium')
      const puppeteer = await import('puppeteer-core')

      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: { width: 1080, height: 1920 },
        executablePath: await chromium.default.executablePath(),
        headless: true,
      })
    } else {
      // Running locally
      const puppeteer = await import('puppeteer')
      browser = await puppeteer.default.launch({
        defaultViewport: { width: 1080, height: 1920 },
        headless: true,
      })
    }

    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15000,
    })

    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts.ready)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    })

    await browser.close()

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="hsnyojz-story.png"',
      },
    })
  } catch (error) {
    console.error('[HsnYojz Render] Error:', error)
    return NextResponse.json(
      { error: `Render failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
