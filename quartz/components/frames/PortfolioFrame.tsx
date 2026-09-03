import { PageFrame, PageFrameProps } from "./types"
import { simplifySlug } from "../../util/path"
import PortfolioNavConstructor from "../PortfolioNav"
import PostListConstructor from "../PostList"
import ClockConstructor from "../Clock"
import OnekoConstructor from "../Oneko"

// ---------------------------------------------------------------------------
// Site chrome. Edit these two constants to change the nav and the footer.
// ---------------------------------------------------------------------------
const Nav = PortfolioNavConstructor({
  links: [
    { title: "home", slug: "" },
    { title: "about me", slug: "about" },
    { title: "contact", slug: "contact" },
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

const FOOTER_TEXT = `🌗Powered by Quartz. Site last updated on September 2, 2026`

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

    return (
      <div class="portfolio-shell">
        <div class="site-topbar">
          {showClock && <Clock {...componentData} />}
          <Nav {...componentData} />
        </div>
        {/* the "center" class is load-bearing: some upstream component scripts
            (e.g. mermaid) do document.querySelector(".center") unguarded */}
        <main class="center portfolio-main">
          {beforeBody.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
          <Content {...componentData} />
          {isBlogIndex && <PostList {...componentData} />}
          {afterBody.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
        </main>
        <footer class="portfolio-footer">
          {footer.map((FooterComponent) => (
            <FooterComponent {...componentData} />
          ))}
          <p>{FOOTER_TEXT}</p>
        </footer>
        {ONEKO_ENABLED && <Oneko {...componentData} />}
      </div>
    )
  },
}
