import { joinSegments, pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * oneko.js — a cat that chases the cursor.
 * Upstream: https://github.com/adryd325/oneko.js (MIT, adryd)
 * Vendored at quartz/static/oneko.js + oneko.gif, license in oneko.LICENSE.
 *
 * Two things need handling to make it work inside Quartz:
 *
 *  1. oneko appends its element to document.body. Quartz's SPA navigation
 *     morphs the body against freshly fetched HTML, which does not contain
 *     that element, so the cat would vanish on the first navigation. The
 *     companion script below re-parents it to <html>, out of the morph's way.
 *
 *  2. The sprite path defaults to "./oneko.gif", resolved against the current
 *     page URL — which breaks on nested pages like /blog/post. data-cat is
 *     set explicitly to a root-relative path instead.
 *
 * The script respects prefers-reduced-motion on its own: it bails out early,
 * so no cat is created for visitors who ask for less movement.
 */
const ONEKO_SPA_FIX = `
(function () {
  if (window.__onekoSpaFix) return
  window.__onekoSpaFix = true

  function keepCat() {
    var el = document.getElementById("oneko")
    // nothing to do when prefers-reduced-motion stopped oneko from starting
    if (!el) return
    if (el.parentElement !== document.documentElement) {
      document.documentElement.appendChild(el)
    }
  }

  keepCat()
  document.addEventListener("nav", keepCat)
})()
`

export default (() => {
  const Oneko: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const base = pathToRoot(fileData.slug!)
    return (
      <>
        <script
          src={joinSegments(base, "static/oneko.js")}
          data-cat={joinSegments(base, "static/oneko.gif")}
        ></script>
        <script dangerouslySetInnerHTML={{ __html: ONEKO_SPA_FIX }} />
      </>
    )
  }

  return Oneko
}) satisfies QuartzComponentConstructor
