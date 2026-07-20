import { SharedClient } from "@/hooks/use-rpc2"
import {
  LoginUserResponse,
  MonitorResponse,
  NezhaMonitor,
  ServerGroupResponse,
  ServiceData,
  ServiceResponse,
  SettingResponse,
} from "@/types/nezha-api"
import { DateTime } from "luxon"

import { getKomariNodes, uuidToNumber } from "./utils"

//let lastestRefreshTokenAt = 0

const PING_LATENCY_METRIC = "ping.latency_ms"
const PING_LOSS_METRIC = "ping.loss"

interface KomariMetricPoint {
  time?: string
  value?: number | null
  count?: number
  tag?: Record<string, string>
  tags?: Record<string, string>
}

interface KomariMetricSeries {
  metric_key?: string
  entity_id?: string
  tag?: Record<string, string>
  tags?: Record<string, string>
  points?: KomariMetricPoint[]
}

interface KomariPingTask {
  id: number | string
  name?: string
  clients?: string[]
}

interface KomariMetricResponse {
  series?: KomariMetricSeries[]
}

interface PingLossSample {
  ratio: number
  count: number
}

function metricSeriesTags(series: KomariMetricSeries): Record<string, string> {
  const point = series.points?.find((item) => item.tags || item.tag)
  return series.tags || series.tag || point?.tags || point?.tag || {}
}

function metricTaskId(series: KomariMetricSeries): string {
  return String(metricSeriesTags(series).task_id || "")
}

function metricSeriesKey(series: KomariMetricSeries): string {
  return `${series.entity_id || ""}\u0000${metricTaskId(series)}`
}

function metricPointCount(point: KomariMetricPoint): number {
  const count = Number(point.count)
  return Number.isFinite(count) && count > 0 ? count : 1
}

function metricPointTime(point: KomariMetricPoint): number | null {
  const time = Date.parse(point.time || "")
  return Number.isFinite(time) ? time : null
}

function clampLossRatio(value: unknown): number {
  const ratio = Number(value)
  return Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0
}

function buildPingLossLookup(seriesList: KomariMetricSeries[]): Map<string, Map<number, PingLossSample>> {
  const lookup = new Map<string, Map<number, PingLossSample>>()

  for (const series of seriesList) {
    if (series.metric_key !== PING_LOSS_METRIC || !metricTaskId(series)) continue
    const points = new Map<number, PingLossSample>()
    for (const point of series.points || []) {
      const time = metricPointTime(point)
      if (time === null || point.value === null || point.value === undefined) continue
      points.set(time, { ratio: clampLossRatio(point.value), count: metricPointCount(point) })
    }
    lookup.set(metricSeriesKey(series), points)
  }

  return lookup
}

function latencyWithoutLoss(value: unknown, count: number, loss?: PingLossSample): number | null {
  const average = Number(value)
  if (!Number.isFinite(average)) return null
  if (!loss) return average >= 0 ? average : null

  const lost = count * loss.ratio
  const valid = count - lost
  if (valid <= 0) return null

  // ping.latency_ms stores -1 for lost probes, so remove that contribution.
  const latency = (average * count + lost) / valid
  return Number.isFinite(latency) && latency >= 0 ? latency : null
}

function isMetricApiUnavailable(error: unknown): boolean {
  return error instanceof Error && /(?:RPC Error -32601|method not found)/i.test(error.message)
}

async function fetchPingMetricSeries(
  params: Record<string, unknown>,
  maxPoints: number,
): Promise<{ series: KomariMetricSeries[]; tasks: KomariPingTask[] }> {
  const client = SharedClient()
  const result = await client.callViaHTTP<Record<string, unknown>, KomariMetricResponse>(
    "public:queryMetrics",
    {
      metric_keys: [PING_LATENCY_METRIC, PING_LOSS_METRIC],
      ...params,
      downsample: true,
      max_points: maxPoints,
      aggregation: "avg",
      fill_empty: false,
    },
    { timeout: 30000 },
  )
  const taskResult = await client.callViaHTTP<undefined, KomariPingTask[]>("public:getPublicPingTasks", undefined, { timeout: 30000 })
  const tasks = Array.isArray(taskResult) ? taskResult : []
  const taskClients = new Map(tasks.map((task) => [String(task.id), new Set(task.clients || [])]))
  const series = Array.isArray(result?.series)
    ? result.series.filter((item) => {
        const clients = taskClients.get(metricTaskId(item))
        return !!item.entity_id && !!clients?.has(item.entity_id)
      })
    : []

  return {
    series,
    tasks,
  }
}

