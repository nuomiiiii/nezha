import assert from "node:assert/strict"
import test from "node:test"

import { detectCanadianDollarCurrency, getStaticCurrencyLabel } from "../src/lib/currency-label.ts"

test("displays Canadian dollars as C$", () => {
  assert.equal(getStaticCurrencyLabel("CAD"), "C$")
})

test("recognizes Canadian dollars embedded in legacy amount values", () => {
  assert.equal(detectCanadianDollarCurrency("CA$45"), "CAD")
  assert.equal(detectCanadianDollarCurrency("45 CA$"), "CAD")
  assert.equal(detectCanadianDollarCurrency("C$45"), "CAD")
  assert.equal(detectCanadianDollarCurrency("CAD 45"), "CAD")
  assert.equal(detectCanadianDollarCurrency("$45"), undefined)
  assert.equal(detectCanadianDollarCurrency("45"), undefined)
})
