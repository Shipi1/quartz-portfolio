// Explicit maintenance command; normal builds use the committed, offline assets.
import { mkdir, writeFile, readFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = new URL("../", import.meta.url)
const thumbnailDir = new URL("quartz/static/thumbnails/", root)
const fontDir = new URL("quartz/static/fonts/", root)
await Promise.all([mkdir(thumbnailDir, { recursive: true }), mkdir(fontDir, { recursive: true })])

async function download(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const markdown = await readFile(new URL("content/index.md", root), "utf8")
const ids = [
  ...new Set([...markdown.matchAll(/youtube\.com\/watch\?v=([\w-]{11})/g)].map((m) => m[1])),
]
for (const id of ids) {
  let image = await download(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`).catch(() => null)
  if (!image || (await sharp(image).metadata()).width <= 120) {
    image = await download(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
  }
  // Crop low-resolution 4:3 fallbacks to match the existing 16:9 player box.
  for (const width of [480, 960]) {
    await sharp(image)
      .resize(width, Math.round((width * 9) / 16), { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(fileURLToPath(new URL(`${id}-${width}.webp`, thumbnailDir)))
  }
}

const families = [
  ["Schibsted Grotesk", "Schibsted+Grotesk:wght@400;700", "schibstedgrotesk"],
  ["Source Sans Pro", "Source+Sans+Pro:ital,wght@0,400;0,600;1,400;1,600", "sourcesans3"],
  ["IBM Plex Mono", "IBM+Plex+Mono:wght@400;600", "ibmplexmono"],
]
let css = "/* Vendored Latin fonts (including Spanish accents); see *-OFL.txt. */\n"
const manifest = {}
for (const [family, query, licenseDir] of families) {
  const sheet = (
    await download(`https://fonts.googleapis.com/css2?family=${query}&display=swap`, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    })
  ).toString()
  const blocks = [...sheet.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)]
  if (!blocks.length) throw new Error(`No Latin font faces for ${family}`)
  for (const [, block] of blocks) {
    const url = block.match(/url\((https:[^)]+)\)/)?.[1]
    if (!url) throw new Error(`Missing URL for ${family}`)
    const data = await download(url)
    const slug = family.toLowerCase().replaceAll(" ", "-")
    const filename = `${slug}-${createHash("sha256").update(data).digest("hex").slice(0, 10)}.woff2`
    await writeFile(new URL(filename, fontDir), data)
    css += block.replace(url, `./${filename}`) + "\n"
    if (/font-style: normal/.test(block) && /font-weight: 400/.test(block))
      manifest[family] = filename
  }
  await writeFile(
    new URL(`${licenseDir}-OFL.txt`, fontDir),
    await download(`https://raw.githubusercontent.com/google/fonts/main/ofl/${licenseDir}/OFL.txt`),
  )
}
await writeFile(new URL("portfolio.css", fontDir), css)
await writeFile(
  new URL("quartz/components/portfolio-fonts.json", root),
  JSON.stringify(manifest, null, 2) + "\n",
)
await writeFile(
  new URL("quartz/components/portfolio-thumbnails.json", root),
  JSON.stringify(ids, null, 2) + "\n",
)
console.log(`Prepared ${ids.length} thumbnails and ${families.length} font families.`)
