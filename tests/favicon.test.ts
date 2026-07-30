import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("uses the Komari favicon without overriding it from the theme header", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8")
  const header = readFileSync(new URL("../src/components/Header.tsx", import.meta.url), "utf8")

  assert.match(index, /<link rel="icon" href="\/favicon\.ico" \/>/)
  assert.doesNotMatch(index, /rel="icon"[^>]+apple-touch-icon/)
  assert.doesNotMatch(header, /link\[rel\*=['"]icon['"]\]/)
  assert.doesNotMatch(header, /shortcut icon/)
})
