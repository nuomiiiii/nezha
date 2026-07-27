import assert from "node:assert/strict"
import test from "node:test"

import { summarizeHomeLatencySamples } from "../src/lib/home-latency.ts"
import { readHomeLatencyCache, writeHomeLatencyCache } from "../src/lib/home-latency.ts"

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

test("restores recent latency values during a page refresh", () => {
  const storage = memoryStorage()
  const summary = {
    latency: 32,
    packetLoss: 1.5,
    latencyHistory: [30, 32],
    packetLossHistory: [0, 3],
    updatedAt: 120_000,
  }

  writeHomeLatencyCache(storage, { "node-a": summary }, 200_000)

  assert.deepEqual(readHomeLatencyCache(storage, ["node-a"], 210_000), { "node-a": summary })
})

test("ignores stale or unrelated latency cache entries", () => {
  const storage = memoryStorage()
  const summary = {
    latency: 32,
    packetLoss: 0,
    latencyHistory: [32],
    packetLossHistory: [0],
    updatedAt: 120_000,
  }

  writeHomeLatencyCache(storage, { "node-a": summary }, 200_000)

  assert.equal(readHomeLatencyCache(storage, ["node-b"], 210_000), undefined)
  assert.equal(readHomeLatencyCache(storage, ["node-a"], 200_000 + 5 * 60_000 + 1), undefined)
})

test("combines multiple ping tasks into one weighted server summary", () => {
  const bucket = 5 * 60_000
  const result = summarizeHomeLatencySamples(
    [
      { entityId: "node-a", timestamp: bucket, latency: 20, lossRatio: 0, count: 10 },
      { entityId: "node-a", timestamp: bucket, latency: 40, lossRatio: 0.1, count: 10 },
      { entityId: "node-a", timestamp: bucket * 2, latency: 35, lossRatio: 0, count: 20 },
    ],
    2,
  )

  assert.equal(result["node-a"].latencyHistory.length, 2)
  assert.ok(Math.abs((result["node-a"].latencyHistory[0] || 0) - 560 / 19) < 0.0001)
  assert.equal(result["node-a"].packetLossHistory[0], 5)
  assert.equal(result["node-a"].latency, 35)
  assert.equal(result["node-a"].packetLoss, 2.5)
  assert.equal(result["node-a"].updatedAt, bucket * 2)
})

test("keeps the home timeline continuous when legacy records skip minutes", () => {
  const bucket = 5 * 60_000
  const result = summarizeHomeLatencySamples(
    [
      { entityId: "node-a", timestamp: bucket, latency: 20, lossRatio: 1, count: 1 },
      { entityId: "node-a", timestamp: bucket * 3, latency: 30, lossRatio: 0, count: 1 },
    ],
    3,
  )

  assert.deepEqual(result["node-a"].latencyHistory, [null, null, 30])
  assert.deepEqual(result["node-a"].packetLossHistory, [100, null, 0])
  assert.equal(result["node-a"].packetLoss, 50)
})

test("weights the displayed loss rate by probe count for aggregated metrics", () => {
  const bucket = 5 * 60_000
  const result = summarizeHomeLatencySamples(
    [
      { entityId: "node-a", timestamp: bucket, latency: null, lossRatio: 1, count: 2 },
      { entityId: "node-a", timestamp: bucket * 2, latency: 25, lossRatio: 0, count: 18 },
    ],
    2,
  )

  assert.equal(result["node-a"].packetLoss, 10)
  assert.deepEqual(result["node-a"].packetLossHistory, [100, 0])
})

test("keeps total packet loss visible without inventing latency", () => {
  const result = summarizeHomeLatencySamples([
    { entityId: "node-a", timestamp: 60_000, latency: null, lossRatio: 1, count: 12 },
  ])

  assert.equal(result["node-a"].latency, null)
  assert.equal(result["node-a"].packetLoss, 100)
})
