/** Share in-flight requests and keep a small, short-lived HTML cache per tab. */
export function createPageCache(
  load: (url: URL) => Promise<string>,
  { maxEntries = 8, ttl = 60_000, now = Date.now } = {},
) {
  const pages = new Map<string, { expires: number; html: Promise<string> }>()
  return (url: URL): Promise<string> => {
    const target = new URL(url)
    target.hash = ""
    const key = target.href
    const cached = pages.get(key)
    if (cached && cached.expires > now()) return cached.html
    const entry = { expires: now() + ttl, html: Promise.resolve("") }
    entry.html = load(target).catch((error) => {
      if (pages.get(key) === entry) pages.delete(key)
      throw error
    })
    pages.delete(key)
    pages.set(key, entry)
    while (pages.size > maxEntries) pages.delete(pages.keys().next().value!)
    return entry.html
  }
}
