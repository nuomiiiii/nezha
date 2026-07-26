import ServerFlag from "@/components/ServerFlag"
import ServerLatencySummary from "@/components/ServerLatencySummary"
import ServerUsageBar from "@/components/ServerUsageBar"
import TrafficBar from "@/components/TrafficBar"
import { formatBytes } from "@/lib/format"
import type { HomeLatencySummary } from "@/lib/home-latency"
import { GetFontLogoClass, GetOsName, MageMicrosoftWindows } from "@/lib/logo-class"
import { cn, calcTrafficUsed, formatNezhaInfo, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import PlanInfo from "./PlanInfo"
import BillingInfo from "./billingInfo"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"

export default function ServerCard({ now, serverInfo, latencySummary }: { now: number; serverInfo: NezhaServer; latencySummary?: HomeLatencySummary }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { name, country_code, online, cpu, up, down, mem, stg, uptime, net_in_transfer, net_out_transfer, public_note, platform, traffic_limit, traffic_limit_type, traffic_reset_day } = formatNezhaInfo(
    now,
    serverInfo,
  )

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
        className={cn("flex cursor-pointer flex-col gap-3 p-3 transition-colors hover:bg-accent/50 md:px-5", {
          "bg-card/70": customBackgroundImage,
        })}
        onClick={cardClick}
      >
        <section className="flex w-full items-start justify-between gap-3 border-b border-border/70 pb-3">
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
              {parsedData?.billingDataMod && (
                <BillingInfo parsedData={parsedData} showProgress={!disableRemainingDaysBar} compact />
              )}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              online
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
            )}
          >
            {online ? "运行正常" : "已离线"}
          </span>
        </section>

        {online && (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <section className="grid w-full grid-cols-5 items-center gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">CPU</p>
                <div className="truncate text-xs font-semibold">{cpu.toFixed(2)}%</div>
                <ServerUsageBar value={cpu} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("serverCard.mem")}</p>
                <div className="truncate text-xs font-semibold">{mem.toFixed(2)}%</div>
                <ServerUsageBar value={mem} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("serverCard.stg")}</p>
                <div className="truncate text-xs font-semibold">{stg.toFixed(2)}%</div>
                <ServerUsageBar value={stg} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("serverCard.upload")}</p>
                <div className="truncate text-xs font-semibold">
                  {up >= 1024 ? `${(up / 1024).toFixed(2)}G/s` : up >= 1 ? `${up.toFixed(2)}M/s` : `${(up * 1024).toFixed(2)}K/s`}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("serverCard.download")}</p>
                <div className="truncate text-xs font-semibold">
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
            {(showNetTransfer || parsedData?.planDataMod) && (
              <section className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5">
                {showNetTransfer && (
                  <div
                    className={cn(
                      "grid min-w-[240px] grid-cols-2 items-center gap-1",
                      parsedData?.planDataMod ? "flex-1 basis-[42%] sm:max-w-[44%]" : "w-full",
                    )}
                  >
                    <Badge
                      variant="secondary"
                      className="min-w-0 w-full items-center justify-center text-nowrap rounded-[8px] border-muted-50 text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none"
                    >
                      {t("serverCard.upload")}:{formatBytes(net_out_transfer)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="min-w-0 w-full items-center justify-center text-nowrap rounded-[8px] text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none"
                    >
                      {t("serverCard.download")}:{formatBytes(net_in_transfer)}
                    </Badge>
                  </div>
                )}
                {parsedData?.planDataMod && (
                  <div className="ml-auto shrink-0">
                    <PlanInfo parsedData={parsedData} />
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {!online && <ServerLatencySummary summary={latencySummary} />}
        {!online && parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
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
