import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("supports both Komari server detail route conventions", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  const manifest = JSON.parse(readFileSync(new URL("../komari-theme.json", import.meta.url), "utf8")) as {
    navigation?: { server_detail?: string; ping_task_parameter?: string }
  }

  assert.match(app, /<Route path="\/server\/:id" element={<ServerDetail \/>} \/>/)
  assert.match(app, /<Route path="\/instance\/:id" element={<ServerDetail \/>} \/>/)
  assert.equal(manifest.navigation?.server_detail, "/server/{uuid}")
  assert.equal(manifest.navigation?.ping_task_parameter, "ping_task")
})
