import assert from "node:assert/strict"
import test from "node:test"

import { summarizeHomeLatencySamples } from "../src/lib/home-latency.ts"

test("combines multiple ping tasks into one weighted server summary", () => {
  const minute = 60_000
  const result = summarizeHomeLatencySamples([
    { entityId: "node-a", timestamp: minute, latency: 20, lossRatio: 0, count: 10 },
    { entityId: "node-a", timestamp: minute, latency: 40, lossRatio: 0.1, count: 10 },
    { entityId: "node-a", timestamp: minute * 2, latency: 35, lossRatio: 0, count: 20 },
  ])

  assert.equal(result["node-a"].latencyHistory.length, 2)
  assert.ok(Math.abs((result["node-a"].latencyHistory[0] || 0) - 560 / 19) < 0.0001)
  assert.equal(result["node-a"].packetLossHistory[0], 5)
  assert.equal(result["node-a"].latency, 35)
  assert.equal(result["node-a"].packetLoss, 0)
  assert.equal(result["node-a"].updatedAt, minute * 2)
})

test("keeps total packet loss visible without inventing latency", () => {
  const result = summarizeHomeLatencySamples([
    { entityId: "node-a", timestamp: 60_000, latency: null, lossRatio: 1, count: 12 },
  ])

  assert.equal(result["node-a"].latency, null)
  assert.equal(result["node-a"].packetLoss, 100)
})
