import { test } from "node:test"
import assert from "node:assert/strict"
import { createPageCache } from "./pageCache"

test("prefetch and navigation share a request, ignoring fragments", async () => {
  let requests = 0
  const get = createPageCache(async () => {
    requests++
    return "<html>about</html>"
  })
  const a = get(new URL("https://example.com/about#education"))
  const b = get(new URL("https://example.com/about"))
  assert.equal(a, b)
  assert.equal(await b, "<html>about</html>")
  assert.equal(requests, 1)
})

test("failed prefetch retries; expired and evicted pages are fetched again", async () => {
  let time = 0
  let requests = 0
  const get = createPageCache(
    async () => {
      if (++requests === 1) throw new Error("offline")
      return "ok"
    },
    { ttl: 10, maxEntries: 1, now: () => time },
  )
  const a = new URL("https://example.com/about")
  await assert.rejects(get(a), /offline/)
  assert.equal(await get(a), "ok")
  time = 11
  await get(a)
  await get(new URL("https://example.com/contact"))
  await get(a)
  assert.equal(requests, 5)
})
