import assert from "node:assert/strict"
import test from "node:test"

import { shouldFallbackToLegacyPingApi } from "../src/lib/ping-api-compat.ts"

test("falls back when the metric RPC method does not exist", () => {
  assert.equal(shouldFallbackToLegacyPingApi(new Error("RPC Error -32601: Method not found")), true)
  assert.equal(shouldFallbackToLegacyPingApi(new Error("method not found")), true)
})

test("falls back for Komari 1.1.8 public namespace rejection", () => {
  assert.equal(shouldFallbackToLegacyPingApi(new Error("RPC Error 401: Unauthorized")), true)
})

test("does not treat an HTTP authorization failure as legacy compatibility", () => {
  assert.equal(shouldFallbackToLegacyPingApi(new Error("HTTP 401: Unauthorized")), false)
})

test("does not hide current metric storage errors", () => {
  assert.equal(shouldFallbackToLegacyPingApi(new Error("RPC Error -32603: metric store not initialized")), false)
  assert.equal(shouldFallbackToLegacyPingApi(new Error("RPC Error -32602: unknown metric key")), false)
})
