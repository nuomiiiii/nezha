import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const detailSource = readFileSync(new URL("../src/pages/ServerDetail.tsx", import.meta.url), "utf8")
const chartSource = readFileSync(new URL("../src/components/NetworkChart.tsx", import.meta.url), "utf8")

test("keeps the inactive network panel measurable before its first display", () => {
  assert.doesNotMatch(detailSource, /display:\s*currentTab/)
  assert.match(detailSource, /data-testid="server-network-panel"/)
  assert.match(detailSource, /pointer-events-none invisible absolute inset-x-0 top-0/)
})

test("keeps the network chart canvas mounted during initial data loading", () => {
  assert.match(chartSource, /data-testid="network-chart-canvas"/)
  assert.match(chartSource, /data=\{hasChartData \? processedData : \[\]\}/)
  assert.match(chartSource, /!hasChartData &&/)
})
