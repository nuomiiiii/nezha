const METHOD_UNAVAILABLE = /(?:RPC Error -32601|method not found)/i
const LEGACY_PUBLIC_RPC_DENIED = /^RPC Error 401:\s*Unauthorized$/i

export function shouldFallbackToLegacyPingApi(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.trim()

  // Komari 1.1.x rejects unknown public:* methods as JSON-RPC 401.
  return METHOD_UNAVAILABLE.test(message) || LEGACY_PUBLIC_RPC_DENIED.test(message)
}

const PING_API_MODE_KEY = "nezha-ping-api-mode-v1"
const PING_API_MODE_MAX_AGE_MS = 10 * 60_000

export type PingApiMode = "metrics" | "legacy"

interface PingApiModeCache {
  mode: PingApiMode
  savedAt: number
}

type ReadableStorage = Pick<Storage, "getItem">
type WritableStorage = Pick<Storage, "setItem">

export function readPingApiMode(storage: ReadableStorage | null, now = Date.now()): PingApiMode | null {
  if (!storage) return null

  try {
    const parsed = JSON.parse(storage.getItem(PING_API_MODE_KEY) || "null") as Partial<PingApiModeCache> | null
    if (!parsed || (parsed.mode !== "metrics" && parsed.mode !== "legacy")) return null
    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return null
    if (parsed.savedAt > now + 60_000 || now - parsed.savedAt > PING_API_MODE_MAX_AGE_MS) return null
    return parsed.mode
  } catch {
    return null
  }
}

export function writePingApiMode(storage: WritableStorage | null, mode: PingApiMode, savedAt = Date.now()): void {
  if (!storage) return

  try {
    storage.setItem(PING_API_MODE_KEY, JSON.stringify({ mode, savedAt } satisfies PingApiModeCache))
  } catch {
    // Storage can be unavailable in privacy modes; feature detection still works per request.
  }
}
