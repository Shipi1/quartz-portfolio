import { QuartzComponent, QuartzComponentConstructor } from "./types"

interface Options {
  /** IANA timezone name, e.g. "America/Santiago" */
  timeZone: string
  /** Optional text shown next to the time, e.g. "viña del mar" */
  label?: string
  /** 24-hour clock by default */
  hour12?: boolean
  /** Show ticking seconds */
  showSeconds?: boolean
}

/**
 * Live clock pinned to a single timezone, so visitors see the local time
 * where the author is rather than their own.
 *
 * The script ships inline rather than via `afterDOMLoaded`: components built
 * inside a page frame are not visited by the component resource collector
 * (it only walks emitters and the component registry), so an afterDOMLoaded
 * string would silently never reach postscript.js.
 *
 * On SPA navigation the body is swapped and this <script> is not re-executed,
 * so the work is done by a listener on the document's "nav" event, which
 * Quartz fires on first load and on every subsequent navigation.
 */
const CLOCK_SCRIPT = `
(function () {
  if (window.__portfolioClockInit) return
  window.__portfolioClockInit = true

  function renderClocks() {
    var els = document.querySelectorAll(".site-clock")
    if (els.length === 0) return

    function update() {
      var now = new Date()
      els.forEach(function (el) {
        var target = el.querySelector(".site-clock-time")
        if (!target) return
        var fmt = {
          timeZone: el.dataset.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: el.dataset.hour12 === "true",
        }
        if (el.dataset.seconds !== "false") fmt.second = "2-digit"
        var text
        try {
          text = new Intl.DateTimeFormat("en-GB", fmt).format(now)
        } catch (e) {
          return // unknown timezone: leave it blank rather than break the page
        }
        var label = el.dataset.label
        target.textContent = label ? label + " — " + text : text
        target.setAttribute("datetime", now.toISOString())
      })
    }

    update()
    var id = setInterval(update, 1000)
    if (window.addCleanup) window.addCleanup(function () { clearInterval(id) })
  }

  document.addEventListener("nav", renderClocks)
  if (document.readyState !== "loading") renderClocks()
})()
`

export default ((opts: Options) => {
  const Clock: QuartzComponent = () => (
    <>
      <span
        class="site-clock"
        data-timezone={opts.timeZone}
        data-label={opts.label ?? ""}
        data-hour12={opts.hour12 ? "true" : "false"}
        data-seconds={opts.showSeconds === false ? "false" : "true"}
      >
        <time class="site-clock-time"></time>
      </span>
      <script dangerouslySetInnerHTML={{ __html: CLOCK_SCRIPT }} />
    </>
  )

  return Clock
}) satisfies QuartzComponentConstructor<Options>
