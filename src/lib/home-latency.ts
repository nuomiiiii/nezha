export interface HomeLatencySample {
  entityId: string
  timestamp: number
  latency: number | null
  lossRatio: number
  count: number
}

export interface HomeLatencySummary {
  latency: number | null
  packetLoss: number | null
  latencyHistory: Array<number | null>
  packetLossHistory: Array<number | null>
  updatedAt: number | null
}

interface SummaryBucket {
  latencySum: number
  latencyCount: number
  lostCount: number
  totalCount: number
}

const MINUTE_MS = 60_000
const HOME_BUCKET_MS = 5 * MINUTE_MS

function finiteOrNull(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function summarizeHomeLatencySamples(samples: HomeLatencySample[], historyLimit = 12): Record<string, HomeLatencySummary> {
  const bucketsByEntity = new Map<string, Map<number, SummaryBucket>>()

  for (const sample of samples) {
    const timestamp = finiteOrNull(sample.timestamp)
    const count = finiteOrNull(sample.count)
    if (!sample.entityId || timestamp === null || count === null || count <= 0) continue

    const bucketTime = Math.floor(timestamp / HOME_BUCKET_MS) * HOME_BUCKET_MS
    const lossRatio = Math.min(1, Math.max(0, finiteOrNull(sample.lossRatio) ?? 0))
    const entityBuckets = bucketsByEntity.get(sample.entityId) || new Map<number, SummaryBucket>()
    const bucket = entityBuckets.get(bucketTime) || { latencySum: 0, latencyCount: 0, lostCount: 0, totalCount: 0 }
    const validCount = count * (1 - lossRatio)
    const latency = finiteOrNull(sample.latency)

    if (latency !== null && latency >= 0 && validCount > 0) {
      bucket.latencySum += latency * validCount
      bucket.latencyCount += validCount
    }
    bucket.lostCount += count * lossRatio
    bucket.totalCount += count
    entityBuckets.set(bucketTime, bucket)
    bucketsByEntity.set(sample.entityId, entityBuckets)
  }

  const summaries: Record<string, HomeLatencySummary> = {}
  for (const [entityId, entityBuckets] of bucketsByEntity) {
    const latestTimestamp = Math.max(...entityBuckets.keys())
    const windowSize = Math.max(1, Math.floor(historyLimit))
    const history = Array.from({ length: windowSize }, (_, index) => {
      const timestamp = latestTimestamp - (windowSize - index - 1) * HOME_BUCKET_MS
      const bucket = entityBuckets.get(timestamp)
      return {
        timestamp,
        latency: bucket && bucket.latencyCount > 0 ? bucket.latencySum / bucket.latencyCount : null,
        packetLoss: bucket && bucket.totalCount > 0 ? (bucket.lostCount / bucket.totalCount) * 100 : null,
      }
    })
    const latest = history.at(-1)
    let windowLostCount = 0
    let windowTotalCount = 0
    for (const item of history) {
      const bucket = entityBuckets.get(item.timestamp)
      if (!bucket) continue
      windowLostCount += bucket.lostCount
      windowTotalCount += bucket.totalCount
    }

    summaries[entityId] = {
      latency: latest?.latency ?? null,
      packetLoss: windowTotalCount > 0 ? (windowLostCount / windowTotalCount) * 100 : null,
      latencyHistory: history.map((item) => item.latency),
      packetLossHistory: history.map((item) => item.packetLoss),
      updatedAt: latestTimestamp,
    }
  }

  return summaries
}


const HOME_LATENCY_CACHE_KEY = "nezha-home-latency-v1"
const HOME_LATENCY_CACHE_MAX_AGE_MS = 5 * 60_000

interface HomeLatencyCachePayload {
  savedAt: number
  data: Record<string, HomeLatencySummary>
}

type ReadableStorage = Pick<Storage, "getItem">
type WritableStorage = Pick<Storage, "setItem">

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value))
}

function isHistory(value: unknown): value is Array<number | null> {
  return Array.isArray(value) && value.every(isNullableNumber)
}

function isHomeLatencySummary(value: unknown): value is HomeLatencySummary {
  if (!value || typeof value !== "object") return false
  const summary = value as Partial<HomeLatencySummary>
  return (
    isNullableNumber(summary.latency) &&
    isNullableNumber(summary.packetLoss) &&
    isHistory(summary.latencyHistory) &&
    isHistory(summary.packetLossHistory) &&
    isNullableNumber(summary.updatedAt)
  )
}

export function readHomeLatencyCache(
  storage: ReadableStorage | null,
  entityIds: string[],
  now = Date.now(),
): Record<string, HomeLatencySummary> | undefined {
  if (!storage || entityIds.length === 0) return undefined

  try {
    const parsed = JSON.parse(storage.getItem(HOME_LATENCY_CACHE_KEY) || "null") as Partial<HomeLatencyCachePayload> | null
    if (!parsed || typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return undefined
    if (parsed.savedAt > now + 60_000 || now - parsed.savedAt > HOME_LATENCY_CACHE_MAX_AGE_MS) return undefined
    if (!parsed.data || typeof parsed.data !== "object") return undefined

    const cached: Record<string, HomeLatencySummary> = {}
    for (const entityId of entityIds) {
      const summary = parsed.data[entityId]
      if (isHomeLatencySummary(summary)) cached[entityId] = summary
    }
    return Object.keys(cached).length > 0 ? cached : undefined
  } catch {
    return undefined
  }
}

export function writeHomeLatencyCache(
  storage: WritableStorage | null,
  data: Record<string, HomeLatencySummary>,
  savedAt = Date.now(),
): void {
  if (!storage || Object.keys(data).length === 0) return

  try {
    const payload: HomeLatencyCachePayload = { savedAt, data }
    storage.setItem(HOME_LATENCY_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Storage can be unavailable in privacy modes; live data still works normally.
  }
}
