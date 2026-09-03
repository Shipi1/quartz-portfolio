import { joinSegments, pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export interface NavLink {
  /** Text shown in the nav */
  title: string
  /** Slug relative to the site root. Empty string is the home page. */
  slug: string
}

interface Options {
  links: NavLink[]
}

/**
 * A minimal top navigation bar, aligned to the right of the content column.
 * Links are resolved relative to the current page so the site still works
 * when served from a subdirectory.
 */
export default ((opts?: Options) => {
  const links: NavLink[] = opts?.links ?? []

  const PortfolioNav: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const base = pathToRoot(fileData.slug!)
    return (
      <nav class="site-nav">
        {links.map(({ title, slug }) => (
          <a href={slug === "" ? base || "." : joinSegments(base, slug)}>{title}</a>
        ))}
      </nav>
    )
  }

  return PortfolioNav
}) satisfies QuartzComponentConstructor<Options>
