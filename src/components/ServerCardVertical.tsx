import PlanInfo from "@/components/PlanInfo"
import ServerFlag from "@/components/ServerFlag"
import ServerLatencySummary from "@/components/ServerLatencySummary"
import ServerUsageBar from "@/components/ServerUsageBar"
import TrafficBar from "@/components/TrafficBar"
import BillingInfo from "@/components/billingInfo"
import { Card } from "@/components/ui/card"
import { formatBytes } from "@/lib/format"
import type { HomeLatencySummary } from "@/lib/home-latency"
import { GetOsName } from "@/lib/logo-class"
import { calcTrafficUsed, cn, formatNezhaInfo, parsePublicNote } from "@/lib/utils"
import type { NezhaServer } from "@/types/nezha-api"
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/20/solid"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

function formatRate(megabytesPerSecond: number): string {
  if (megabytesPerSecond >= 1024) return `${(megabytesPerSecond / 1024).toFixed(2)} G/s`
  if (megabytesPerSecond >= 1) return `${megabytesPerSecond.toFixed(2)} M/s`
  return `${(megabytesPerSecond * 1024).toFixed(2)} K/s`
}

function ResourceMetric({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <ServerUsageBar value={percent} />
    </div>
  )
}

function TransferMetric({
  direction,
  label,
  rate,
  total,
  showTotal,
}: {
  direction: "up" | "down"
  label: string
  rate: number
  total: number
  showTotal: boolean
}) {
  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon

  return (
    <div className="min-w-0 px-1 first:border-r first:border-border/70">
      <div className={cn("min-w-0", direction === "up" ? "pr-3" : "pl-3")}>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </div>
          {showTotal && <span className="server-transfer-total truncate text-[10px] tabular-nums text-muted-foreground">累计 {formatBytes(total)}</span>}
        </div>
        <div className="server-transfer-rate mt-1 truncate pl-1 text-sm font-semibold tabular-nums">{formatRate(rate)}</div>
      </div>
    </div>
  )
}

export default function ServerCardVertical({
  now,
  serverInfo,
  latencySummary,
}: {
  now: number
  serverInfo: NezhaServer
  latencySummary?: HomeLatencySummary
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    name,
    country_code,
    online,
    cpu,
    up,
    down,
    mem,
    stg,
    uptime,
    load_1,
    net_in_transfer,
    net_out_transfer,
    public_note,
    platform,
    arch,
    traffic_limit,
    traffic_limit_type,
    traffic_reset_day,
  } = formatNezhaInfo(now, serverInfo)

  const win = window as unknown as Record<string, unknown>
  const customBackgroundImage = typeof win.CustomBackgroundImage === "string" && win.CustomBackgroundImage !== ""
  const showNetTransfer = win.ShowNetTransfer !== false
  const disableRemainingDaysBar = win.DisableRemainingDaysBar !== false
  const parsedData = parsePublicNote(public_note)
  const systemName = platform.includes("Windows") ? "Windows" : GetOsName(platform)
  const uptimeValue = uptime / 86400 >= 1 ? `${Math.floor(uptime / 86400)} ${t("serverCard.days")}` : `${Math.floor(uptime / 3600)} ${t("serverCard.hours")}`

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverInfo.id}`)
  }

  return (
    <Card
      className={cn(
        "flex h-full min-w-0 cursor-pointer flex-col rounded-2xl p-3 shadow-none transition-colors hover:bg-accent/50",
        customBackgroundImage && "bg-card/70",
      )}
      data-card-layout="vertical"
      onClick={cardClick}
    >
      <section className="flex min-w-0 items-center gap-2.5">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", online ? "bg-emerald-500" : "bg-red-500")} />
        <ServerFlag className="shrink-0 text-[15px] leading-none" country_code={country_code} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-tight">{name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {systemName} · {arch || "--"} · {online ? `${t("serverCard.uptime")} ${uptimeValue}` : t("offline")}
          </p>
        </div>
        {!online && (
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {t("offline")}
          </span>
        )}
      </section>

      <div className="my-1.5 border-t border-border/70" />

      {online ? (
        <>
          <section className="grid grid-cols-2 gap-x-5 gap-y-2">
            <ResourceMetric label="CPU" value={`${cpu.toFixed(2)}%`} percent={cpu} />
            <ResourceMetric label={t("serverCard.mem")} value={`${mem.toFixed(2)}%`} percent={mem} />
            <ResourceMetric label={t("serverCard.stg")} value={`${stg.toFixed(2)}%`} percent={stg} />
            <ResourceMetric label={t("serverCard.load", { defaultValue: "负载" })} value={String(load_1)} percent={Math.min(100, Number(load_1) * 100)} />
          </section>

          <section className="mt-2.5 border-t border-border/70 pt-2">
            <h3 className="mb-1.5 text-xs font-semibold">{t("serverCard.realtimeTransfer", { defaultValue: "实时传输" })}</h3>
            <div className="grid grid-cols-2">
              <TransferMetric direction="up" label={t("serverCard.upload")} rate={up} total={net_out_transfer} showTotal={showNetTransfer} />
              <TransferMetric direction="down" label={t("serverCard.download")} rate={down} total={net_in_transfer} showTotal={showNetTransfer} />
            </div>
          </section>

          {latencySummary && (
            <section className="server-network-quality mt-1.5 border-t border-border/70 pt-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold">{t("serverCard.networkQuality", { defaultValue: "网络质量" })}</h3>
                <span className="text-[10px] text-muted-foreground">{t("serverCard.recentHour", { defaultValue: "最近 1 小时" })}</span>
              </div>
              <ServerLatencySummary summary={latencySummary} />
            </section>
          )}

          {traffic_limit > 0 && win.ShowTrafficBar !== false && (
            <section className={cn("border-t border-border/70 pt-2", latencySummary ? "mt-2.5" : "mt-1.5")}>
              <h3 className="mb-1.5 text-xs font-semibold">{t("serverCard.monthlyTraffic", { defaultValue: "本月流量" })}</h3>
              <TrafficBar
                used={calcTrafficUsed(net_out_transfer, net_in_transfer, traffic_limit_type)}
                limit={traffic_limit}
                resetDay={traffic_reset_day}
                limitType={traffic_limit_type}
              />
            </section>
          )}
        </>
      ) : (
        latencySummary && <ServerLatencySummary summary={latencySummary} />
      )}

      {(parsedData?.planDataMod || parsedData?.billingDataMod || online) && (
        <section className="mt-auto flex min-w-0 items-center justify-between gap-3 pt-2">
          <div className="min-w-0">{parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}</div>
          {parsedData?.billingDataMod && (
            <BillingInfo
              parsedData={parsedData}
              showProgress={!disableRemainingDaysBar}
              compact
              stacked
            />
          )}
        </section>
      )}
    </Card>
  )
}
