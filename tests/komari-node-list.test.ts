import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  isKomariServerOnline,
  leftoverStatusUuids,
  resolveKomariServerEntries,
} from "../src/lib/komari-node-list.ts"

const online = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const offlineReported = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const offlineMissing = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const deletedGhost = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

function node(uuid: string, name: string) {
  return { uuid, name, os: "linux", region: "CN" }
}

function status(uuid: string, isOnline: boolean) {
  return { client: uuid, online: isOnline, time: "2026-08-20T06:00:00Z", cpu: isOnline ? 12 : 0 }
}

test("keeps registered offline servers when live status omits them", () => {
  const nodes = {
    [online]: node(online, "online-1"),
    [offlineReported]: node(offlineReported, "offline-reported"),
    [offlineMissing]: node(offlineMissing, "offline-missing"),
  }
  const latest = {
    [online]: status(online, true),
    [offlineReported]: status(offlineReported, false),
  }

  const entries = resolveKomariServerEntries(nodes, latest)
  assert.deepEqual(
    entries.map((entry) => [entry.node.name, isKomariServerOnline(entry.status)]),
    [
      ["online-1", true],
      ["offline-reported", false],
      ["offline-missing", false],
    ],
  )
  assert.equal(entries.length, 3)
  assert.deepEqual(leftoverStatusUuids(entries.map((entry) => entry.uuid), latest), [])
})

test("does not drop the offline machine after a partial live status snapshot", () => {
  const nodes = {
    a: node(online, "n1"),
    b: node(offlineReported, "n2"),
    c: node(offlineMissing, "n3"),
    d: node("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "n4"),
    e: node("ffffffff-ffff-4fff-8fff-ffffffffffff", "n5"),
    f: node("11111111-1111-4111-8111-111111111111", "n6"),
  }
  const latest = {
    [online]: status(online, true),
    [offlineReported]: status(offlineReported, true),
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee": status("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", true),
    "ffffffff-ffff-4fff-8fff-ffffffffffff": status("ffffffff-ffff-4fff-8fff-ffffffffffff", true),
    "11111111-1111-4111-8111-111111111111": status("11111111-1111-4111-8111-111111111111", true),
  }

  const entries = resolveKomariServerEntries(nodes, latest)
  const onlineCount = entries.filter((entry) => isKomariServerOnline(entry.status)).length
  const offlineCount = entries.length - onlineCount

  assert.equal(entries.length, 6)
  assert.equal(onlineCount, 5)
  assert.equal(offlineCount, 1)
  assert.equal(entries.find((entry) => entry.uuid === offlineMissing)?.node.name, "n3")
})

test("does not render leftover live status as a ghost card after node deletion", () => {
  const nodes = {
    [online]: node(online, "still-registered"),
  }
  const latest = {
    [online]: status(online, true),
    [deletedGhost]: { ...status(deletedGhost, true), name: "deleted-agent" },
  }

  const entries = resolveKomariServerEntries(nodes, latest)
  assert.deepEqual(
    entries.map((entry) => entry.uuid),
    [online],
  )
  const leftover = leftoverStatusUuids(
    entries.map((entry) => entry.uuid),
    latest,
  )
  assert.deepEqual(leftover, [deletedGhost])
})

test("empty live status still lists every registered node as offline", () => {
  const nodes = {
    [online]: node(online, "a"),
    [offlineMissing]: node(offlineMissing, "b"),
  }

  const entries = resolveKomariServerEntries(nodes, {})
  assert.equal(entries.length, 2)
  assert.ok(entries.every((entry) => !isKomariServerOnline(entry.status)))
})

test("home poll refreshes the node list so deleted servers leave with getNodes", () => {
  const provider = readFileSync(new URL("../src/context/websocket-provider.tsx", import.meta.url), "utf8")
  const utils = readFileSync(new URL("../src/lib/utils.ts", import.meta.url), "utf8")

  assert.match(provider, /getKomariNodes\(true\)/)
  assert.doesNotMatch(utils, /statusMap\.has\(server\.uuid\)/)
  assert.doesNotMatch(utils, /km_servers_cache\.filter/)
  assert.match(utils, /resolveKomariServerEntries\(nodes, data\)/)
})
