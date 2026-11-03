import { PageFrame, PageFrameProps } from "./types"
import { simplifySlug } from "../../util/path"
import { QuartzPluginData } from "../../plugins/vfile"
import PortfolioNavConstructor from "../PortfolioNav"
import PostListConstructor from "../PostList"
import ClockConstructor from "../Clock"
import OnekoConstructor from "../Oneko"
import YouTubeFacadeConstructor, { withYouTubeFacades } from "../YouTubeFacade"
import { Root } from "hast"
import PortfolioProfileConstructor from "../PortfolioProfile"
import { portfolioLayout } from "../portfolioLayout"
import VisitorMapConstructor from "../VisitorMap"

const YouTubeFacadeScript = YouTubeFacadeConstructor()
const PortfolioProfile = PortfolioProfileConstructor()
const VisitorMap = VisitorMapConstructor()

// ---------------------------------------------------------------------------
// Site chrome. Edit these two constants to change the nav and the footer.
// ---------------------------------------------------------------------------
const Nav = PortfolioNavConstructor({
  links: [
    { title: "Home", slug: "" },
    { title: "About me", slug: "about" },
    { title: "Contact", slug: "contact" },
  ],
})

// Live clock, pinned to one timezone. Set timeZone to any IANA name.
const Clock = ClockConstructor({
  timeZone: "America/Santiago",
  label: "viña del mar",
  hour12: false,
  showSeconds: true,
})

/** Slugs of pages that show the clock. "" is the home page. */
const CLOCK_PAGES = ["contact"]

/** the cursor-chasing cat; set to false to remove it */
const ONEKO_ENABLED = true
const Oneko = OnekoConstructor()

const SOURCE_URL = "https://github.com/Shipi1/quartz-portfolio"

function lastUpdated(allFiles: QuartzPluginData[]): Date {
  let newest = 0
  for (const file of allFiles) {
    const raw = file.dates?.modified ?? file.dates?.created
    const time = raw ? new Date(raw).getTime() : 0
    if (time > newest) newest = time
  }
  // no dated pages at all: fall back to build time
  return newest > 0 ? new Date(newest) : new Date()
}

/** Folder whose index page gets an automatic post listing appended. */
const BLOG_FOLDER = "blog"
const PostList = PostListConstructor({ folder: BLOG_FOLDER })

/**
 * A single narrow centered column: nav, content, footer. No sidebars,
 * no popovers, no chrome.
 */
export const PortfolioFrame: PageFrame = {
  name: "portfolio",
  render({ componentData, beforeBody, pageBody: Content, afterBody, footer }: PageFrameProps) {
    const slug = componentData.fileData.slug
    // simplifySlug("blog/index") returns "blog/" — strip the trailing slash
    const rawSimplified = slug === undefined ? undefined : simplifySlug(slug)
    const simplified = rawSimplified?.endsWith("/") ? rawSimplified.slice(0, -1) : rawSimplified
    const isBlogIndex = simplified === BLOG_FOLDER
    const showClock = simplified !== undefined && CLOCK_PAGES.includes(simplified)
    const isHome = simplified === ""

    return (
      <div class="portfolio-shell">
        <div class="site-topbar">
          {showClock && <Clock {...componentData} />}
          <Nav {...componentData} />
          <button
            class="theme-toggle"
            type="button"
            aria-label="Switch color theme"
            title="Switch color theme"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              aria-hidden="true"
            >
              <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />
            </svg>
          </button>
        </div>
        {/* the "center" class is load-bearing: some upstream component scripts
            (e.g. mermaid) do document.querySelector(".center") unguarded */}
        <main class={`center portfolio-main${simplified === "about" ? " portfolio-about" : ""}`}>
          {isHome && <PortfolioProfile {...componentData} />}
          {(!isHome && simplified !== "about" ? beforeBody : []).map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
          {/* YouTube iframes are swapped for click-to-play thumbnails here */}
          <Content
            {...componentData}
            tree={portfolioLayout(
              withYouTubeFacades(componentData.tree as Root, componentData.fileData.slug),
              simplified ?? "",
            )}
          />
          {isBlogIndex && <PostList {...componentData} />}
          {afterBody.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
          {isHome && <VisitorMap {...componentData} />}
        </main>
        <footer class="portfolio-footer">
          {footer.map((FooterComponent) => (
            <FooterComponent {...componentData} />
          ))}
          <p>
            {/* links written in the frame are not touched by the crawl-links
                plugin, so this one opts into a new tab explicitly */}
            🌗 Powered by{" "}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
              Quartz
            </a>
            . Site last updated on{" "}
            {lastUpdated(componentData.allFiles).toLocaleDateString(
              componentData.cfg.locale ?? "en-US",
              { year: "numeric", month: "long", day: "numeric" },
            )}
          </p>
        </footer>
        {ONEKO_ENABLED && <Oneko {...componentData} />}
        <YouTubeFacadeScript {...componentData} />
      </div>
    )
  },
}
