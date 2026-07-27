import assert from "node:assert/strict"
import test from "node:test"

import { readPingApiMode, shouldFallbackToLegacyPingApi, writePingApiMode } from "../src/lib/ping-api-compat.ts"

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

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

test("remembers the legacy ping API across page refreshes", () => {
  const storage = memoryStorage()
  writePingApiMode(storage, "legacy", 100_000)

  assert.equal(readPingApiMode(storage, 110_000), "legacy")
})

test("rechecks ping API support after the capability cache expires", () => {
  const storage = memoryStorage()
  writePingApiMode(storage, "legacy", 100_000)

  assert.equal(readPingApiMode(storage, 100_000 + 10 * 60_000 + 1), null)
})