function monitorDataFromMetricSeries(
  seriesList: KomariMetricSeries[],
  tasks: KomariPingTask[],
  serverId: number,
  serverName: string,
): NezhaMonitor[] {
  const taskNames = new Map(tasks.map((task) => [String(task.id), task.name || `task_${task.id}`]))
  const lossLookup = buildPingLossLookup(seriesList)
  const monitors: NezhaMonitor[] = []

  for (const series of seriesList) {
    const taskId = metricTaskId(series)
    if (series.metric_key !== PING_LATENCY_METRIC || !taskId) continue

    const points = [...(series.points || [])].sort((a, b) => (metricPointTime(a) || 0) - (metricPointTime(b) || 0))
    const lossPoints = lossLookup.get(metricSeriesKey(series))
    const monitorId = Number(taskId)
    const monitor: NezhaMonitor = {
      monitor_id: Number.isFinite(monitorId) ? monitorId : 0,
      monitor_name: taskNames.get(taskId) || `task_${taskId}`,
      server_id: serverId,
      server_name: serverName,
      created_at: [],
      avg_delay: [],
      packet_loss: [],
      sample_count: [],
    }
    let lastGood = 0

    for (const point of points) {
      const time = metricPointTime(point)
      if (time === null || point.value === null || point.value === undefined) continue
      const count = metricPointCount(point)
      const loss = lossPoints?.get(time)
      const latency = latencyWithoutLoss(point.value, count, loss)
      if (latency !== null) lastGood = latency

      monitor.created_at.push(time)
      monitor.avg_delay.push(latency ?? lastGood)
      monitor.packet_loss!.push((loss?.ratio ?? (Number(point.value) < 0 ? 1 : 0)) * 100)
      monitor.sample_count!.push(loss?.count ?? count)
    }

    if (monitor.created_at.length > 0) monitors.push(monitor)
  }

  return monitors.sort((a, b) => a.monitor_id - b.monitor_id || a.monitor_name.localeCompare(b.monitor_name))
}

function serviceDataFromMetricSeries(seriesList: KomariMetricSeries[], tasks: KomariPingTask[], entityIds: string[]): Record<string, ServiceData> {
  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const now = Math.floor(Date.now() / HOUR_MS) * HOUR_MS
  const entitySet = new Set(entityIds)
  const lossLookup = buildPingLossLookup(seriesList)
  const taskNames = new Map(tasks.map((task) => [String(task.id), task.name || `Task ${task.id}`]))
  const accumulators = new Map<string, { up: number[]; down: number[]; delaySum: number[]; delayCount: number[] }>()

  const ensureTask = (taskId: string) => {
    let accumulator = accumulators.get(taskId)
    if (!accumulator) {
      accumulator = {
        up: new Array(30).fill(0),
        down: new Array(30).fill(0),
        delaySum: new Array(30).fill(0),
        delayCount: new Array(30).fill(0),
      }
      accumulators.set(taskId, accumulator)
    }
    return accumulator
  }

  const dayIndexFor = (time: number) => 29 - Math.floor(Math.max(0, now - time) / DAY_MS)

  for (const task of tasks) {
    if ((task.clients || []).some((entityId) => entitySet.has(entityId))) ensureTask(String(task.id))
  }

  for (const series of seriesList) {
    const taskId = metricTaskId(series)
    if (series.metric_key !== PING_LOSS_METRIC || !taskId) continue
    const accumulator = ensureTask(taskId)

    for (const point of series.points || []) {
      const time = metricPointTime(point)
      if (time === null || point.value === null || point.value === undefined) continue
      const dayIndex = dayIndexFor(time)
      if (dayIndex < 0 || dayIndex > 29) continue
      const count = metricPointCount(point)
      const lost = count * clampLossRatio(point.value)
      accumulator.up[dayIndex] += count - lost
      accumulator.down[dayIndex] += lost
    }
  }

  for (const series of seriesList) {
    const taskId = metricTaskId(series)
    if (series.metric_key !== PING_LATENCY_METRIC || !taskId) continue
    const accumulator = ensureTask(taskId)
    const lossPoints = lossLookup.get(metricSeriesKey(series))

    for (const point of series.points || []) {
      const time = metricPointTime(point)
      if (time === null || point.value === null || point.value === undefined) continue
      const dayIndex = dayIndexFor(time)
      if (dayIndex < 0 || dayIndex > 29) continue
      const count = metricPointCount(point)
      const loss = lossPoints?.get(time)

      if (!lossPoints) {
        if (Number(point.value) < 0) accumulator.down[dayIndex] += count
        else accumulator.up[dayIndex] += count
      }

      const latency = latencyWithoutLoss(point.value, count, loss)
      const validCount = loss ? count * (1 - loss.ratio) : Number(point.value) >= 0 ? count : 0
      if (latency !== null && validCount > 0) {
        accumulator.delaySum[dayIndex] += latency * validCount
        accumulator.delayCount[dayIndex] += validCount
      }
    }
  }

  const services: Record<string, ServiceData> = {}
  for (const [taskId, accumulator] of accumulators) {
    const delay = accumulator.delaySum.map((sum, index) => (accumulator.delayCount[index] > 0 ? sum / accumulator.delayCount[index] : 0))
    services[taskId] = {
      service_name: taskNames.get(taskId) || `Task ${taskId}`,
      current_up: accumulator.up[29] > 0 ? 1 : 0,
      current_down: accumulator.down[29] > 0 ? 1 : 0,
      total_up: accumulator.up.reduce((sum, value) => sum + value, 0),
      total_down: accumulator.down.reduce((sum, value) => sum + value, 0),
      delay,
      up: accumulator.up,
      down: accumulator.down,
    }
  }

  return services
}

