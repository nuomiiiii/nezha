import { cn } from "@/lib/utils"
import type { HomeLatencySummary } from "@/lib/home-latency"
import { useTranslation } from "react-i18next"

const SEGMENT_COUNT = 12

function paddedHistory(values: Array<number | null> | undefined): Array<number | null> {
  const history = (values || []).slice(-SEGMENT_COUNT)
  return [...new Array(Math.max(0, SEGMENT_COUNT - history.length)).fill(null), ...history]
}

function segmentColor(kind: "latency" | "loss", value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "bg-stone-200 dark:bg-stone-700"

  if (kind === "latency") {
    if (value < 100) return "bg-emerald-500"
    if (value < 200) return "bg-lime-500"
    if (value < 350) return "bg-amber-400"
    return "bg-red-500"
  }

  if (value < 0.5) return "bg-emerald-500"
  if (value < 2) return "bg-lime-500"
  if (value < 5) return "bg-amber-400"
  return "bg-red-500"
}

function MetricSummary({
  kind,
  label,
  value,
  history,
  loaded,
}: {
  kind: "latency" | "loss"
  label: string
  value: number | null
  history: Array<number | null> | undefined
  loaded: boolean
}) {
  const formattedValue = value === null ? "--" : kind === "latency" ? `${Math.round(value)} ms` : `${value.toFixed(1)}%`

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 text-[11px] leading-4">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="flex min-w-[48px] shrink-0 justify-end font-medium tabular-nums text-foreground">
          {loaded ? (
            <span key={formattedValue} className="animate-in fade-in-0 duration-300 motion-reduce:animate-none">
              {formattedValue}
            </span>
          ) : (
            <span className="h-3 w-10 animate-pulse rounded-sm bg-stone-200 dark:bg-stone-700 motion-reduce:animate-none" />
          )}
        </span>
      </div>
      <div className="mt-1 grid h-[3px] grid-cols-[repeat(12,minmax(0,1fr))] gap-[2px]" aria-hidden="true">
        {paddedHistory(history).map((item, index) => (
          <span key={index} className={cn("min-w-[2px] rounded-sm transition-colors duration-300 motion-reduce:transition-none", segmentColor(kind, item))} />
        ))}
      </div>
    </div>
  )
}

export default function ServerLatencySummary({ summary }: { summary?: HomeLatencySummary }) {
  const { t } = useTranslation()

  if (!summary) return null

  const loaded = summary.updatedAt !== null

  return (
    <section className="grid min-h-[23px] w-full grid-cols-2 gap-3" data-testid="server-latency-summary">
      <MetricSummary kind="latency" label={t("monitor.avgDelay")} value={summary.latency} history={summary.latencyHistory} loaded={loaded} />
      <MetricSummary kind="loss" label={t("monitor.packetLoss")} value={summary.packetLoss} history={summary.packetLossHistory} loaded={loaded} />
    </section>
  )
}
