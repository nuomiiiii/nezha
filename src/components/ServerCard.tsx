import ServerFlag from "@/components/ServerFlag"
import ServerLatencySummary from "@/components/ServerLatencySummary"
import ServerUsageBar from "@/components/ServerUsageBar"
import TrafficBar from "@/components/TrafficBar"
import { formatBytes } from "@/lib/format"
import type { HomeLatencySummary } from "@/lib/home-latency"
import { GetFontLogoClass, GetOsName, MageMicrosoftWindows } from "@/lib/logo-class"
import { cn, calcTrafficUsed, formatNezhaInfo, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/20/solid"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import PlanInfo from "./PlanInfo"
import BillingInfo from "./billingInfo"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

function formatRate(megabytesPerSecond: number): string {
  if (megabytesPerSecond >= 1024) return `${(megabytesPerSecond / 1024).toFixed(2)} G/s`
  if (megabytesPerSecond >= 1) return `${megabytesPerSecond.toFixed(2)} M/s`
  return `${(megabytesPerSecond * 1024).toFixed(2)} K/s`
}

function DefaultResourceMetric({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <div className="truncate text-xs font-semibold tabular-nums">{value}</div>
      <ServerUsageBar value={percent} />
    </div>
  )
}

function DefaultTransferMetric({
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
    <div className="min-w-0 first:border-r first:border-border/70">
      <div className={cn("min-w-0", direction === "up" ? "pr-3" : "pl-3")}>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Icon className="size-3.5 shrink-0" />
            <span className="leading-none">{label}</span>
          </div>
          {showTotal && <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">累计 {formatBytes(total)}</span>}
        </div>
        <div className="mt-1 truncate pl-1 text-sm font-semibold tabular-nums">{formatRate(rate)}</div>
      </div>
    </div>
  )
}

export default function ServerCard({ now, serverInfo, latencySummary }: { now: number; serverInfo: NezhaServer; latencySummary?: HomeLatencySummary }) {
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
    traffic_limit,
    traffic_limit_type,
    traffic_reset_day,
  } = formatNezhaInfo(now, serverInfo)

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverInfo.id}`)
  }

  const showFlag = true

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  // @ts-expect-error ShowNetTransfer is a global variable
  const showNetTransfer = window.ShowNetTransfer as boolean

  const win = window as unknown as Record<string, unknown>
  const fixedLeftServerName = win.FixedLeftServerName === true
  const fixedTopServerName = !fixedLeftServerName && win.FixedTopServerName === true
  const disableRemainingDaysBar = win.DisableRemainingDaysBar !== false

  const parsedData = parsePublicNote(public_note)

  if (!fixedLeftServerName && !fixedTopServerName) {
    const systemName = platform.includes("Windows") ? "Windows" : GetOsName(platform)
    const uptimeValue = uptime / 86400 >= 1 ? `${Math.floor(uptime / 86400)} ${t("serverCard.days")}` : `${Math.floor(uptime / 3600)} ${t("serverCard.hours")}`

    return (
      <Card
        className={cn("flex cursor-pointer flex-col px-3.5 py-3 transition-colors hover:bg-accent/50", {
          "bg-card/70": customBackgroundImage,
        })}
        onClick={cardClick}
      >
        <section className="flex w-full items-start justify-between gap-3 border-b border-border/70 pb-1.5">
          <div className="grid min-w-0 items-center gap-x-3 [grid-template-columns:auto_minmax(0,1fr)]">
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  online ? "bg-green-500" : "bg-red-500",
                )}
              />
              {showFlag ? <ServerFlag className="text-[14px] leading-none" country_code={country_code} /> : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-tight">{name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {systemName} · {online ? `${t("serverCard.uptime")} ${uptimeValue}` : "已离线"}
              </p>
            </div>
          </div>
          {!online && (
            <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              已离线
            </span>
          )}
        </section>

        {online && (
          <div className="flex w-full min-w-0 flex-col pt-1.5">
            <section className="grid w-full grid-cols-4 items-center gap-2 sm:gap-4">
              <DefaultResourceMetric label="CPU" value={`${cpu.toFixed(2)}%`} percent={cpu} />
              <DefaultResourceMetric label={t("serverCard.mem")} value={`${mem.toFixed(2)}%`} percent={mem} />
              <DefaultResourceMetric label={t("serverCard.stg")} value={`${stg.toFixed(2)}%`} percent={stg} />
              <DefaultResourceMetric
                label={t("serverCard.load", { defaultValue: "负载" })}
                value={String(load_1)}
                percent={Math.min(100, Number(load_1) * 100)}
              />
            </section>
            <section className="mt-1.5 grid w-full grid-cols-2">
              <DefaultTransferMetric
                direction="up"
                label={t("serverCard.upload")}
                rate={up}
                total={net_out_transfer}
                showTotal={showNetTransfer}
              />
              <DefaultTransferMetric
                direction="down"
                label={t("serverCard.download")}
                rate={down}
                total={net_in_transfer}
                showTotal={showNetTransfer}
              />
            </section>
            {latencySummary && (
              <div className="mt-1.5">
                <ServerLatencySummary summary={latencySummary} />
              </div>
            )}
            {traffic_limit > 0 && (window as unknown as Record<string, unknown>).ShowTrafficBar !== false && (
              <div className="mt-1.5">
                <TrafficBar
                  used={calcTrafficUsed(net_out_transfer, net_in_transfer, traffic_limit_type)}
                  limit={traffic_limit}
                  resetDay={traffic_reset_day}
                  limitType={traffic_limit_type}
                />
              </div>
            )}
            {(parsedData?.billingDataMod || parsedData?.planDataMod) && (
              <section className="mt-1.5 flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  {parsedData?.billingDataMod && (
                    <BillingInfo
                      parsedData={parsedData}
                      showProgress={!disableRemainingDaysBar}
                      compact
                      stacked
                      capsuleDensity="dense"
                    />
                  )}
                </div>
                <div className="ml-auto shrink-0">{parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}</div>
              </section>
            )}
          </div>
        )}

        {!online && latencySummary && (
          <div className="mt-1.5">
            <ServerLatencySummary summary={latencySummary} />
          </div>
        )}
        {!online && (parsedData?.billingDataMod || parsedData?.planDataMod) && (
          <section className="mt-1.5 flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              {parsedData?.billingDataMod && (
                <BillingInfo
                  parsedData={parsedData}
                  showProgress={!disableRemainingDaysBar}
                  compact
                  stacked
                  capsuleDensity="dense"
                />
              )}
            </div>
            <div className="ml-auto shrink-0">{parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}</div>
          </section>
        )}
      </Card>
    )
  }

  return online ? (
    <Card
      className={cn(
        "flex flex-col items-center justify-start gap-3 p-3 md:px-5 cursor-pointer hover:bg-accent/50 transition-colors",
        {
          "flex-col": fixedTopServerName,
          "lg:flex-row": !fixedTopServerName,
        },
        {
          "bg-card/70": customBackgroundImage,
        },
      )}
      onClick={cardClick}
    >
      <section
        className={cn("grid items-center gap-2", {
          "lg:w-40": !fixedTopServerName,
        })}
        style={{ gridTemplateColumns: "auto auto 1fr" }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 self-center"></span>
        <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
          {showFlag ? <ServerFlag country_code={country_code} /> : null}
        </div>
        <div className="relative flex flex-col">
          <p className={cn("break-normal font-bold tracking-tight", showFlag ? "text-xs " : "text-sm")}>{name}</p>
          <div
            className={cn("hidden lg:block", {
              "lg:hidden": fixedTopServerName,
            })}
          >
            {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} showProgress={!disableRemainingDaysBar} />}
          </div>
        </div>
      </section>
      <div
        className={cn("flex items-center gap-2 -mt-2 lg:hidden", {
          "lg:flex": fixedTopServerName,
        })}
      >
        {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} showProgress={!disableRemainingDaysBar} />}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-2 lg:items-start">
        <section
          className={cn("grid grid-cols-5 items-center gap-3", {
            "lg:grid-cols-6 lg:gap-4": fixedTopServerName,
          })}
        >
          {fixedTopServerName && (
            <div className={"hidden col-span-1 items-center lg:flex lg:flex-row gap-2"}>
              <div className="text-xs font-semibold">
                {platform.includes("Windows") ? (
                  <MageMicrosoftWindows className="size-[10px]" />
                ) : (
                  <p className={`fl-${GetFontLogoClass(platform)}`} />
                )}
              </div>
              <div className={"flex w-14 flex-col"}>
                <p className="text-xs text-muted-foreground">{t("serverCard.system")}</p>
                <div className="flex items-center text-[10.5px] font-semibold">{platform.includes("Windows") ? "Windows" : GetOsName(platform)}</div>
              </div>
            </div>
          )}
          <div className={"flex w-14 flex-col"}>
            <p className="text-xs text-muted-foreground">{"CPU"}</p>
            <div className="flex items-center text-xs font-semibold">{cpu.toFixed(2)}%</div>
            <ServerUsageBar value={cpu} />
          </div>
          <div className={"flex w-14 flex-col"}>
            <p className="text-xs text-muted-foreground">{t("serverCard.mem")}</p>
            <div className="flex items-center text-xs font-semibold">{mem.toFixed(2)}%</div>
            <ServerUsageBar value={mem} />
          </div>
          <div className={"flex w-14 flex-col"}>
            <p className="text-xs text-muted-foreground">{t("serverCard.stg")}</p>
            <div className="flex items-center text-xs font-semibold">{stg.toFixed(2)}%</div>
            <ServerUsageBar value={stg} />
          </div>
          <div className={"flex w-14 flex-col"}>
            <p className="text-xs text-muted-foreground">{t("serverCard.upload")}</p>
            <div className="flex items-center text-xs font-semibold">
              {up >= 1024 ? `${(up / 1024).toFixed(2)}G/s` : up >= 1 ? `${up.toFixed(2)}M/s` : `${(up * 1024).toFixed(2)}K/s`}
            </div>
          </div>
          <div className={"flex w-14 flex-col"}>
            <p className="text-xs text-muted-foreground">{t("serverCard.download")}</p>
            <div className="flex items-center text-xs font-semibold">
              {down >= 1024 ? `${(down / 1024).toFixed(2)}G/s` : down >= 1 ? `${down.toFixed(2)}M/s` : `${(down * 1024).toFixed(2)}K/s`}
            </div>
          </div>
        </section>
        <ServerLatencySummary summary={latencySummary} />
        {traffic_limit > 0 && (window as unknown as Record<string, unknown>).ShowTrafficBar !== false && (
          <TrafficBar
            used={calcTrafficUsed(net_out_transfer, net_in_transfer, traffic_limit_type)}
            limit={traffic_limit}
            resetDay={traffic_reset_day}
            limitType={traffic_limit_type}
          />
        )}
        {showNetTransfer && (
          <section className={"flex items-center w-full justify-between gap-1"}>
            <Badge
              variant="secondary"
              className="items-center flex-1 justify-center rounded-[8px] text-nowrap text-[11px] border-muted-50 shadow-md shadow-neutral-200/30 dark:shadow-none"
            >
              {t("serverCard.upload")}:{formatBytes(net_out_transfer)}
            </Badge>
            <Badge
              variant="outline"
              className="items-center flex-1 justify-center rounded-[8px] text-nowrap text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none"
            >
              {t("serverCard.download")}:{formatBytes(net_in_transfer)}
            </Badge>
          </section>
        )}
        {parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
      </div>
    </Card>
  ) : (
    <Card
      className={cn(
        "flex flex-col items-center justify-start gap-3 sm:gap-0 p-3 md:px-5 cursor-pointer hover:bg-accent/50 transition-colors",
        showNetTransfer ? "lg:min-h-[91px] min-h-[123px]" : "lg:min-h-[61px] min-h-[93px]",
        {
          "flex-col": fixedTopServerName,
          "lg:flex-row": !fixedTopServerName,
        },
        {
          "bg-card/70": customBackgroundImage,
        },
      )}
      onClick={cardClick}
    >
      <section
        className={cn("grid items-center gap-2", {
          "lg:w-40": !fixedTopServerName,
        })}
        style={{ gridTemplateColumns: "auto auto 1fr" }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 self-center"></span>
        <div className={cn("flex items-center justify-center", showFlag ? "min-w-[17px]" : "min-w-0")}>
          {showFlag ? <ServerFlag country_code={country_code} /> : null}
        </div>
        <div className="relative flex flex-col">
          <p className={cn("break-normal font-bold tracking-tight max-w-[108px]", showFlag ? "text-xs" : "text-sm")}>{name}</p>
          <div
            className={cn("hidden lg:block", {
              "lg:hidden": fixedTopServerName,
            })}
          >
            {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} showProgress={!disableRemainingDaysBar} />}
          </div>
        </div>
      </section>
      <div
        className={cn("flex items-center gap-2 lg:hidden", {
          "lg:flex": fixedTopServerName,
        })}
      >
        {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} showProgress={!disableRemainingDaysBar} />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <ServerLatencySummary summary={latencySummary} />
        {parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
      </div>
    </Card>
  )
}
