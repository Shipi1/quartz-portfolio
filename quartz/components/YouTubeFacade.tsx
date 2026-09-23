import { Element, Root } from "hast"
import { visit } from "unist-util-visit"
import { clone } from "../util/clone"
import { QuartzComponent, QuartzComponentConstructor } from "./types"

/**
 * Click-to-play YouTube embeds.
 *
 * A YouTube iframe costs ~650 KB compressed (~2.4 MB of player JS/CSS) and
 * starts downloading the moment the HTML is parsed, so four of them dominated
 * page load. This replaces each one with a thumbnail link at build time; the
 * real player is only created when someone clicks.
 *
 * It has to happen at build time. Swapping iframes out in the browser would be
 * too late — they begin loading as soon as the parser sees them.
 *
 * Markdown is unchanged: `![](https://www.youtube.com/watch?v=ID)` is still
 * turned into an iframe by the obsidian-flavored-markdown plugin, and this
 * rewrites that iframe in the tree handed to the page body.
 */

// 11-character video id inside an /embed/ URL
const VIDEO_ID = /\/embed\/([A-Za-z0-9_-]{11})(?:[?#]|$)/

function isYouTubeIframe(node: Element): boolean {
  if (node.tagName !== "iframe") return false
  const cls = node.properties?.className
  return Array.isArray(cls) && cls.includes("youtube")
}

function facade(id: string, embedSrc: string, eager: boolean): Element {
  return {
    type: "element",
    tagName: "a",
    properties: {
      className: ["yt-facade"],
      // without JS the link still works: it opens the video on YouTube
      href: `https://www.youtube.com/watch?v=${id}`,
      target: "_blank",
      rel: ["noopener", "noreferrer"],
      dataEmbed: embedSrc,
      ariaLabel: "Play video",
    },
    children: [
      {
        type: "element",
        tagName: "img",
        properties: {
          // 720p thumbnail. Only exists for videos uploaded in HD; otherwise
          // YouTube returns a 120x90 placeholder and the script below swaps
          // in data-fallback (480x360, always available).
          src: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          dataFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          alt: "",
          width: 1280,
          height: 720,
          decoding: "async",
          // the first video is usually on screen at load; defer the rest
          loading: eager ? "eager" : "lazy",
        },
        children: [],
      },
      {
        type: "element",
        tagName: "span",
        properties: { className: ["yt-facade-play"], ariaHidden: "true" },
        children: [],
      },
    ],
  }
}

/**
 * Returns a copy of the page tree with YouTube iframes replaced by facades.
 * The original tree is left untouched, since other emitters also read it.
 */
export function withYouTubeFacades(tree: Root): Root {
  const out = clone(tree)
  let count = 0
  visit(out, "element", (node: Element, index, parent) => {
    if (!parent || index === undefined || !isYouTubeIframe(node)) return
    const src = String(node.properties?.src ?? "")
    const id = src.match(VIDEO_ID)?.[1]
    // playlist embeds (embed/videoseries) have no single thumbnail: keep the iframe
    if (!id) return
    parent.children[index] = facade(id, src, count === 0)
    count++
  })
  return out
}

// Delegated on document so it keeps working across SPA navigations, which
// swap the body but leave document listeners in place. Inline rather than
// afterDOMLoaded because components built inside a frame are skipped by the
// resource collector (see SITE.md, "Why its script is inline").
const FACADE_SCRIPT = `
(function () {
  if (window.__ytFacadeInit) return
  window.__ytFacadeInit = true

  // A missing 720p thumbnail comes back as a 120x90 placeholder (or an
  // error). Swap to the always-available 480x360 one when that happens.
  function fallbackIfMissing(img) {
    if (!img || !img.dataset || !img.dataset.fallback) return
    if (!img.closest("a.yt-facade")) return
    var missing = img.complete && img.naturalWidth <= 120
    if (!missing) return
    img.src = img.dataset.fallback
    delete img.dataset.fallback
  }
  function sweep() {
    document.querySelectorAll("a.yt-facade img").forEach(fallbackIfMissing)
  }
  // load/error don't bubble, but capture sees them — this covers lazy
  // thumbnails that load later as the visitor scrolls
  document.addEventListener("load", function (e) { fallbackIfMissing(e.target) }, true)
  document.addEventListener("error", function (e) { fallbackIfMissing(e.target) }, true)
  // and these catch images that finished before this script ran
  sweep()
  document.addEventListener("nav", sweep)

  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest && e.target.closest("a.yt-facade")
    if (!link || e.defaultPrevented) return
    // ctrl/cmd/shift/middle click keep their normal "open in new tab" meaning
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    var src = link.dataset.embed
    if (!src) return
    e.preventDefault()

    var url = new URL(src)
    url.hostname = "www.youtube-nocookie.com"
    url.searchParams.set("autoplay", "1")

    var frame = document.createElement("iframe")
    frame.className = "external-embed youtube"
    frame.src = url.toString()
    frame.title = link.getAttribute("aria-label") || "YouTube video"
    frame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    frame.allowFullscreen = true
    link.replaceWith(frame)
    frame.focus()
  })
})()
`

export default (() => {
  const YouTubeFacadeScript: QuartzComponent = () => (
    <script dangerouslySetInnerHTML={{ __html: FACADE_SCRIPT }} />
  )
  return YouTubeFacadeScript
}) satisfies QuartzComponentConstructor
