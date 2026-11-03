// Usage: node scripts/benchmark-portfolio.mjs BEFORE_DIR AFTER_DIR OUTPUT_DIR [runs=5]
import { chromium } from "playwright"
import { createServer } from "node:http"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { gzipSync } from "node:zlib"
import assert from "node:assert/strict"

const [before, after, output, count = "5"] = process.argv.slice(2)
if (!before || !after || !output) throw new Error("Pass before, after and output directories")
await mkdir(output, { recursive: true })
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".png": "image/png",
}
async function serve(directory) {
  const root = path.resolve(directory)
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname)
    const candidate = path.resolve(root, "." + pathname)
    if (candidate !== root && !candidate.startsWith(root + path.sep)) {
      res.writeHead(403).end()
      return
    }
    for (const filename of [candidate, candidate + ".html", path.join(candidate, "index.html")]) {
      try {
        let body = await readFile(filename)
        const ext = path.extname(filename)
        const headers = {
          "Content-Type": types[ext] ?? "application/octet-stream",
          "Cache-Control": "public, max-age=600",
        }
        if ([".html", ".css", ".js", ".json"].includes(ext)) {
          body = gzipSync(body)
          headers["Content-Encoding"] = "gzip"
        }
        res.writeHead(200, headers).end(body)
        return
      } catch {}
    }
    res.writeHead(404).end("Not found")
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  return { server, url: `http://127.0.0.1:${server.address().port}` }
}

