export type PingTaskOrderEntry = {
  id: number | string
}

export type PingMonitorOrderEntry = {
  monitor_id: number
  monitor_name: string
}

export function orderMonitorsByPingTasks<T extends PingMonitorOrderEntry>(
  monitors: T[],
  tasks: PingTaskOrderEntry[],
): T[] {
  const taskOrder = new Map(tasks.map((task, index) => [String(task.id), index]))

  return [...monitors].sort((left, right) => {
    const leftOrder = taskOrder.get(String(left.monitor_id)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = taskOrder.get(String(right.monitor_id)) ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder

    return left.monitor_id - right.monitor_id || left.monitor_name.localeCompare(right.monitor_name)
  })
}
