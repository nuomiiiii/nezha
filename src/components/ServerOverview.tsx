import { Card, CardContent } from "@/components/ui/card"
import { useStatus } from "@/hooks/use-status"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ArrowDownCircleIcon, ArrowUpCircleIcon } from "@heroicons/react/20/solid"
import { useTranslation } from "react-i18next"

type ServerOverviewProps = {
  online: number
  offline: number
  total: number
  up: number
  down: number
  upSpeed: number
  downSpeed: number
  vertical?: boolean
}

export default function ServerOverview({ online, offline, total, up, down, upSpeed, downSpeed, vertical = false }: ServerOverviewProps) {
  const { t } = useTranslation()
  const { status, setStatus } = useStatus()

  // @ts-expect-error DisableAnimatedMan is a global variable
  const disableAnimatedMan = window.DisableAnimatedMan !== false

  // @ts-expect-error CustomIllustration is a global variable
  const customIllustration = window.CustomIllustration || "/animated-man.webp"

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined
  const overviewContentClassName = vertical ? "flex h-full items-start px-4 py-3 sm:px-6" : "flex h-full items-center px-6 py-3"
  const overviewStackClassName = cn("flex flex-col gap-1", vertical && "w-full")
  const overviewValueClassName = cn("flex items-center gap-2", vertical && "h-9")

  return (
    <>
      <section
        className={cn(
          "grid server-overview",
          vertical ? "auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4" : "grid-cols-2 gap-4 lg:grid-cols-4",
        )}
      >
        <Card
          onClick={() => {
            setStatus("all")
          }}
          className={cn("hover:border-blue-500 cursor-pointer transition-all", {
            "bg-card/70": customBackgroundImage,
          })}
        >
          <CardContent className={overviewContentClassName}>
            <section className={overviewStackClassName}>
              <p className={cn("text-sm font-medium md:text-base", vertical && "truncate")}>{t("serverOverview.totalServers")}</p>
              <div className={overviewValueClassName}>
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                </span>
                <div className="text-lg font-semibold">{total}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        <Card
          onClick={() => {
            setStatus("online")
          }}
          className={cn(
            "cursor-pointer hover:ring-green-500 ring-1 ring-transparent transition-all",
            vertical && "lg:hidden 2xl:block",
            {
              "bg-card/70": customBackgroundImage,
            },
            {
              "ring-green-500 ring-2 border-transparent": status === "online",
            },
          )}
        >
          <CardContent className={overviewContentClassName}>
            <section className={overviewStackClassName}>
              <p className={cn("text-sm font-medium md:text-base", vertical && "truncate")}>{t("serverOverview.onlineServers")}</p>
              <div className={overviewValueClassName}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>

                <div className="text-lg font-semibold">{online}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        <Card
          onClick={() => {
            setStatus("offline")
          }}
          className={cn(
            "cursor-pointer hover:ring-red-500 ring-1 ring-transparent transition-all",
            vertical && "lg:hidden 2xl:block",
            {
              "bg-card/70": customBackgroundImage,
            },
            {
              "ring-red-500 ring-2 border-transparent": status === "offline",
            },
          )}
        >
          <CardContent className={overviewContentClassName}>
            <section className={overviewStackClassName}>
              <p className={cn("text-sm font-medium md:text-base", vertical && "truncate")}>{t("serverOverview.offlineServers")}</p>
              <div className={overviewValueClassName}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                <div className="text-lg font-semibold">{offline}</div>
              </div>
            </section>
          </CardContent>
        </Card>
        {vertical && (
          <Card
            className={cn("hidden ring-1 ring-transparent transition-all lg:block 2xl:hidden", {
              "bg-card/70": customBackgroundImage,
              "border-transparent ring-2 ring-green-500": status === "online",
              "border-transparent ring-2 ring-red-500": status === "offline",
            })}
          >
            <CardContent className={overviewContentClassName}>
              <section className="grid w-full grid-cols-2 divide-x divide-border">
                <button
                  type="button"
                  onClick={() => setStatus("online")}
                  className="flex min-w-0 flex-col gap-1 pr-4 text-left"
                >
                  <p className="truncate text-sm font-medium">{t("serverOverview.onlineServers")}</p>
                  <div className={overviewValueClassName}>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                    <div className="text-lg font-semibold">{online}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("offline")}
                  className="flex min-w-0 flex-col gap-1 pl-4 text-left"
                >
                  <p className="truncate text-sm font-medium">{t("serverOverview.offlineServers")}</p>
                  <div className={overviewValueClassName}>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                    <div className="text-lg font-semibold">{offline}</div>
                  </div>
                </button>
              </section>
            </CardContent>
          </Card>
        )}
        <Card
          className={cn("hover:ring-purple-500 ring-1 ring-transparent transition-all", {
            "bg-card/70": customBackgroundImage,
          })}
        >
          <CardContent className={cn("relative", overviewContentClassName)}>
            <section className="flex w-full flex-col gap-1">
              <div className="flex items-center w-full justify-between">
                <p className={cn("text-sm font-medium md:text-base", vertical && "truncate")}>{t("serverOverview.network")}</p>
              </div>
              <section className="flex items-start flex-row z-10 pr-0 gap-1">
                <p className="sm:text-[12px] text-[10px] text-blue-800 dark:text-blue-400 text-nowrap font-medium">↑{formatBytes(up)}</p>
                <p className="sm:text-[12px] text-[10px] text-purple-800 dark:text-purple-400 text-nowrap font-medium">↓{formatBytes(down)}</p>
              </section>
              <section className="flex flex-col sm:flex-row -mr-1 sm:items-center items-start gap-1">
                <p className="text-[11px] flex items-center text-nowrap font-semibold">
                  <ArrowUpCircleIcon className="size-3 mr-0.5 sm:mb-[1px]" />
                  {formatBytes(upSpeed)}/s
                </p>
                <p className="text-[11px] flex items-center text-nowrap font-semibold">
                  <ArrowDownCircleIcon className="size-3 mr-0.5" />
                  {formatBytes(downSpeed)}/s
                </p>
              </section>
            </section>
            {!disableAnimatedMan && (
              <img
                className="absolute right-3 top-[-85px] z-50 w-20 scale-90 group-hover:opacity-50 md:scale-100 transition-all"
                alt={"animated-man"}
                src={customIllustration}
                loading="eager"
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
