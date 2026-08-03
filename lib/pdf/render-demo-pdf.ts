/**
 * Server-side PDF generator for Present Mode.
 *
 * Renders /demo/<token>?pdf=1&capture=1 in headless Chrome and returns a PDF
 * that matches the live demo. We deliberately output ONE continuous page whose
 * height = the full document scroll height.
 *
 * Why not A4 multi-page? Chromium's fragmentation ignores CSS break-inside for
 * grids/flex and routinely slices cards, phones and mockups mid-element. Spacers
 * and forced page-breaks made it worse (giant empty voids). A continuous page
 * is how the presenter scrolls the demo — and is what you attach to an email /
 * leave on a laptop. No awkward splits, ever.
 *
 * Capture uses screen media (not print) so CornerPin matrix3d overlays stay
 * aligned with the blank product photos.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Browser } from 'puppeteer-core'

const SERVERLESS = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL

/** Capture width in CSS px — wide enough for the 2-col launch pack + phones. */
const PDF_WIDTH_PX = 980
/** Initial viewport height (just for layout; final PDF height = scrollHeight). */
const VIEWPORT_HEIGHT_PX = 1400
/** Hard cap so a runaway page can't OOM the renderer (~3× a typical demo). */
const MAX_PDF_HEIGHT_PX = 60_000

const LOCAL_CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean) as string[]

async function resolveLocalChrome(): Promise<string> {
  for (const p of LOCAL_CHROME_PATHS) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      // keep looking
    }
  }

  try {
    const { getInstalledBrowsers } = (await import('@puppeteer/browsers')) as {
      getInstalledBrowsers: (opts: { cacheDir: string }) => Promise<
        Array<{ browser: string; executablePath: string }>
      >
    }
    const cacheDir =
      process.env.PUPPETEER_CACHE_DIR || path.join(os.homedir(), '.cache', 'puppeteer')
    const installed = await getInstalledBrowsers({ cacheDir })
    const chrome = installed.find((b) => b.browser === 'chrome' || b.browser === 'chromium')
    if (chrome?.executablePath && fs.existsSync(chrome.executablePath)) {
      return chrome.executablePath
    }
  } catch {
    // fall through
  }

  throw new Error(
    'No local Chrome found for PDF generation. Install one with ' +
      '`pnpm dlx @puppeteer/browsers install chrome` (or set PUPPETEER_EXECUTABLE_PATH).'
  )
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default
  // deviceScaleFactor 1 keeps a tall continuous PDF from ballooning in memory.
  const viewport = { width: PDF_WIDTH_PX, height: VIEWPORT_HEIGHT_PX, deviceScaleFactor: 1 }

  if (SERVERLESS) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: viewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  return puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: viewport,
    executablePath: await resolveLocalChrome(),
    headless: true,
  })
}

/**
 * Load a fully-formed /demo/<token>?pdf=1&capture=1 URL and return a continuous
 * (single-page) PDF buffer that mirrors the scrolled demo exactly.
 */
export async function renderDemoPdf(demoUrl: string): Promise<Buffer> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.emulateMediaType('screen')
    await page.goto(demoUrl, { waitUntil: 'networkidle0', timeout: 60_000 })
    await page.waitForSelector('.pdf-mode', { timeout: 15_000 }).catch(() => {})

    // Release the iOS `html,body{height:100%}` cap so scrollHeight is the full doc.
    await page.evaluate(() => {
      const unlock = (el: HTMLElement | null) => {
        if (!el) return
        el.style.setProperty('height', 'auto', 'important')
        el.style.setProperty('min-height', '0', 'important')
        el.style.setProperty('max-height', 'none', 'important')
        el.style.setProperty('overflow', 'visible', 'important')
      }
      unlock(document.documentElement)
      unlock(document.body)
      // Extra bottom padding so the last section isn't flush to the page edge.
      const root = document.querySelector('.pdf-mode') as HTMLElement | null
      if (root) root.style.paddingBottom = '48px'
    })

    await page.evaluate(async () => {
      try {
        await (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready
      } catch {
        // ignore
      }
    })

    // Wait for launch-pack blanks + CornerPin overlays to finish measuring.
    await page
      .waitForFunction(
        () => {
          const blanks = Array.from(
            document.querySelectorAll<HTMLImageElement>('img[src*="demo-blank-"]')
          )
          if (blanks.length === 0) return true
          if (!blanks.every((img) => img.complete && img.naturalWidth > 0 && img.offsetWidth > 0)) {
            return false
          }
          const pins = Array.from(
            document.querySelectorAll('.pdf-mode [style*="matrix3d"]')
          ) as HTMLElement[]
          if (pins.length === 0) return true
          return pins.every((el) => getComputedStyle(el).opacity !== '0')
        },
        { timeout: 20_000 }
      )
      .catch(() => {})

    await new Promise((r) => setTimeout(r, 600))
    await page.evaluate(() => window.dispatchEvent(new Event('resize')))
    await new Promise((r) => setTimeout(r, 400))

    // Full document height = one continuous PDF page. No A4 slicing.
    const contentHeight = await page.evaluate(() => {
      const doc = document.documentElement
      const body = document.body
      return Math.max(
        doc.scrollHeight,
        body.scrollHeight,
        doc.offsetHeight,
        body.offsetHeight
      )
    })
    const pdfHeight = Math.min(Math.ceil(contentHeight) + 16, MAX_PDF_HEIGHT_PX)

    const pdf = await page.pdf({
      printBackground: true,
      width: `${PDF_WIDTH_PX}px`,
      height: `${pdfHeight}px`,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
      pageRanges: '1',
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close().catch(() => {})
  }
}