function parseOrderedList(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean)
  if (typeof value !== "string" || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed))
      return parsed
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
  } catch {
    // fall back to delimiter parsing
  }

  return value
    .split(/[\n,，;；|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function sortGroupsByThemeOrder(groups: string[]): string[] {
  const win = typeof window === "undefined" ? {} : (window as unknown as Record<string, unknown>)
  const order = parseOrderedList(win.GroupOrder)
  const orderMap = new Map(order.map((name, index) => [name, index]))

  return [...groups].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : Number.MAX_SAFE_INTEGER
    const bi = orderMap.has(b) ? orderMap.get(b)! : Number.MAX_SAFE_INTEGER
    if (ai !== bi) return ai - bi
    return a.localeCompare(b)
  })
}

export const fetchServerGroup = async (): Promise<ServerGroupResponse> => {
  const kmNodes: Record<string, any> = await getKomariNodes()

  if (kmNodes?.error) {
    throw new Error(kmNodes.error)
  }
  // extract groups
  let groups: string[] = []
  Object.entries(kmNodes).forEach(([, value]) => {
    if (value.group && !groups.includes(value.group)) {
      groups.push(value.group)
    }
  })
  groups = sortGroupsByThemeOrder(groups)

  const data: ServerGroupResponse = {
    success: true,
    data: [
      ...groups.map((group, index) => ({
        group: {
          id: index,
          created_at: DateTime.now().toISO() || "",
          updated_at: DateTime.now().toISO() || "",
          name: group,
        },
        servers: Object.entries(kmNodes)
          .filter(([, value]) => value.group === group)
          .map(([key]) => uuidToNumber(key)),
      })),
    ],
  }
  return data
}