const browser = await chromium.launch({ channel: "msedge", headless: true })
const results = {
  conditions: {
    browser: browser.version(),
    runs: Number(count),
    viewport: "390x844 @2x",
    latencyMs: 100,
    downloadMbps: 1.6,
    uploadMbps: 0.8,
    cpuSlowdown: 4,
    coldCache: true,
    compression: "gzip for HTML/CSS/JS/JSON",
    captureAfterMs: 4000,
  },
  before: [],
  after: [],
}
const servers = { before: await serve(before), after: await serve(after) }
try {
  // Alternate versions to reduce bias from changing external network conditions.
  for (let run = 0; run < Number(count); run++)
    for (const name of ["before", "after"]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
      })
      await context.addInitScript(() => {
        window.benchmarkLCP = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.benchmarkLCP = entry.startTime
        }).observe({ type: "largest-contentful-paint", buffered: true })
      })
      const page = await context.newPage()
      const client = await context.newCDPSession(page)
      await client.send("Network.enable")
      await client.send("Network.setCacheDisabled", { cacheDisabled: true })
      await client.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 100,
        downloadThroughput: 200000,
        uploadThroughput: 100000,
      })
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 })
      const urls = new Map(),
        transfers = [],
        failures = [],
        errors = []
      client.on("Network.requestWillBeSent", (e) => urls.set(e.requestId, e.request.url))
      client.on("Network.loadingFinished", (e) =>
        transfers.push({ url: urls.get(e.requestId), bytes: e.encodedDataLength }),
      )
      page.on("requestfailed", (req) =>
        failures.push({ url: req.url(), reason: req.failure()?.errorText }),
      )
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(servers[name].url, { waitUntil: "load" })
      await page.waitForTimeout(4000)
      const initial = await page.evaluate(() => ({
        fcpMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
        lcpMs: window.benchmarkLCP,
        domReadyMs: performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
        loadMs: performance.getEntriesByType("navigation")[0].loadEventEnd,
        thumbnailsReady: [...document.querySelectorAll(".yt-facade img")].filter(
          (i) => i.complete && i.naturalWidth > 0,
        ).length,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      }))
      const initialTransfers = transfers.slice()
      const external = initialTransfers.filter((t) => t.url && !t.url.startsWith(servers[name].url))
      const navRequestsBefore = transfers.length
      const navigationMs = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const start = performance.now()
            document.addEventListener("nav", () => resolve(performance.now() - start), {
              once: true,
            })
            document.querySelector('.site-nav a[href$="about"]').click()
          }),
      )
      assert.match(await page.locator("article").innerText(), /My name is Martin Arias/)
      const result = {
        ...initial,
        navigationMs,
        initialBytes: initialTransfers.reduce((s, t) => s + t.bytes, 0),
        initialRequests: initialTransfers.length,
        externalRequests: external.length,
        externalHosts: [...new Set(external.map((t) => new URL(t.url).hostname))],
        navigationRequests: transfers.length - navRequestsBefore,
        failures,
        errors,
        transfers: initialTransfers,
      }
      results[name].push(result)
      console.log(
        `${name} ${run + 1}: FCP ${Math.round(initial.fcpMs)} ms, LCP ${Math.round(initial.lcpMs)} ms, navigation ${Math.round(navigationMs)} ms, ${Math.round(result.initialBytes / 1024)} KiB, external ${external.length}`,
      )
      if (run === 0) {
        await page.goto(servers[name].url)
        await page.waitForTimeout(1500)
        await page.screenshot({ path: path.join(output, `${name}-mobile.png`), fullPage: true })
      }
      await context.close()
    }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(servers.after.url)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(output, "after-desktop.png"), fullPage: true })
  for (const slug of ["about", "contact", ""]) {
    await page
      .locator(`.site-nav a`)
      .nth(slug === "about" ? 1 : slug === "contact" ? 2 : 0)
      .click()
    await page.waitForURL(servers.after.url + (slug ? "/" + slug : "/"))
  }
  await page.goBack()
  assert.match(page.url(), /contact$/)
  await page.goForward()
  assert.equal(new URL(page.url()).pathname, "/")
  await page.locator(".yt-facade img").last().scrollIntoViewIfNeeded()
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".yt-facade img")].every((i) => i.complete && i.naturalWidth > 0),
  )
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: path.join(output, "after-desktop-loaded.png"), fullPage: true })
  const hash = await page.locator('h2 a[href^="#"]').first().getAttribute("href")
  await page.locator(`h2 a[href="${hash}"]`).click({ force: true })
  assert.equal(new URL(page.url()).hash, hash)
  await page.route("**://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ body: "<html>player test</html>", contentType: "text/html" }),
  )
  await page.locator(".yt-facade").first().click()
  assert.match(
    await page.locator("iframe.youtube").getAttribute("src"),
    /youtube-nocookie\.com.*autoplay=1/,
  )
  assert.deepEqual(errors, [])
  await page.close()
  const noJS = await browser.newContext({ javaScriptEnabled: false })
  const plain = await noJS.newPage()
  await plain.goto(servers.after.url)
  assert.equal(await plain.locator(".yt-facade").count(), 4)
  await plain.locator(".site-nav a").nth(1).click()
  assert.match(await plain.locator("article").innerText(), /My name is Martin Arias/)
  await noJS.close()
  const saver = await browser.newContext({ viewport: { width: 360, height: 800 } })
  await saver.addInitScript(() =>
    Object.defineProperty(navigator, "connection", { value: { saveData: true } }),
  )
  const mobile = await saver.newPage()
  const prefetched = []
  mobile.on("request", (req) => {
    if (/\/(about|contact)$/.test(req.url())) prefetched.push(req.url())
  })
  await mobile.goto(servers.after.url)
  await mobile.waitForTimeout(1800)
  assert.equal(prefetched.length, 0, "Data Saver disables speculative downloads")
  assert.equal(
    await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  )
  await mobile.locator(".yt-facade img").last().scrollIntoViewIfNeeded()
  await mobile.waitForFunction(() =>
    [...document.querySelectorAll(".yt-facade img")].every((i) => i.complete && i.naturalWidth > 0),
  )
  await mobile.evaluate(() => scrollTo(0, 0))
  await mobile.screenshot({ path: path.join(output, "after-mobile-loaded.png"), fullPage: true })
  await mobile.locator(".site-nav a").nth(1).click()
  await mobile.waitForURL(servers.after.url + "/about")
  await saver.close()
  results.smokeTests =
    "PASS: menus, back/forward, anchors, thumbnails, click-to-play, no-JS navigation, Data Saver, 360px layout, no page errors"
} finally {
  await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2))
  await browser.close()
  for (const { server } of Object.values(servers)) server.close()
}
