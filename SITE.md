| `content/` | Site content. |
| `quartz/components/Head.tsx` | **Upstream file, 1 line changed.** Pins the tab title. |
# Site notes

A minimal personal site built on a fork of [Quartz v5](https://github.com/jackyzha0/quartz)
(branch `v5`). Dark single-column layout, markdown content, no digital-garden chrome.

## Running it

```bash
npx quartz build --serve --port 8099   # dev server with live reload
npx quartz build                       # static output into public/
```

`public/` is the deployable artifact — any static host works.

## Writing content

Everything lives in `content/` as markdown:

```
content/
  index.md          -> /            home page
  blog.md           -> /blog        blog index (list is injected, see below)
  contact.md        -> /contact
  blog/
    first-post.md   -> /blog/first-post
```

A post's frontmatter drives the blog index:

```yaml
---
title: the post title
date: 2026-08-14
description: the tagline shown under the title on the index
---
```

Posts sort newest first. A post with no `date` sorts last.

> **The blog index is `content/blog.md`, not `content/blog/index.md`.**
> Quartz's `ContentPage` refuses any slug ending in `/index` (those are reserved
> for the folder-page plugin, which this site disables), so a file at
> `content/blog/index.md` would silently never be emitted.

## What was changed from upstream

Kept deliberately small so upstream `v5` can still be merged in.

| File | Change |
| --- | --- |
| `quartz.config.yaml` | Created from `quartz.config.default.yaml`. Dark palette, most plugins disabled. |
| `quartz/components/frames/PortfolioFrame.tsx` | **New.** The page shell: nav, content, footer. |
| `quartz/components/frames/index.ts` | Registers the frame as `portfolio`. 3 added lines. |
| `quartz/components/PortfolioNav.tsx` | **New.** Top-right nav links. |
| `quartz/components/PostList.tsx` | **New.** Blog listing: title + date + description. |
| `quartz/styles/custom.scss` | All the styling. Scoped to `[data-frame="portfolio"]`. |
| `content/` | Site content. |

### Editing the nav and footer

Both are constants at the top of `quartz/components/frames/PortfolioFrame.tsx`
(`Nav` links, `FOOTER_TEXT`, `BLOG_FOLDER`).

### Plugin toggles

v5 makes every component an installable plugin, so removing chrome is a config
flag rather than a code change. Disabled here: explorer, graph, search,
backlinks, table-of-contents, breadcrumbs, darkmode, reader-mode, page-title,
tag-list, tag-page, folder-page, spacer, comments, footer, canvas/bases pages.

Two non-obvious ones that must stay **enabled**:

- **`note-properties`** — despite the name, this plugin owns frontmatter
  parsing. Disable it and no `title`/`date`/`description` is read at all; the
  `---` fences render as `<hr>`. It is kept on with `hidePropertiesView: true`,
  which parses frontmatter without rendering the properties panel.
- **`content-index`** — generates the RSS feed at `/index.xml` and the sitemap.

### Frame gotcha

`PortfolioFrame` renders its `<main>` with `class="center portfolio-main"`. The
`center` class is load-bearing: some upstream component scripts (mermaid, for
one) call `document.querySelector(".center").querySelectorAll(...)` unguarded
and throw on any frame that omits it.

## Before going live

- `quartz.config.yaml`: set `pageTitle` and `baseUrl` (baseUrl feeds RSS links
  and OG tags).
- `quartz/static/icon.png` — replace the favicon.
- `FOOTER_TEXT` in the frame, and the placeholder copy in `content/`.

## The clock

`quartz/components/Clock.tsx` renders a live clock pinned to one timezone.
Configured where it is constructed, near the top of `PortfolioFrame.tsx`:

```tsx
const Clock = ClockConstructor({
  timeZone: "America/Santiago",  // any IANA timezone name
  label: "viña del mar",         // omit or "" for just the time
  hour12: false,
  showSeconds: true,
})
```

### Which pages show it

`CLOCK_PAGES` in `PortfolioFrame.tsx` lists the slugs that render the clock:

