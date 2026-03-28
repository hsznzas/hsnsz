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

export async function renderHtmlToPng(
  html: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Ensure all embedded fonts are decoded before screenshotting
    await page.evaluate(() => document.fonts.ready)

    const element = await page.$('#poster')
    if (!element) throw new Error('Poster element not found')

    const screenshot = await element.screenshot({ type: 'png' })
    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}