export const fetchLoginUser = async (): Promise<LoginUserResponse> => {
  const km_me = await SharedClient().call("common:getMe")
  if (km_me.error) {
    throw new Error(km_me.error)
  }
  const data: LoginUserResponse = {
    success: true,
    data: {
      id: uuidToNumber(km_me.uuid),
      username: km_me.username,
      password: "********",
      created_at: DateTime.now().toISO() || "",
      updated_at: DateTime.now().toISO() || "",
    },
  }
  return data
}
export const fetchMonitor = async (server_id: number, hours: number = 24): Promise<MonitorResponse> => {
  // 获取 uuid 和服务器名称
  const km_nodes: Record<string, any> = await getKomariNodes()
  if (km_nodes?.error) {
    throw new Error(km_nodes.error)
  }
  const uuid = Object.keys(km_nodes).find((id) => uuidToNumber(id) === server_id)
  if (!uuid) {
    return { success: true, data: [] }
  }
  const serverName = km_nodes[uuid]?.name || String(server_id)

  try {
    const maxPoints = hours <= 24 ? 2000 : hours <= 168 ? 3000 : 4000
    const metricData = await fetchPingMetricSeries({ entity_id: uuid, hours }, maxPoints)
    return {
      success: true,
      data: monitorDataFromMetricSeries(metricData.series, metricData.tasks, server_id, serverName),
    }
  } catch (error) {
    // Komari <= 1.2.5 does not expose the metric API.
    if (!isMetricApiUnavailable(error)) throw error
  }

  // maxCount: -1 获取全量数据，确保丢包记录不会被后端采样丢弃
  const km_monitors: any = await SharedClient().call("common:getRecords", {
    type: "ping",
    uuid: uuid,
    maxCount: -1,
    hours,
  })

  // 将 km_monitors 转换为 NezhaMonitor[]
  const seriesByTask = new Map<number, NezhaMonitor>()

  if (km_monitors && Array.isArray(km_monitors.tasks) && Array.isArray(km_monitors.records)) {
    for (const task of km_monitors.tasks) {
      seriesByTask.set(task.id, {
        monitor_id: task.id,
        monitor_name: task.name,
        server_id,
        server_name: serverName,
        created_at: [],
        avg_delay: [],
      })
    }

    for (const rec of km_monitors.records) {
      const s = seriesByTask.get(rec.task_id)
      if (!s) continue
      const ts = Date.parse(rec.time)
      if (!Number.isFinite(ts)) continue
      const val = Number(rec.value)
      if (!Number.isFinite(val)) continue
      // 保留 -1（丢包）记录，用于计算真实丢包率
      s.created_at.push(ts)
      s.avg_delay.push(val)
    }
  } else if (Array.isArray(km_monitors)) {
    // 可能是纯 records 数组 [{ task_id, time, value, name? }]
    for (const rec of km_monitors) {
      const id: number = typeof rec.task_id === "number" ? rec.task_id : 0
      const name: string = rec.name || `task_${id}`
      if (!seriesByTask.has(id)) {
        seriesByTask.set(id, {
          monitor_id: id,
          monitor_name: name,
          server_id,
          server_name: serverName,
          created_at: [],
          avg_delay: [],
        })
      }
      const s = seriesByTask.get(id)!
      const ts = Date.parse(rec.time)
      if (!Number.isFinite(ts)) continue
      const val = Number(rec.value)
      if (!Number.isFinite(val)) continue
      s.created_at.push(ts)
      s.avg_delay.push(val)
    }
  } else {
    // 未知结构，返回空
  }

  // 每个序列按时间升序，并计算真实丢包率
  const data = Array.from(seriesByTask.values()).map((s) => {
    const zip = s.created_at.map((t, i) => ({ t, v: s.avg_delay[i] }))
    zip.sort((a, b) => a.t - b.t)

    const rawVals = zip.map((z) => z.v)

    // 计算真实丢包率：单向 EMA，丢包点快速升高后自然衰减
    const rawLoss = rawVals.map((v) => (v === -1 ? 100 : 0))
    const alpha = 0.3
    const packetLoss: number[] = []
    let ema = 0
    for (let i = 0; i < rawLoss.length; i++) {
      ema = alpha * rawLoss[i] + (1 - alpha) * ema
      packetLoss.push(Number(ema.toFixed(2)))
    }

    // 对延迟数据：将 -1 替换为上一个正常值（平滑显示）
    const delays: number[] = []
    let lastGood = 0
    for (const v of rawVals) {
      if (v >= 0) {
        lastGood = v
        delays.push(v)
      } else {
        delays.push(lastGood)
      }
    }

    const timestamps = zip.map((z) => z.t)

    // 前端降采样：保留所有丢包点及邻近点，均匀抽稀正常点
    const targetPoints = hours <= 24 ? 2000 : hours <= 168 ? 3000 : 4000
    if (timestamps.length > targetPoints) {
      const keepSet = new Set<number>()
      keepSet.add(0)
      keepSet.add(timestamps.length - 1)

      // 保留所有丢包点及前后各 3 个邻近点（确保 EMA 曲线完整）
      for (let i = 0; i < rawVals.length; i++) {
        if (rawVals[i] === -1) {
          for (let j = Math.max(0, i - 3); j <= Math.min(timestamps.length - 1, i + 6); j++) {
            keepSet.add(j)
          }
        }
      }

      // 剩余配额均匀分配给正常点
      const normalTarget = targetPoints - keepSet.size
      if (normalTarget > 0) {
        const normalIndices: number[] = []
        for (let i = 0; i < timestamps.length; i++) {
          if (!keepSet.has(i)) normalIndices.push(i)
        }
        const step = Math.max(1, Math.floor(normalIndices.length / normalTarget))
        for (let i = 0; i < normalIndices.length && keepSet.size < targetPoints; i += step) {
          keepSet.add(normalIndices[i])
        }
      }

      const kept = Array.from(keepSet).sort((a, b) => a - b)
      return {
        ...s,
        created_at: kept.map((i) => timestamps[i]),
        avg_delay: kept.map((i) => delays[i]),
        packet_loss: kept.map((i) => packetLoss[i]),
      }
    }

    return {
      ...s,
      created_at: timestamps,
      avg_delay: delays,
      packet_loss: packetLoss,
    }
  })

  // 避免空的 avg_delay
  for (const s of data) {
    if (s.created_at.length === 0) {
      s.avg_delay = [0]
      s.packet_loss = [0]
      s.created_at = [Date.now()]
    }
  }

  return { success: true, data }
}
export const fetchServerUptime = async (): Promise<ServiceResponse> => {
  const kmNodes: Record<string, any> = await getKomariNodes()

  // 一次查询所有服务器的 load 记录（按 UUID 分组），用于判断服务器在线状态
  const result: any = await SharedClient().call("common:getRecords", {
    type: "load",
    load_type: "cpu",
    hours: 720,
    maxCount: -1,
  })

  const records: Record<string, any[]> = result?.records || {}
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000
  const HOUR_MS = 60 * 60 * 1000
  const todayElapsedHours = new Date().getHours() + 1

  const services: Record<string, ServiceData> = {}

  for (const [uuid, clientRecords] of Object.entries(records)) {
    const serverName = kmNodes[uuid]?.name || uuid
    const serverId = uuidToNumber(uuid)

    const up = new Array(30).fill(0)
    const down = new Array(30).fill(0)
    const delay = new Array(30).fill(0)

    for (let dayIdx = 0; dayIdx < 30; dayIdx++) {
      const dayStart = now - (30 - dayIdx) * DAY_MS
      const dayEnd = dayStart + DAY_MS

      // 统计当天每个小时是否有记录
      const hoursWithRecords = new Set<number>()
      for (const rec of clientRecords) {
        const ts = Date.parse(rec.time)
        if (ts >= dayStart && ts < dayEnd) {
          hoursWithRecords.add(Math.floor((ts - dayStart) / HOUR_MS))
        }
      }

      // 今天只算已过去的小时数
      const expectedHours = dayIdx === 29 ? todayElapsedHours : 24
      up[dayIdx] = hoursWithRecords.size
      down[dayIdx] = Math.max(0, expectedHours - hoursWithRecords.size)
    }

    services[String(serverId)] = {
      service_name: serverName,
      current_up: up[29] > 0 ? 1 : 0,
      current_down: up[29] === 0 ? 1 : 0,
      total_up: up.reduce((a, b) => a + b, 0),
      total_down: down.reduce((a, b) => a + b, 0),
      delay,
      up,
      down,
    }
  }

  // 补充没有 load 记录但存在于节点列表中的服务器（全部离线）
  for (const [uuid] of Object.entries(kmNodes)) {
    const serverId = uuidToNumber(uuid)
    if (!services[String(serverId)]) {
      services[String(serverId)] = {
        service_name: kmNodes[uuid]?.name || uuid,
        current_up: 0,
        current_down: 1,
        total_up: 0,
        total_down: 720,
        delay: new Array(30).fill(0),
        up: new Array(30).fill(0),
        down: new Array(30).fill(24),
      }
    }
  }

  return {
    success: true,
    data: { services, cycle_transfer_stats: {} },
  }
}

