import { joinSegments, pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor } from "./types"
import config from "./visitor-map.json"

const script = `
(function () {
  if (window.__portfolioVisitors) return
  window.__portfolioVisitors = true
  var widget
  var config = ${JSON.stringify(config)}
  function mount() {
    var panel = document.getElementById("visitor-map-panel")
    if (!panel) return
    var local = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)
    if (local) { panel.hidden = false; return }
    if (!config.widgetId) { panel.hidden = !local; return }
    // Preview visits must never pollute the production visitor statistics.
    if (location.hostname !== config.productionHost && location.hostname !== "www." + config.productionHost) return
    panel.hidden = false
    panel.querySelector(".visitor-map-preview").hidden = true
    var host = panel.querySelector(".visitor-map-live")
    if (widget) { widget.hidden = false; host.appendChild(widget); return }
    widget = document.createElement("div")
    host.appendChild(widget)
    var load = function () {
      var dark = document.documentElement.getAttribute("saved-theme") === "dark"
      var params = new URLSearchParams({ d: config.widgetId, w: String(Math.min(400, host.clientWidth || 400)), t: "tt",
        cl: dark ? "30363d" : "d8d3cb", co: dark ? "0d1117" : "faf9f7",
        ct: dark ? "8b949e" : "6b7280", cmo: "3b82f6", cmn: dark ? "60a5fa" : "1a365d" })
      var tag = document.createElement("script")
      tag.id = "mapmyvisitors"
      tag.async = true
      tag.src = "https://mapmyvisitors.com/map.js?" + params
      tag.onerror = function () { widget.textContent = "Visitor statistics are currently unavailable." }
      widget.appendChild(tag)
    }
    // Count visits even without a scroll to the footer, after critical page work.
    if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 3000 })
    else setTimeout(load, 1500)
  }
  document.addEventListener("prenav", function () {
    if (widget) { widget.hidden = true; document.documentElement.appendChild(widget) }
  })
  document.addEventListener("nav", mount)
  mount()
})()
`

export default (() => {
  const VisitorMap: QuartzComponent = ({ fileData }) => (
    <>
      <section
        id="visitor-map-panel"
        class="visitor-map-panel"
        aria-labelledby="visitor-map-title"
        hidden
      >
        <h2 id="visitor-map-title">Visitors around the world</h2>
        <div class="visitor-map-preview">
          <img
            src={joinSegments(pathToRoot(fileData.slug!), "static/visitor-world.svg")}
            width="400"
            height="200"
            alt="World map — visitor statistics preview"
            loading="lazy"
          />
          <p class="visitor-map-count">
            — <span>visits</span> <span class="visitor-map-divider">·</span> —{" "}
            <span>countries</span>
          </p>
          <p class="visitor-map-note">Preview · live statistics not connected</p>
        </div>
        <div class="visitor-map-live" />
      </section>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  )
  return VisitorMap
}) satisfies QuartzComponentConstructor
