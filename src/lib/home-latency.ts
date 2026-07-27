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
