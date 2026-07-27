import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SITE_LOGO, normalizeSiteLogo, preloadSiteLogo } from "../src/lib/site-logo.ts"

test("uses the bundled Komari logo until a configured logo is ready", () => {
  assert.equal(normalizeSiteLogo(undefined), DEFAULT_SITE_LOGO)
  assert.equal(normalizeSiteLogo(""), DEFAULT_SITE_LOGO)
  assert.equal(normalizeSiteLogo("   "), DEFAULT_SITE_LOGO)
})

test("preserves legacy and custom logo URLs for preloading", () => {
  assert.equal(normalizeSiteLogo("/favicon.ico"), "/favicon.ico")
  assert.equal(normalizeSiteLogo(" https://example.com/logo.png "), "https://example.com/logo.png")
})

test("switches to a configured logo only after it loads", async () => {
  const result = await preloadSiteLogo("/custom-logo.png", () => {
    const image = { onload: null as (() => void) | null, onerror: null as (() => void) | null, src: "" }
    queueMicrotask(() => image.onload?.())
    return image
  })
  assert.equal(result, "/custom-logo.png")
})

test("keeps the bundled logo when a configured logo fails", async () => {
  const result = await preloadSiteLogo("/missing-logo.png", () => {
    const image = { onload: null as (() => void) | null, onerror: null as (() => void) | null, src: "" }
    queueMicrotask(() => image.onerror?.())
    return image
  })
  assert.equal(result, DEFAULT_SITE_LOGO)
})
