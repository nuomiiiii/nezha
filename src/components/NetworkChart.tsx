"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchMonitor } from "@/lib/nezha-api"
import { cn, formatTime } from "@/lib/utils"
import { NezhaMonitor, NezhaWebsocketResponse, ServerMonitorChart } from "@/types/nezha-api"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import * as React from "react"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import { LoadingSpinner } from "./loading/Loader"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Switch } from "./ui/switch"

interface ResultItem {
  created_at: number
  [key: string]: number | null
}

/**
 * Helper method to calculate packet loss from delay data
 */
const calculatePacketLoss = (delays: Array<number | null>): number[] => {
  if (!delays || delays.length === 0) return []

  const packetLossRates: number[] = []
  const windowSize = Math.min(10, Math.max(3, Math.floor(delays.length / 10)))
  const timeoutThreshold = 3000
  const extremeDelayThreshold = 10000

  for (let i = 0; i < delays.length; i++) {
    const currentDelay = delays[i]
    let lossRate = 0

    if (currentDelay === 0 || currentDelay === null || currentDelay === undefined) {
      lossRate = 100
    } else if (currentDelay >= extremeDelayThreshold) {
      lossRate = Math.min(95, 60 + (currentDelay - extremeDelayThreshold) / 1000)
    } else if (currentDelay >= timeoutThreshold) {
      lossRate = Math.min(50, (currentDelay - timeoutThreshold) / 200)
    } else {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(delays.length, i + Math.ceil(windowSize / 2))
      const windowDelays = delays.slice(start, end).filter((delay): delay is number => delay !== null && delay > 0)

      if (windowDelays.length > 2) {
        const mean = windowDelays.reduce((sum, d) => sum + d, 0) / windowDelays.length
        const variance = windowDelays.reduce((sum, d) => sum + (d - mean) ** 2, 0) / windowDelays.length
        const standardDeviation = Math.sqrt(variance)
        const coefficientOfVariation = standardDeviation / mean

        if (coefficientOfVariation > 0.8) {
          lossRate = Math.min(25, coefficientOfVariation * 15)
        } else if (coefficientOfVariation > 0.5) {
          lossRate = Math.min(10, coefficientOfVariation * 8)
        } else if (coefficientOfVariation > 0.3) {
          lossRate = Math.min(5, coefficientOfVariation * 5)
        }

        if (currentDelay > mean * 2.5) {
          lossRate += Math.min(15, (currentDelay / mean - 2.5) * 10)
        }
      }
    }

    if (i > 0) {
      const alpha = 0.3
      lossRate = alpha * lossRate + (1 - alpha) * packetLossRates[i - 1]
    }

    packetLossRates.push(Math.max(0, Math.min(100, lossRate)))
  }

  return packetLossRates.map((rate) => Number(rate.toFixed(2)))
}

const TIME_OPTIONS = [
  { value: "1", label: "1h" },
  { value: "6", label: "6h" },
  { value: "12", label: "12h" },
  { value: "24", label: "24h" },
  { value: "72", label: "3d" },
  { value: "168", label: "7d" },
  { value: "720", label: "30d" },
]

export function NetworkChart({ server_id, show, initialMonitorId }: { server_id: number; show: boolean; initialMonitorId?: number }) {
  const { t } = useTranslation()
  const { lastMessage } = useWebSocketContext()
  const [hours, setHours] = React.useState(1)

  const {
    data: monitorData,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["monitor", server_id, hours],
    queryFn: () => fetchMonitor(server_id, hours),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    refetchOnWindowFocus: show,
    refetchInterval: show ? (hours <= 24 ? 10000 : hours <= 168 ? 60000 : 300000) : false,
    staleTime: 10000,
  })

  const fallbackServerName = useMemo(() => {
    if (!lastMessage) return ""
    try {
      const websocketData = JSON.parse(lastMessage.data) as NezhaWebsocketResponse
      return websocketData.servers.find((server) => server.id === server_id)?.name || ""
    } catch {
      return ""
    }
  }, [lastMessage, server_id])

  const monitorRecords = monitorData?.data || []
  const isLoading = isPending
  const hasInitialError = isError && !monitorData
  const isEmpty = !isLoading && !hasInitialError && !!monitorData?.success && monitorRecords.length === 0

  React.useEffect(() => {
    if (hasInitialError) console.error("Failed to load ping monitor data:", error)
  }, [error, hasInitialError])
  const transformedData = monitorRecords.length > 0 ? transformData(monitorRecords) : {}

  const formattedData = monitorRecords.length > 0 ? formatData(monitorRecords) : []
  const initialChart = monitorRecords.find((monitor) => monitor.monitor_id === initialMonitorId)?.monitor_name

  const chartDataKey = Object.keys(transformedData)

  const initChartConfig = {
    avg_delay: {
      label: t("monitor.avgDelay"),
    },
    ...chartDataKey.reduce((acc, key) => {
      acc[key] = {
        label: key,
      }
      return acc
    }, {} as ChartConfig),
  } satisfies ChartConfig

  return (
    <NetworkChartClient
      chartDataKey={chartDataKey}
      chartConfig={initChartConfig}
      chartData={transformedData}
      serverName={monitorRecords[0]?.server_name || fallbackServerName}
      formattedData={formattedData}
      hours={hours}
      isLoading={isLoading}
      isEmpty={isEmpty}
      hasError={hasInitialError}
      initialChart={initialChart}
      onHoursChange={setHours}
      onRetry={() => void refetch()}
    />
  )
}

