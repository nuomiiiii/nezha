export const DEFAULT_SITE_LOGO = "/favicon.ico"
const LEGACY_DEFAULT_SITE_LOGO = "/apple-touch-icon.png"

interface PreloadableImage {
  onload: ((...args: never[]) => unknown) | null
  onerror: ((...args: never[]) => unknown) | null
  src: string
}

export function normalizeSiteLogo(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SITE_LOGO
  const trimmed = value.trim()
  return !trimmed || trimmed === LEGACY_DEFAULT_SITE_LOGO ? DEFAULT_SITE_LOGO : trimmed
}

export function preloadSiteLogo(
  value: unknown,
  createImage: () => PreloadableImage = () => new Image(),
): Promise<string> {
  const configuredLogo = normalizeSiteLogo(value)
  if (configuredLogo === DEFAULT_SITE_LOGO) return Promise.resolve(DEFAULT_SITE_LOGO)

  return new Promise((resolve) => {
    const image = createImage()
    image.onload = () => resolve(configuredLogo)
    image.onerror = () => resolve(DEFAULT_SITE_LOGO)
    image.src = configuredLogo
  })
}
