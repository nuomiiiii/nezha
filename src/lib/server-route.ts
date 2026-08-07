const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NUMERIC_ID_PATTERN = /^\d+$/

export const uuidToNumber = (uuid: string): number => {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const charCode = uuid.charCodeAt(i)
    hash = charCode + ((hash << 5) - hash)
  }
  return hash >>> 0
}

export function resolveServerRouteId(routeId: string): number | null {
  const normalized = routeId.trim()

  if (NUMERIC_ID_PATTERN.test(normalized)) {
    const numericId = Number(normalized)
    return Number.isSafeInteger(numericId) ? numericId : null
  }

  if (!UUID_PATTERN.test(normalized)) return null
  return uuidToNumber(normalized.toLowerCase())
}

export function parsePingTaskId(value: string | null): number | undefined {
  if (!value || !NUMERIC_ID_PATTERN.test(value)) return undefined

  const taskId = Number(value)
  return Number.isSafeInteger(taskId) && taskId > 0 ? taskId : undefined
}
