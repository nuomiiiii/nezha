import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { isNetworkView, parsePingTaskId, resolveServerRouteId, uuidToNumber } from "../src/lib/server-route.ts"

test("supports both Komari server detail route conventions", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  const manifest = JSON.parse(readFileSync(new URL("../komari-theme.json", import.meta.url), "utf8")) as {
    navigation?: { server_detail?: string; server_network?: string; ping_task_parameter?: string }
  }

  assert.match(app, /<Route path="\/server\/:id" element={<ServerDetail \/>} \/>/)
  assert.match(app, /<Route path="\/instance\/:id" element={<ServerDetail \/>} \/>/)
  assert.equal(manifest.navigation?.server_detail, "/server/{uuid}")
  assert.equal(manifest.navigation?.server_network, "/server/{uuid}?view=network")
  assert.equal(manifest.navigation?.ping_task_parameter, "ping_task")
})

test("resolves UUID and legacy numeric server routes to the same internal ID contract", () => {
  const uuid = "00000000-0000-4000-8000-000000000014"

  assert.equal(resolveServerRouteId(uuid), uuidToNumber(uuid))
  assert.equal(resolveServerRouteId(uuid.toUpperCase()), uuidToNumber(uuid))
  assert.equal(resolveServerRouteId("14"), 14)
  assert.equal(resolveServerRouteId("server14"), null)
})

test("accepts only positive safe ping task IDs", () => {
  assert.equal(parsePingTaskId("1"), 1)
  assert.equal(parsePingTaskId("0"), undefined)
  assert.equal(parsePingTaskId("-1"), undefined)
  assert.equal(parsePingTaskId("task-1"), undefined)
  assert.equal(parsePingTaskId(null), undefined)
})

test("opens the network overview only for the explicit network view", () => {
  assert.equal(isNetworkView("network"), true)
  assert.equal(isNetworkView("detail"), false)
  assert.equal(isNetworkView("Network"), false)
  assert.equal(isNetworkView(""), false)
  assert.equal(isNetworkView(null), false)
})

test("uses one resolved server ID for overview, realtime charts and ping charts", () => {
  const page = readFileSync(new URL("../src/pages/ServerDetail.tsx", import.meta.url), "utf8")
  const overview = readFileSync(new URL("../src/components/ServerDetailOverview.tsx", import.meta.url), "utf8")
  const realtime = readFileSync(new URL("../src/components/ServerDetailChart.tsx", import.meta.url), "utf8")
  const network = readFileSync(new URL("../src/components/NetworkChart.tsx", import.meta.url), "utf8")

  assert.match(page, /resolveServerRouteId\(routeId\)/)
  assert.match(page, /isNetworkView\(searchParams\.get\("view"\)\) \|\| pingTaskId !== undefined/)
  assert.match(page, /setCurrentTab\(openNetworkView \? tabs\[1\] : tabs\[0\]\)/)
  assert.match(page, /<ServerDetailOverview server_id=\{serverId\}/)
  assert.match(page, /<ServerDetailChart server_id=\{serverId\}/)
  assert.match(page, /<NetworkChart server_id=\{serverId\}[^>]+initialMonitorId=\{pingTaskId\}/)
  assert.doesNotMatch(overview, /Number\(server_id\)/)
  assert.doesNotMatch(realtime, /Number\(server_id\)/)
  assert.match(network, /monitor\.monitor_id === initialMonitorId/)
})
