import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const manifest = JSON.parse(readFileSync(new URL("../komari-theme.json", import.meta.url), "utf8"))
const settings = manifest.configuration.data as Array<Record<string, unknown>>

function setting(key: string): Record<string, unknown> | undefined {
  return settings.find((item) => item.key === key)
}

test("uses Nezha as the visible theme name without changing its internal id", () => {
  assert.equal(manifest.name, "Nezha")
  assert.equal(manifest.short, "nezha")
})

test("uses the overview card as the default layout", () => {
  assert.equal(setting("EnableVerticalCard")?.default, false)
  assert.equal(setting("EnableVerticalCard")?.type, "switch")
  assert.equal(setting("CardLayout"), undefined)
  assert.equal(setting("ForceCardInline")?.default, false)
  assert.equal(setting("FixedLeftServerName")?.default, false)
  assert.equal(setting("FixedTopServerName")?.default, false)
  assert.equal(setting("FixedTopLeftServerName"), undefined)
})

test("keeps decorative overview elements disabled by default", () => {
  assert.equal(setting("DisableAnimatedMan")?.default, true)
  assert.equal(setting("DisableOverviewWave")?.default, true)
  assert.equal(setting("ShowOverviewWave"), undefined)
})

test("uses the current traffic and flag presentation by default", () => {
  assert.equal(setting("ForceUseSvgFlag")?.default, true)
  assert.equal(setting("ShowTrafficBar")?.default, true)
  assert.equal(setting("ShowNetTransfer")?.default, true)
})

test("hides the remaining-days time bar by default", () => {
  assert.equal(setting("DisableRemainingDaysBar")?.default, true)
})

test("shows home latency by default", () => {
  assert.equal(setting("ShowHomeLatency")?.default, true)
})

test("keeps vertical cards compatible with existing visibility settings", () => {
  assert.equal(setting("ShowTrafficBar")?.default, true)
  assert.equal(setting("ShowNetTransfer")?.default, true)
  assert.equal(setting("HideIPv4IPv6Tag")?.default, false)
  assert.equal(setting("HideTrafficVolTag")?.default, false)
  assert.equal(setting("DisableRemainingDaysBar")?.default, true)
})
