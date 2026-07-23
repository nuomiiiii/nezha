import assert from "node:assert/strict"
import test from "node:test"

import { orderMonitorsByPingTasks } from "../src/lib/ping-task-order.ts"

test("uses the draggable backend ping task order on the large-screen chart", () => {
  const tasks = [{ id: 31 }, { id: 8 }, { id: 22 }]
  const monitors = [
    { monitor_id: 8, monitor_name: "Second" },
    { monitor_id: 22, monitor_name: "Third" },
    { monitor_id: 31, monitor_name: "First" },
  ]

  assert.deepEqual(
    orderMonitorsByPingTasks(monitors, tasks).map((monitor) => monitor.monitor_id),
    [31, 8, 22],
  )
})
