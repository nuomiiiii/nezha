import assert from "node:assert/strict"
import test from "node:test"

import { getBillingRemainingTone } from "../src/lib/billing-status.ts"

test("uses danger color below 14 remaining days", () => {
  assert.equal(getBillingRemainingTone(13), "danger")
  assert.equal(getBillingRemainingTone(0), "danger")
})

test("keeps 14 days and above healthy", () => {
  assert.equal(getBillingRemainingTone(14), "healthy")
  assert.equal(getBillingRemainingTone(427), "healthy")
})

test("keeps expired dates red and permanent dates green", () => {
  assert.equal(getBillingRemainingTone(-1), "danger")
  assert.equal(getBillingRemainingTone(0, true), "healthy")
})
