import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const serverPage = readFileSync(new URL("../src/pages/Server.tsx", import.meta.url), "utf8")
const serverOverview = readFileSync(new URL("../src/components/ServerOverview.tsx", import.meta.url), "utf8")
const defaultCard = readFileSync(new URL("../src/components/ServerCard.tsx", import.meta.url), "utf8")
const verticalCard = readFileSync(new URL("../src/components/ServerCardVertical.tsx", import.meta.url), "utf8")
const header = readFileSync(new URL("../src/components/Header.tsx", import.meta.url), "utf8")
const footer = readFileSync(new URL("../src/components/Footer.tsx", import.meta.url), "utf8")
const styles = readFileSync(new URL("../src/index.css", import.meta.url), "utf8")

test("uses one to four columns from mobile through wide desktop", () => {
  assert.match(serverPage, /mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4/)
  assert.match(serverPage, /max-w-7xl 2xl:max-w-\[90rem\]/)
})

test("aligns the overview grid with vertical card columns and spacing", () => {
  assert.match(serverPage, /vertical=\{cardLayout === "vertical"\}/)
  assert.match(
    serverOverview,
    /vertical \? "auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4" : "grid-cols-2 gap-4 lg:grid-cols-4"/,
  )
  assert.match(serverOverview, /vertical && "lg:hidden 2xl:block"/)
  assert.match(serverOverview, /hidden ring-1 ring-transparent transition-all lg:block 2xl:hidden/)
  assert.match(serverOverview, /ring-2 ring-green-500": status === "online"/)
  assert.match(serverOverview, /ring-2 ring-red-500": status === "offline"/)
  assert.match(serverOverview, /grid w-full grid-cols-2 divide-x divide-border/)
  assert.match(serverOverview, /vertical \? "flex h-full items-start px-4 py-3 sm:px-6" : "flex h-full items-center px-6 py-3"/)
  assert.match(serverOverview, /vertical && "h-9"/)
  assert.match(serverOverview, /flex items-start flex-row z-10 pr-0 gap-1/)
  assert.match(serverOverview, /flex flex-col sm:flex-row -mr-1 sm:items-center items-start gap-1/)
  assert.match(serverOverview, /<ArrowUpCircleIcon className="size-3 mr-0\.5 sm:mb-\[1px\]" \/>/)
  assert.match(serverOverview, /<ArrowDownCircleIcon className="size-3 mr-0\.5" \/>/)
  assert.doesNotMatch(serverOverview, /grid h-9 w-full grid-cols-2 items-center gap-x-2/)
})

test("keeps the original card default behind an independent vertical-card switch", () => {
  assert.match(serverPage, /win\.EnableVerticalCard === true \? "vertical" : "standard"/)
  assert.match(serverPage, /forceInline \|\| legacyInline \? "inline" : baseLayout/)
  assert.doesNotMatch(serverPage, /localStorage\.getItem\("cardLayout"\)/)
})

test("keeps the vertical card shadow-free and hides the normal-status capsule", () => {
  assert.match(verticalCard, /shadow-none/)
  assert.doesNotMatch(verticalCard, /运行正常/)
  assert.match(verticalCard, /!online &&/)
})

test("uses the existing latency, traffic, transfer, and tag switches", () => {
  assert.match(serverPage, /showHomeLatency \? /)
  assert.match(verticalCard, /showNetTransfer = win\.ShowNetTransfer !== false/)
  assert.match(verticalCard, /win\.ShowTrafficBar !== false/)
  assert.match(verticalCard, /<PlanInfo parsedData=\{parsedData\}/)
})

test("places each cumulative transfer beside its upload or download label", () => {
  assert.doesNotMatch(verticalCard, /serverCard\.cumulativeTraffic/)
  assert.match(verticalCard, /items-end justify-between gap-2/)
  assert.match(verticalCard, /direction === "up" \? "pr-3" : "pl-3"/)
  assert.match(verticalCard, /showTotal && <span className="server-transfer-total truncate text-\[10px\] tabular-nums text-muted-foreground">累计 \{formatBytes\(total\)\}/)
  assert.match(verticalCard, /server-transfer-rate mt-1 truncate pl-1 text-sm font-semibold tabular-nums/)
  assert.doesNotMatch(verticalCard, /server-transfer-rate[^\n]*(?:pl-[2-9]|text-center)/)
  assert.doesNotMatch(verticalCard, /mt-0\.5 truncate text-\[10px\]/)
})

test("optically centers the default transfer labels with their arrow icons", () => {
  const defaultBranch = defaultCard.slice(0, defaultCard.indexOf("  return online ? ("))

  assert.match(defaultBranch, /flex shrink-0 items-center gap-1 text-xs/)
  assert.match(defaultBranch, /<span className="leading-none">\{label\}<\/span>/)
  assert.doesNotMatch(defaultBranch, /items-end gap-1\.5 text-xs/)
})

test("keeps price and remaining days on one line in the bottom-right capsule", () => {
  const billingInfo = readFileSync(new URL("../src/components/billingInfo.tsx", import.meta.url), "utf8")
  assert.match(billingInfo, /stacked = false/)
  assert.match(billingInfo, /shrink-0 rounded-full border border-border\/70 bg-muted\/45/)
  assert.match(billingInfo, /whitespace-nowrap/)
  assert.match(billingInfo, /const capsuleTextClass = "text-\[10px\]"/)
  assert.match(billingInfo, /capsuleDensity === "dense" \? "gap-0\.5" : "gap-1"/)
  assert.match(billingInfo, /capsuleDensity === "dense" \? "px-2\.5 py-0\.5" : "px-3 py-1\.5"/)
  assert.match(billingInfo, /capsuleDensity === "dense" \? "h-4 items-center" : "min-h-4 items-baseline"/)
  assert.match(verticalCard, /items-center justify-between/)
  assert.match(verticalCard, /stacked/)
  assert.doesNotMatch(verticalCard, /capsuleDensity="dense"/)
  assert.doesNotMatch(verticalCard, /centeredColumns/)
})

test("uses one desktop width baseline for the header, vertical-card content, and footer", () => {
  assert.match(serverPage, /document\.documentElement\.dataset\.serverCardLayout = cardLayout/)
  assert.match(header, /nezha-page-header/)
  assert.match(footer, /max-w-5xl[^\n]*nezha-page-footer/)
  assert.match(styles, /html\[data-server-card-layout="vertical"\] \.nezha-page-header/)
  assert.match(styles, /html\[data-server-card-layout="vertical"\] \.nezha-page-footer/)
  assert.match(styles, /max-width: 80rem/)
  assert.match(styles, /@media \(min-width: 1536px\)/)
  assert.match(styles, /max-width: 90rem/)
})

test("keeps the vertical card on a compact spacing rhythm", () => {
  assert.match(verticalCard, /rounded-2xl p-3 shadow-none/)
  assert.match(verticalCard, /my-1\.5 border-t/)
  assert.match(verticalCard, /gap-y-2/)
  assert.match(verticalCard, /server-transfer-rate mt-1 truncate/)
  assert.match(verticalCard, /server-network-quality mt-1\.5 border-t border-border\/70 pt-2/)
  assert.match(verticalCard, /latencySummary \? "mt-2\.5" : "mt-1\.5"/)
  assert.match(verticalCard, /mt-2\.5 border-t border-border\/70 pt-2/)
  assert.match(verticalCard, /mb-1\.5 text-xs font-semibold/)
  assert.match(verticalCard, /justify-between gap-3 pt-2/)
  assert.doesNotMatch(verticalCard, /rounded-2xl p-4 shadow-none/)
  assert.doesNotMatch(verticalCard, /sm:p-5/)
})

test("centers the header icons with the two-line identity block", () => {
  assert.match(verticalCard, /flex min-w-0 items-center gap-2\.5/)
  assert.doesNotMatch(verticalCard, /mt-1\.5 h-2\.5/)
  assert.doesNotMatch(verticalCard, /ServerFlag className="mt-/)
})

test("uses the whole card as the detail affordance without redundant copy", () => {
  assert.match(verticalCard, /onClick=\{cardClick\}/)
  assert.doesNotMatch(verticalCard, /viewDetails|查看详情/)
})

test("matches the default card billing and transfer details to the vertical card", () => {
  const defaultBranch = defaultCard.slice(0, defaultCard.indexOf("  return online ? ("))

  assert.doesNotMatch(defaultBranch, /运行正常/)
  assert.match(defaultBranch, /!online &&/)
  assert.match(defaultBranch, /<DefaultTransferMetric[\s\S]*direction="up"[\s\S]*total=\{net_out_transfer\}/)
  assert.match(defaultBranch, /<DefaultTransferMetric[\s\S]*direction="down"[\s\S]*total=\{net_in_transfer\}/)
  assert.match(defaultBranch, /showTotal=\{showNetTransfer\}/)
  assert.match(defaultBranch, /grid w-full grid-cols-4 items-center gap-2 sm:gap-4/)
  assert.match(defaultBranch, /serverCard\.load/)
  assert.match(defaultBranch, /percent=\{Math\.min\(100, Number\(load_1\) \* 100\)\}/)
  assert.match(defaultBranch, /mt-1\.5 grid w-full grid-cols-2/)
  assert.match(defaultBranch, /min-w-0 first:border-r first:border-border\/70/)
  assert.doesNotMatch(defaultBranch, /min-w-0 px-1 first:border-r|md:px-5/)
  assert.match(defaultBranch, /whitespace-nowrap text-\[11px\] tabular-nums text-muted-foreground/)
  assert.match(defaultBranch, /flex cursor-pointer flex-col px-3\.5 py-3/)
  assert.match(defaultBranch, /border-b border-border\/70 pb-1\.5/)
  assert.match(defaultBranch, /flex w-full min-w-0 flex-col pt-1\.5/)
  assert.match(defaultBranch, /mt-1\.5[\s\S]*<ServerLatencySummary/)
  assert.match(defaultBranch, /mt-1\.5[\s\S]*<TrafficBar/)
  assert.match(defaultBranch, /mt-1\.5 flex w-full min-w-0 flex-wrap items-center/)
  assert.doesNotMatch(defaultBranch, /gap-2 p-3|border-border\/70 pb-2|gap-y-2 pt-0\.5/)
  assert.doesNotMatch(defaultBranch, /sm:!grid-cols|col-span-3/)
  assert.match(defaultBranch, /<BillingInfo[\s\S]*compact[\s\S]*stacked/)
  assert.match(defaultBranch, /capsuleDensity="dense"/)
  assert.doesNotMatch(defaultBranch, /compactTextSize/)
  assert.doesNotMatch(defaultBranch, /\[&_\.font-semibold\]|\[&_span\]/)
  assert.match(defaultBranch, /ml-auto shrink-0[\s\S]*<PlanInfo/)
  assert.doesNotMatch(defaultBranch, /serverCard\.upload"\)}:\{formatBytes\(net_out_transfer\)\}/)
  assert.doesNotMatch(defaultBranch, /serverCard\.download"\)}:\{formatBytes\(net_in_transfer\)\}/)
})
