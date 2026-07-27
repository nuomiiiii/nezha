export interface LegacyPingRecord {
  task_id: number
  time: string
  value: number
  client?: string
}

export interface LegacyPingTask {
  id: number
  name?: string
  clients?: string[]
}

export interface LegacyPingData {
  records: LegacyPingRecord[]
  tasks: LegacyPingTask[]
}

interface LegacyApiEnvelope {
  status?: string
  message?: string
  data?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function normalizeLegacyPingResponse(value: unknown): LegacyPingData {
  const envelope = isObject(value) ? (value as LegacyApiEnvelope) : undefined
  if (envelope?.status === "error") {
    throw new Error(envelope.message || "Legacy ping API request failed")
  }

  const payload = isObject(envelope?.data) ? envelope.data : value
  if (!isObject(payload)) return { records: [], tasks: [] }

  return {
    records: Array.isArray(payload.records) ? (payload.records as LegacyPingRecord[]) : [],
    tasks: Array.isArray(payload.tasks) ? (payload.tasks as LegacyPingTask[]) : [],
  }
}

export async function fetchLegacyPingData(uuid: string, hours: number): Promise<LegacyPingData> {
  const query = new URLSearchParams({ uuid, hours: String(hours) })
  const response = await fetch(`/api/records/ping?${query.toString()}`, {
    credentials: "include",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Legacy ping API HTTP ${response.status}: ${response.statusText}`)
  }

  return normalizeLegacyPingResponse(await response.json())
}