export const NetworkChartClient = React.memo(function NetworkChart({
  chartDataKey,
  chartConfig,
  chartData,
  serverName,
  formattedData,
  hours,
  isLoading,
  isEmpty,
  hasError,
  initialChart,
  onHoursChange,
  onRetry,
}: {
  chartDataKey: string[]
  chartConfig: ChartConfig
  chartData: ServerMonitorChart
  serverName: string
  formattedData: ResultItem[]
  hours: number
  isLoading: boolean
  isEmpty: boolean
  hasError: boolean
  initialChart?: string
  onHoursChange: (hours: number) => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const hasChartData = !isLoading && !isEmpty && !hasError

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  const forcePeakCutEnabled = (window.ForcePeakCutEnabled as boolean) ?? false

  // Change from string to string array for multi-selection
  const [activeCharts, setActiveCharts] = React.useState<string[]>([])
  const appliedInitialChart = React.useRef<string | undefined>(undefined)
  const [isPeakEnabled, setIsPeakEnabled] = React.useState(forcePeakCutEnabled)

  React.useEffect(() => {
    if (!initialChart || appliedInitialChart.current === initialChart || !chartDataKey.includes(initialChart)) return
    appliedInitialChart.current = initialChart
    setActiveCharts([initialChart])
  }, [chartDataKey, initialChart])

  // Function to clear all selected charts
  const clearAllSelections = useCallback(() => {
    setActiveCharts([])
  }, [])

  // Updated to handle multiple selections
  const handleButtonClick = useCallback((chart: string) => {
    setActiveCharts((prev) => {
      // If chart is already selected, remove it
      if (prev.includes(chart)) {
        return prev.filter((c) => c !== chart)
      }
      // Otherwise, add it to selected charts
      return [...prev, chart]
    })
  }, [])

  const getColorByIndex = useCallback(
    (chart: string) => {
      const index = chartDataKey.indexOf(chart)
      return `hsl(var(--chart-${(index % 10) + 1}))`
    },
    [chartDataKey],
  )

  const chartButtons = useMemo(
    () =>
      chartDataKey.map((key) => {
        const monitorData = chartData[key]
        if (!monitorData?.length) return null
        const lastDelay = monitorData[monitorData.length - 1].avg_delay
        const formattedLastDelay = lastDelay === null || !Number.isFinite(lastDelay) ? "--" : `${lastDelay.toFixed(2)}ms`

        // Calculate average packet loss if available
        const packetLossData = monitorData.filter((item) => item.packet_loss !== undefined).map((item) => item.packet_loss!)
        const packetLossWeight = monitorData.reduce((sum, item) => sum + (item.packet_loss !== undefined ? item.sample_count || 1 : 0), 0)
        const avgPacketLoss =
          packetLossData.length > 0 && packetLossWeight > 0
            ? monitorData.reduce((sum, item) => sum + (item.packet_loss || 0) * (item.sample_count || 1), 0) / packetLossWeight
            : null

        return (
          <button
            key={key}
            data-active={activeCharts.includes(key)}
            className={`relative z-30 flex cursor-pointer grow basis-0 flex-col justify-center gap-1 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 text-left data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-6`}
            onClick={() => handleButtonClick(key)}
          >
            <span className="whitespace-nowrap text-xs text-muted-foreground">{key}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-md font-bold leading-none sm:text-lg">{formattedLastDelay}</span>
              {avgPacketLoss !== null && <span className="text-xs text-muted-foreground">{avgPacketLoss.toFixed(2)}% avg loss</span>}
            </div>
          </button>
        )
      }),
    [chartDataKey, activeCharts, chartData, handleButtonClick],
  )

  const chartElements = useMemo(() => {
    const elements = []

    // If exactly one chart is selected, show delay line and packet loss area
    if (activeCharts.length === 1) {
      const chart = activeCharts[0]
      elements.push(
        <Area
          key="packet-loss-area"
          isAnimationActive={false}
          dataKey="packet_loss"
          stroke="none"
          fill="hsl(45, 100%, 60%)"
          fillOpacity={0.3}
          yAxisId="packet-loss"
        />,
        <Line
          key="delay-line"
          isAnimationActive={false}
          strokeWidth={1}
          type="linear"
          dot={false}
          dataKey="avg_delay"
          stroke={getColorByIndex(chart)}
          yAxisId="delay"
          connectNulls={false}
        />,
      )
    } else if (activeCharts.length > 1) {
      // Multiple charts selected - show only delay lines for selected monitors
      elements.push(
        ...activeCharts.map((chart) => (
          <Line
            key={chart}
            isAnimationActive={false}
            strokeWidth={1}
            type="linear"
            dot={false}
            dataKey={chart}
            stroke={getColorByIndex(chart)}
            name={chart}
            connectNulls={false}
            yAxisId="delay"
          />
        )),
      )
    } else {
      // No selection - show all charts (default view)
      elements.push(
        ...chartDataKey.map((key) => (
          <Line
            key={key}
            isAnimationActive={false}
            strokeWidth={1}
            type="linear"
            dot={false}
            dataKey={key}
            stroke={getColorByIndex(key)}
            connectNulls={false}
            yAxisId="delay"
          />
        )),
      )
    }

    return elements
  }, [activeCharts, chartDataKey, getColorByIndex])

  const processedData = useMemo(() => {
    // Special handling for single chart selection
    let baseData = formattedData
    if (activeCharts.length === 1) {
      const selectedChart = activeCharts[0]
      const selectedData = chartData[selectedChart]
      if (selectedData) {
        baseData = selectedData.map((item) => ({
          created_at: item.created_at,
          avg_delay: item.avg_delay,
          packet_loss: item.packet_loss ?? 0,
        }))
      }
    }

    if (!isPeakEnabled) {
      return baseData
    }

    // For peak cutting, use the base data
    const data = baseData

    const windowSize = 11 // 增加窗口大小以获取更好的统计效果
    const alpha = 0.3 // EWMA平滑因子

    // 辅助函数：计算中位数
    const getMedian = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    // 辅助函数：异常值处理
    const processValues = (values: number[]) => {
      if (values.length === 0) return null

      const median = getMedian(values)
      const deviations = values.map((v) => Math.abs(v - median))
      const medianDeviation = getMedian(deviations) * 1.4826 // MAD估计器

      // 使用中位数绝对偏差(MAD)进行异常值检测
      const validValues = values.filter(
        (v) =>
          Math.abs(v - median) <= 3 * medianDeviation && // 更严格的异常值判定
          v <= median * 3, // 限制最大值不超过中位数的3倍
      )

      if (validValues.length === 0) return median // 如果没有有效值，返回中位数

      // 计算EWMA
      let ewma = validValues[0]
      for (let i = 1; i < validValues.length; i++) {
        ewma = alpha * validValues[i] + (1 - alpha) * ewma
      }

      return ewma
    }

    // 初始化EWMA历史值
    const ewmaHistory: { [key: string]: number } = {}

    return data.map((point, index) => {
      if (index < windowSize - 1) return point

      const window = data.slice(index - windowSize + 1, index + 1)
      const smoothed = { ...point } as ResultItem

      // Special handling for single chart selection
      if (activeCharts.length === 1) {
        if (point.avg_delay === null || point.avg_delay === undefined) return smoothed

        // Process avg_delay for single chart
        const values = window.map((w) => w.avg_delay as number).filter((v) => v !== undefined && v !== null)

        if (values.length > 0) {
          const processed = processValues(values)
          if (processed !== null) {
            if (ewmaHistory.avg_delay === undefined) {
              ewmaHistory.avg_delay = processed
            } else {
              ewmaHistory.avg_delay = alpha * processed + (1 - alpha) * ewmaHistory.avg_delay
            }
            smoothed.avg_delay = ewmaHistory.avg_delay
          }
        }
      } else {
        // Process all chart keys or just the selected ones
        const keysToProcess = activeCharts.length > 0 ? activeCharts : chartDataKey

        keysToProcess.forEach((key) => {
          if (point[key] === null || point[key] === undefined) return

          const values = window.map((w) => w[key]).filter((v) => v !== undefined && v !== null) as number[]

          if (values.length > 0) {
            const processed = processValues(values)
            if (processed !== null) {
              // Apply EWMA smoothing
              if (ewmaHistory[key] === undefined) {
                ewmaHistory[key] = processed
              } else {
                ewmaHistory[key] = alpha * processed + (1 - alpha) * ewmaHistory[key]
              }
              smoothed[key] = ewmaHistory[key]
            }
          }
        })
      }

      return smoothed
    })
  }, [isPeakEnabled, activeCharts, formattedData, chartData, chartDataKey])

  return (
    <Card
      aria-busy={isLoading}
      data-state={isLoading ? "loading" : hasError ? "error" : isEmpty ? "empty" : "ready"}
      data-testid="network-chart-card"
      className={cn({
        "bg-card/70": customBackgroundImage,
      })}
    >
      <CardHeader className="flex flex-col items-stretch space-y-0 p-0 sm:flex-row">
        <div className="flex min-h-[104px] flex-none flex-col justify-center gap-1 border-b px-6 py-4 sm:min-w-[250px]">
          <CardTitle className="flex min-h-5 flex-none items-center gap-0.5 text-md">{serverName || "\u00a0"}</CardTitle>
          <CardDescription className="min-h-4 text-xs">
            {isLoading || hasError ? "\u00a0" : `${chartDataKey.length} ${t("monitor.monitorCount")}`}
          </CardDescription>
          <div className="flex items-center mt-0.5 space-x-3">
            <Select value={String(hours)} onValueChange={(v) => onHoursChange(Number(v))}>
              <SelectTrigger className="w-[70px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch id="Peak" checked={isPeakEnabled} onCheckedChange={setIsPeakEnabled} />
              <Label className="text-xs" htmlFor="Peak">
                Peak cut
              </Label>
            </div>
          </div>
        </div>
        <div className="flex min-h-[104px] w-full flex-wrap">{isLoading || hasError || isEmpty ? null : chartButtons}</div>
      </CardHeader>
      <CardContent className="pr-2 pl-0 py-4 sm:pt-6 sm:pb-6 sm:pr-6 sm:pl-2">
        <div className="relative h-[250px]">
          {hasChartData && activeCharts.length > 0 && (
            <button
              className="absolute -top-2 right-1 z-10 text-xs px-2 py-1 bg-stone-100/80 dark:bg-stone-800/80 backdrop-blur-sm rounded-[5px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={clearAllSelections}
            >
              {t("monitor.clearSelections", "Clear")} ({activeCharts.length})
            </button>
          )}
          <ChartContainer
            aria-hidden={!hasChartData}
            config={chartConfig}
            data-testid="network-chart-canvas"
            className={cn(
              "aspect-auto h-[250px] w-full transition-opacity duration-150 motion-reduce:transition-none",
              hasChartData ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <ComposedChart accessibilityLayer data={hasChartData ? processedData : []} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="created_at"
                tickLine={true}
                tickSize={3}
                axisLine={false}
                tickMargin={8}
                minTickGap={80}
                ticks={processedData
                  .filter((item, index, array) => {
                    if (array.length < 6) {
                      return index === 0 || index === array.length - 1
                    }

                    // 计算数据的总时间跨度（毫秒）
                    const timeSpan = array[array.length - 1].created_at - array[0].created_at
                    const hours = timeSpan / (1000 * 60 * 60)

                    // 根据时间跨度调整显示间隔
                    if (hours <= 12) {
                      // 12小时内，每60分钟显示一个刻度
                      return index === 0 || index === array.length - 1 || new Date(item.created_at).getMinutes() % 60 === 0
                    }
                    // 超过12小时，每2小时显示一个刻度
                    const date = new Date(item.created_at)
                    return date.getMinutes() === 0 && date.getHours() % 2 === 0
                  })
                  .map((item) => item.created_at)}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  const minutes = date.getMinutes()
                  return minutes === 0 ? `${date.getHours()}:00` : `${date.getHours()}:${minutes}`
                }}
              />
              <YAxis yAxisId="delay" tickLine={false} axisLine={false} tickMargin={15} minTickGap={20} tickFormatter={(value) => `${value}ms`} />
              {activeCharts.length === 1 && (
                <YAxis
                  yAxisId="packet-loss"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={15}
                  minTickGap={20}
                  tickFormatter={(value) => `${value}%`}
                />
              )}
              <ChartTooltip
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    indicator={"line"}
                    labelKey="created_at"
                    labelFormatter={(_, payload) => {
                      return formatTime(payload[0].payload.created_at)
                    }}
                    formatter={(value, name) => {
                      let formattedValue: string
                      let label: string

                      if (name === "packet_loss") {
                        formattedValue = `${Number(value).toFixed(2)}%`
                        label = t("monitor.packetLoss", "Packet Loss")
                      } else if (name === "avg_delay") {
                        formattedValue = `${Number(value).toFixed(2)}ms`
                        label = t("monitor.avgDelay", "Avg Delay")
                      } else {
                        // For monitor names (in multi-chart view) - delay data
                        formattedValue = `${Number(value).toFixed(2)}ms`
                        label = name as string
                      }

                      return (
                        <div className="flex flex-1 items-center justify-between leading-none">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="ml-2 font-medium text-foreground tabular-nums">{formattedValue}</span>
                        </div>
                      )
                    }}
                  />
                }
              />
              {activeCharts.length !== 1 && <ChartLegend content={<ChartLegendContent />} />}
              {chartElements}
            </ComposedChart>
          </ChartContainer>
          {!hasChartData && (
            <div className="absolute inset-0 flex items-center justify-center">
              {isLoading ? (
                <div className="text-muted-foreground" aria-label={t("common.loading", "Loading")}>
                  <LoadingSpinner />
                </div>
              ) : hasError ? (
                <div className="flex flex-col items-center gap-3 px-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{t("monitor.loadError", "Failed to load latency data")}</p>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={onRetry}
                  >
                    <RefreshCw className="size-3.5" />
                    {t("monitor.retry", "Retry")}
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{t("monitor.noData", "该服务器未配置延迟检测")}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

const transformData = (data: NezhaMonitor[]) => {
  const monitorData: ServerMonitorChart = {}

  data.forEach((item) => {
    const monitorName = item.monitor_name

    if (!monitorData[monitorName]) {
      monitorData[monitorName] = []
    }

    // Calculate packet loss from delay data if not provided
    const packetLoss = item.packet_loss || calculatePacketLoss(item.avg_delay)

    for (let i = 0; i < item.created_at.length; i++) {
      monitorData[monitorName].push({
        created_at: item.created_at[i],
        avg_delay: item.avg_delay[i],
        packet_loss: packetLoss[i],
        sample_count: item.sample_count?.[i],
      })
    }
  })

  return monitorData
}

const formatData = (rawData: NezhaMonitor[]) => {
  const result: { [time: number]: ResultItem } = {}

  const allTimes = new Set<number>()
  rawData.forEach((item) => {
    item.created_at.forEach((time) => allTimes.add(time))
  })

  const allTimeArray = Array.from(allTimes).sort((a, b) => a - b)

  rawData.forEach((item) => {
    const { monitor_name, created_at, avg_delay } = item

    // Calculate packet loss if not provided
    const packetLoss = item.packet_loss || calculatePacketLoss(avg_delay)

    allTimeArray.forEach((time) => {
      if (!result[time]) {
        result[time] = { created_at: time }
      }

      const timeIndex = created_at.indexOf(time)
      result[time][monitor_name] = timeIndex !== -1 ? avg_delay[timeIndex] : null
      // Add packet loss data if available
      if (packetLoss) {
        result[time][`${monitor_name}_packet_loss`] = timeIndex !== -1 ? packetLoss[timeIndex] : null
      }
    })
  })

  return Object.values(result).sort((a, b) => a.created_at - b.created_at)
}