export const fetchService = async (): Promise<ServiceResponse> => {
  const kmNodes: Record<string, any> = await getKomariNodes()
  const uuids = Object.keys(kmNodes || {})

  if (uuids.length === 0) {
    return { success: true, data: { services: {}, cycle_transfer_stats: {} } }
  }

  try {
    const metricData = await fetchPingMetricSeries({ entity_ids: uuids, hours: 720 }, 720)
    return {
      success: true,
      data: {
        services: serviceDataFromMetricSeries(metricData.series, metricData.tasks, uuids),
        cycle_transfer_stats: {},
      },
    }
  } catch (error) {
    // Retain compatibility with Komari versions that predate public:queryMetrics.
    if (!isMetricApiUnavailable(error)) throw error
  }

  const allTasks: any[] = []
  let allRecords: any[] = []
  const seenTaskIds = new Set<number>()

  // Older backends need small sequential queries to avoid blocking the live connection.
  for (const uuid of uuids) {
    try {
      const result = await SharedClient().callViaHTTP("common:getRecords", {
        type: "ping",
        uuid,
        hours: 720,
        maxCount: 300,
      })
      const tasks: any[] = result?.tasks || []
      const records: any[] = result?.records || []
      for (const t of tasks) {
        if (!seenTaskIds.has(t.id)) {
          seenTaskIds.add(t.id)
          allTasks.push(t)
        }
      }
      allRecords = allRecords.concat(records)
    } catch {
      // 单个节点失败不影响整体
    }
  }

  const services: Record<string, ServiceData> = {}
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  for (const task of allTasks) {
    const taskId = task.id

    const up = new Array(30).fill(0)
    const down = new Array(30).fill(0)
    const delaySum = new Array(30).fill(0)
    const delayCnt = new Array(30).fill(0)

    for (const rec of allRecords) {
      if (rec.task_id !== taskId) continue
      const ts = Date.parse(rec.time)
      if (!Number.isFinite(ts)) continue
      const dayIndex = 29 - Math.floor((now - ts) / DAY_MS)
      if (dayIndex < 0 || dayIndex > 29) continue
      const val = Number(rec.value)
      if (!Number.isFinite(val)) continue
      if (val >= 0) {
        up[dayIndex]++
        delaySum[dayIndex] += val
        delayCnt[dayIndex]++
      } else {
        down[dayIndex]++
      }
    }

    const delay = delaySum.map((s, i) => (delayCnt[i] > 0 ? s / delayCnt[i] : 0))

    const totalUp = up.reduce((a, b) => a + b, 0)
    const totalDown = down.reduce((a, b) => a + b, 0)

    services[String(task.id)] = {
      service_name: task.name || `Task ${task.id}`,
      current_up: up[29] > 0 ? 1 : 0,
      current_down: down[29] > 0 ? 1 : 0,
      total_up: totalUp,
      total_down: totalDown,
      delay,
      up,
      down,
    }
  }

  return {
    success: true,
    data: { services, cycle_transfer_stats: {} },
  }
}

