/**
 * Visual review harness. Not part of the app build — it exists so the design
 * can be looked at, at real breakpoints, instead of imagined. It also fails
 * loudly on the two things screenshots hide: console errors and horizontal
 * overflow.
 *
 * Playwright is deliberately not a dependency of this project, since nothing
 * that ships needs it. Install it only when you want to run this:
 *
 *   npm i --no-save playwright
 *   npm run preview -- --port 4321 &
 *   node scripts/shoot.mjs [outDir] [baseUrl]
 *
 * Set CHROME_PATH if your Chromium lives somewhere non-standard.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = process.argv[2] ?? '/tmp/shots'
const BASE = process.argv[3] ?? 'http://localhost:4321'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
]

const STOPS = ['top', 'work', 'services', 'process', 'gallery', 'studio', 'contact']

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})

const consoleIssues = []

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleIssues.push(`[${vp.name}] ${msg.type()}: ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => consoleIssues.push(`[${vp.name}] pageerror: ${err.message}`))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  // Let the hero's light-up sequence finish before the first frame.
  await page.waitForTimeout(2600)

  for (const id of STOPS) {
    if (id !== 'top') {
      await page.evaluate((anchor) => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      }, id)
      // Reveals are ~1.1s; give them room to land.
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-${id}.png` })
  }

  // Horizontal overflow is the classic responsive failure — assert it.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 1) consoleIssues.push(`[${vp.name}] horizontal overflow: ${overflow}px`)

  await context.close()
}

// Mobile menu, and the lightbox, both need looking at.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.getByRole('button', { name: /open menu/i }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/mobile-menu.png` })
  await context.close()
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.evaluate(() => document.getElementById('work')?.scrollIntoView())
  await page.waitForTimeout(1200)
  await page.locator('#work button').first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/desktop-lightbox.png` })
  await context.close()
}

await browser.close()

if (consoleIssues.length) {
  console.log('ISSUES:')
  for (const issue of consoleIssues) console.log(' -', issue)
} else {
  console.log('No console errors, no horizontal overflow.')
}
console.log('Shots in', OUT)
