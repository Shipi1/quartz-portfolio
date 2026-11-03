import { Element, Root, RootContent } from "hast"
import { visit } from "unist-util-visit"

const element = (tagName: string, className: string, children: RootContent[]): Element => ({
  type: "element",
  tagName,
  properties: { className: [className] },
  children: children.filter((child) => child.type !== "doctype"),
})
const isTag = (node: RootContent | undefined, tag: string): node is Element =>
  node?.type === "element" && node.tagName === tag

/** Arrange the already-cloned rendering tree; Markdown remains the source of copy. */
export function portfolioLayout(tree: Root, page: string): Root {
  visit(tree, (parent) => {
    if (!("children" in parent)) return
    const children = (parent.children as RootContent[]).filter(
      (node) => node.type !== "text" || node.value.trim() !== "",
    )
    if (page === "about") {
      const split = children.findIndex(
        (node) => isTag(node, "h2") && node.properties.id === "education",
      )
      if (split < 0) return
      const intro = children.slice(0, split).filter((node) => !isTag(node, "hr"))
      parent.children = [
        element("section", "about-intro", [
          element("h1", "article-title", [{ type: "text", value: "About me" }]),
          ...intro,
        ]),
        element("section", "about-details", children.slice(split)),
      ]
      return "skip"
    }
    if (page !== "") return
    const isVideo = (node: RootContent) =>
      isTag(node, "p") &&
      node.children.some(
        (child) =>
          child.type === "element" &&
          (child.tagName === "iframe" ||
            (child.tagName === "a" &&
              (child.properties.className as string[] | undefined)?.includes("yt-facade"))),
      )
    if (!children.some(isVideo)) return
    const label = isTag(children[0], "p") ? children[0] : undefined
    const out: RootContent[] = []
    let nextLabel = label
    for (let i = label ? (isTag(children[1], "hr") ? 2 : 1) : 0; i < children.length; i++) {
      if (isTag(children[i], "p") && children[i + 1] && isVideo(children[i + 1])) {
        nextLabel = children[i] as Element
        continue
      }
      if (isVideo(children[i]) && isTag(children[i + 1], "h2") && isTag(children[i + 2], "p")) {
        const copy = [
          element(
            "div",
            "project-label",
            nextLabel ? [nextLabel] : [{ type: "text", value: "Category to be defined" }],
          ),
          children[i + 1],
          children[i + 2],
        ]
        out.push(
          element("section", "project-row", [children[i], element("div", "project-copy", copy)]),
        )
        nextLabel = undefined
        i += 2
      } else out.push(children[i])
    }
    parent.children = out
    return "skip"
  })
  return tree
}
