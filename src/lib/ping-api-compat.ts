const METHOD_UNAVAILABLE = /(?:RPC Error -32601|method not found)/i
const LEGACY_PUBLIC_RPC_DENIED = /^RPC Error 401:\s*Unauthorized$/i

export function shouldFallbackToLegacyPingApi(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.trim()

  // Komari 1.1.x rejects unknown public:* methods as JSON-RPC 401.
  return METHOD_UNAVAILABLE.test(message) || LEGACY_PUBLIC_RPC_DENIED.test(message)
}
