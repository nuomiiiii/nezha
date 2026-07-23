import assert from "node:assert/strict"
import test from "node:test"

import { getStaticCurrencyLabel } from "../src/lib/currency-label.ts"

test("displays Canadian dollars as C$", () => {
  assert.equal(getStaticCurrencyLabel("CAD"), "C$")
})
