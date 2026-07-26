export type BillingRemainingTone = "healthy" | "danger"

export function getBillingRemainingTone(days: number, isNeverExpire = false): BillingRemainingTone {
  return !isNeverExpire && days < 14 ? "danger" : "healthy"
}
