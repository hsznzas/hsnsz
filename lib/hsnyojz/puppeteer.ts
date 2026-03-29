import puppeteer, { type Browser } from 'puppeteer-core'
import { existsSync } from 'fs'

let browserInstance: Browser | null = null

function findLocalChrome(): string | null {
  const envPath = process.env.CHROME_PATH
  if (envPath && existsSync(envPath)) return envPath

  const candidates: string[] =
    process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : process.platform === 'win32'
        ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
        : ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium-browser']

  for (const p of candidates) {
    try { if (existsSync(p)) return p } catch { /* skip */ }
  }
  return null
}

async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    try {
      if (browserInstance.connected) return browserInstance
    } catch { /* stale ref */ }
    browserInstance = null
  }

  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
  ]

  if (process.env.NODE_ENV !== 'production') {
    const localPath = findLocalChrome()
    if (localPath) {
      browserInstance = await puppeteer.launch({
        headless: true,
        args: baseArgs,
        executablePath: localPath,
      })
      return browserInstance
    }
  }

  const chromium = (await import('@sparticuz/chromium')).default
  browserInstance = await puppeteer.launch({
    args: [...chromium.args, ...baseArgs],
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  return browserInstance
}

/**
 * Navigate Puppeteer to a real Next.js page, inject render data via
 * window.__setPosterData, wait for the poster to render, and screenshot.
 * This guarantees the export uses the exact same CSS/fonts/layout as the
 * browser preview because it runs inside the full Next.js app.
 */
export async function renderPageToPng(
  pageUrl: string,
  renderData: Record<string, unknown>,
  width: number,
  height: number,
): Promise<{ png: Buffer; debugStyles: unknown }> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 })

    await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 20000 })

    await page.waitForFunction('window.__pageReady === true', { timeout: 10000 })

    await page.evaluate((data) => {
      window.__setPosterData!(
        data as unknown as Parameters<NonNullable<typeof window.__setPosterData>>[0],
      )
    }, renderData)

    await page.waitForSelector('#poster', { timeout: 10000 })

    await page.evaluate(() => document.fonts.ready)

    // Two rAF ticks to ensure layout + paint have completed
    await page.evaluate(() => new Promise<void>(r =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    ))

    // Remove Next.js dev error overlay so it doesn't bleed into the screenshot
    await page.evaluate(() => {
      document.querySelector('nextjs-portal')?.remove()
    })

    const element = await page.$('#poster')
    if (!element) throw new Error('Poster element not found')

    // #region agent log
    const debugStyles = await page.evaluate(() => (window as unknown as Record<string, unknown>).__debugStyles ?? null)
    // #endregion

    const screenshot = await element.screenshot({ type: 'png' })
    return { png: Buffer.from(screenshot), debugStyles }
  } finally {
    await page.close()
  }
}

