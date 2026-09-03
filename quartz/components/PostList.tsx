import { resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface Options {
  /** Folder slug to list posts from, e.g. "blog" */
  folder: string
  /** Optional cap on how many posts to show */
  limit?: number
}

function postDate(page: QuartzPluginData): number {
  try {
    return getDate(page)?.getTime() ?? 0
  } catch {
    return 0
  }
}

/**
 * Lists every page inside a folder, newest first, as
 * title / date / description — the shape a blog index wants.
 */
export default ((opts: Options) => {
  const PostList: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
    const prefix = `${opts.folder}/`
    let posts = allFiles
      .filter((f) => {
        const slug = f.slug ?? ""
        // pages inside the folder, excluding the folder's own index page
        return slug.startsWith(prefix) && slug !== `${opts.folder}/index`
      })
      .sort((a, b) => postDate(b) - postDate(a))

    if (opts.limit) {
      posts = posts.slice(0, opts.limit)
    }

    if (posts.length === 0) {
      return <p class="post-list-empty">nothing here yet.</p>
    }

    return (
      <div class="post-list">
        {posts.map((page) => {
          const date = postDate(page) ? getDate(page) : undefined
          const description = page.frontmatter?.description
          return (
            <div class="post-entry">
              <div class="post-head">
                <a class="internal post-link" href={resolveRelative(fileData.slug!, page.slug!)}>
                  {page.frontmatter?.title}
                </a>
                {date && (
                  <p class="post-date">
                    <Date date={date} locale={cfg.locale} />
                  </p>
                )}
              </div>
              {description && <p class="post-desc">{description}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  return PostList
}) satisfies QuartzComponentConstructor<Options>