```tsx
const CLOCK_PAGES = ["contact"]   // [] hides it everywhere; "" is the home page
```

The top bar uses `justify-content: flex-end` with `margin-right: auto` on the
clock, so the nav stays right-aligned on pages where the clock is absent
(plain `space-between` would slide the nav left when it is the only child).

### Why its script is inline

The clock's JS is an inline `<script>` in the component rather than the usual
`Component.afterDOMLoaded`. Resource collection (`componentResources.ts`) only
walks emitters and the component registry — it never sees components that a
*page frame* constructs directly, so an `afterDOMLoaded` string is silently
dropped and never reaches `postscript.js`. Anything added to this frame that
needs client-side JS has the same constraint.

The script does its work on the document's `nav` event (fired by Quartz on
first load and every SPA navigation) and clears its interval via
`window.addCleanup`, so intervals don't stack up as you navigate.

## Fixed site title

Every page's browser tab reads the same thing, set once in `quartz.config.yaml`:

```yaml
configuration:
  pageTitle: "Martin Arias - Audio Post & Sound Design"
```

This required a one-line change in `quartz/components/Head.tsx` — the only
upstream file with modified logic, so **watch for a conflict here when merging
upstream v5**. Stock Quartz builds the tab title from each page's own
frontmatter title; the fork pins it:

```tsx
const title = cfg.pageTitle          // fork: same on every page
const socialTitle = (fileData.frontmatter?.title ?? …) + titleSuffix
```

`og:title` and `twitter:title` deliberately still use `socialTitle`, so a link
shared to social media previews with the specific page's name rather than the
site name. To make those constant too, swap `socialTitle` for `title` in the
two `<meta>` tags. To restore stock behaviour entirely, set `title` to the
`socialTitle` expression.

`pageTitle` also feeds `og:site_name` and the RSS feed title.

## oneko (the cat)

[oneko.js](https://github.com/adryd325/oneko.js) by adryd, MIT. Vendored, not
CDN-loaded, so the site has no third-party runtime dependency:

```
quartz/static/oneko.js        the script
quartz/static/oneko.gif       the sprite sheet
quartz/static/oneko.LICENSE   MIT text, kept alongside as the licence requires
```

Wired up by `quartz/components/Oneko.tsx`, toggled by `ONEKO_ENABLED` in
`PortfolioFrame.tsx`. Set it to `false` to remove the cat.

Two Quartz-specific adjustments live in that component:

1. **It is re-parented to `<html>`.** oneko appends its element to
   `document.body`, but Quartz's SPA navigation morphs the body against newly
   fetched HTML that contains no such element — the cat would disappear on the
   first navigation. Moving it outside `<body>` puts it beyond the morph's
   reach. It stays put because the element is `position: fixed`.
2. **`data-cat` is set explicitly.** The sprite path defaults to
   `./oneko.gif` resolved against the *page* URL, which breaks on nested pages
   like `/blog/post`. Both paths are built with `pathToRoot`, so they resolve
   correctly at any depth.

Accessibility: oneko checks `prefers-reduced-motion` itself and creates no cat
at all when a visitor asks for reduced motion. The element is `aria-hidden`.

## Mobile / narrow screens

The nav is `position: sticky` at the top of the content column, so the links
stay reachable while scrolling, and the top bar wraps to a second row instead
of overflowing when space runs out. Nav links carry vertical padding to give
them a ~31px tap target.

One trap worth remembering, since it silently broke the nav once:

```scss
& > #quartz-body {
  box-sizing: border-box;  // do not remove
  width: 100%;
  padding: 0 1rem;
}
```

Without `border-box`, `width: 100%` plus the 1rem side padding makes this
element 32px wider than the viewport. Every descendant inherits the overhang,
the page scrolls sideways, and the last nav link ends up off-screen on a
phone. `overflow-x: clip` on the same element is a second line of defence
against a stray wide child, and `.portfolio-main` sets `min-width: 0` and
`overflow-wrap: break-word` so long URLs wrap rather than widen the page.
