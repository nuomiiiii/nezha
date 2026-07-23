const STATIC_CURRENCY_LABELS: Record<string, string> = {
  JPY: "JPY ",
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  HKD: "HK$",
  TWD: "NT$",
  KRW: "KRW ",
  SGD: "S$",
  CAD: "C$",
  AUD: "A$",
  $: "$",
  "\u20ac": "\u20ac",
  "\u00a3": "\u00a3",
  "\u00a5": "\u00a5",
  "\uffe5": "\uffe5",
}

export function getStaticCurrencyLabel(currency: string): string | undefined {
  return STATIC_CURRENCY_LABELS[currency]
}

export function detectCanadianDollarCurrency(amount: string): "CAD" | undefined {
  const value = String(amount || "").trim()
  return /^(?:CAD|CA\$|C\$)\s*/i.test(value) || /\s*(?:CAD|CA\$|C\$)$/i.test(value) ? "CAD" : undefined
}
