import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SITE_LOGO, normalizeSiteLogo, preloadSiteLogo } from "../src/lib/site-logo.ts"

test("uses the Komari favicon when no custom logo is configured", () => {
  assert.equal(normalizeSiteLogo(undefined), DEFAULT_SITE_LOGO)
  assert.equal(normalizeSiteLogo(""), DEFAULT_SITE_LOGO)
  assert.equal(normalizeSiteLogo("   "), DEFAULT_SITE_LOGO)
  assert.equal(DEFAULT_SITE_LOGO, "/favicon.ico")
})

test("migrates the legacy default logo while preserving custom URLs", () => {
  assert.equal(normalizeSiteLogo("/apple-touch-icon.png"), DEFAULT_SITE_LOGO)
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

test("falls back to the Komari favicon when a configured logo fails", async () => {
  const result = await preloadSiteLogo("/missing-logo.png", () => {
    const image = { onload: null as (() => void) | null, onerror: null as (() => void) | null, src: "" }
    queueMicrotask(() => image.onerror?.())
    return image
  })
  assert.equal(result, DEFAULT_SITE_LOGO)
})
