import assert from "node:assert/strict"
import test from "node:test"

import { fetchLegacyPingData, normalizeLegacyPingResponse } from "../src/lib/legacy-ping-api.ts"

const payload = {
  records: [{ task_id: 7, time: "2026-07-27T10:00:00Z", value: 42, client: "node-a" }],
  tasks: [{ id: 7, name: "Guangdong Telecom", clients: ["node-a"] }],
}

test("normalizes the wrapped REST response used by Komari 1.1.8 and 1.2.5-fix2", () => {
  assert.deepEqual(normalizeLegacyPingResponse({ status: "success", message: "", data: payload }), payload)
})

test("also accepts an unwrapped ping payload", () => {
  assert.deepEqual(normalizeLegacyPingResponse(payload), payload)
})

test("returns stable empty arrays when a legacy response omits data", () => {
  assert.deepEqual(normalizeLegacyPingResponse({ status: "success" }), { records: [], tasks: [] })
})

test("surfaces an explicit legacy API error", () => {
  assert.throws(() => normalizeLegacyPingResponse({ status: "error", message: "Private site enabled" }), /Private site enabled/)
})

test("requests the guest-safe legacy ping endpoint", async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ""
  let requestInit: RequestInit | undefined
  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input)
    requestInit = init
    return new Response(JSON.stringify({ status: "success", data: payload }), { status: 200 })
  }) as typeof fetch

  try {
    const data = await fetchLegacyPingData("node-a", 1)
    assert.deepEqual(data, payload)
    assert.equal(requestedUrl, "/api/records/ping?uuid=node-a&hours=1")
    assert.equal(requestInit?.credentials, "include")
  } finally {
    globalThis.fetch = originalFetch
  }
})