export const updateThemeSetting = async (key: string, value: unknown): Promise<void> => {
  const win = window as unknown as Record<string, unknown>
  const current = (win.__themeSettings as Record<string, unknown>) || {}
  const updated = { ...current, [key]: value }
  const res = await fetch(`/api/admin/theme/settings?theme=nezha`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updated),
  })
  if (!res.ok) throw new Error("Failed to update theme settings")
  // 同步本地状态
  win.__themeSettings = updated
  win[key] = value
}

export const fetchSetting = async (): Promise<SettingResponse> => {
  const publicRes = await fetch("/api/public", { credentials: "include", cache: "no-store" })
  if (publicRes.status === 401) {
    return {
      success: true,
      data: {
        config: {
          debug: false,
          language: "zh-CN",
          site_name: "Komari",
          site_desc: "",
          user_template: "",
          admin_template: "",
          custom_code: "",
        },
        private_site: true,
        version: "unknown",
      },
    }
  }
  if (!publicRes.ok) {
    throw new Error(`Failed to fetch public settings: ${publicRes.status}`)
  }
  const publicJson = await publicRes.json()
  const km_public = publicJson?.data || publicJson
  if (publicJson?.status === "error" || km_public?.error) {
    throw new Error(publicJson?.message || km_public?.error || "Failed to fetch public settings")
  }

  let privateSite = km_public.private_site === true
  if (privateSite) {
    try {
      const meRes = await fetch("/api/me", { credentials: "include", cache: "no-store" })
      const me = await meRes.json()
      if (me?.logged_in === true) privateSite = false
    } catch {
      // keep privateSite=true
    }
  }

  // Apply managed theme configuration to window.* variables
  const themeSettings = km_public.theme_settings
  if (themeSettings && typeof themeSettings === "object") {
    ;(window as unknown as Record<string, unknown>).__themeSettings = { ...themeSettings }
    for (const [key, value] of Object.entries(themeSettings)) {
      ;(window as unknown as Record<string, unknown>)[key] = value
    }
  }
  let version = "unknown"
  if (!privateSite) {
    try {
      const km_version = await SharedClient().call("common:getVersion")
      version = km_version.version || "unknown"
    } catch {
      version = "unknown"
    }
  }
  const km_data: SettingResponse = {
    success: true,
    data: {
      config: {
        debug: false,
        language: "zh-CN",
        site_name: km_public.sitename,
        site_desc: km_public.description || "",
        user_template: "",
        admin_template: "",
        custom_code: "", // km_public.custom_head 当作为主题时，Komari会自动在Head中插入该代码，留空即可
      },
      private_site: privateSite,
      version,
    },
  }
  return km_data
}
