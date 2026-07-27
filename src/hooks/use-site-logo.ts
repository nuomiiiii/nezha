import { DEFAULT_SITE_LOGO, normalizeSiteLogo, preloadSiteLogo } from "@/lib/site-logo"
import { useEffect, useMemo, useState } from "react"

export function useSiteLogo(): string {
  const configuredLogo = useMemo(
    () => normalizeSiteLogo((window as unknown as Record<string, unknown>).CustomLogo),
    [],
  )
  const [resolvedLogo, setResolvedLogo] = useState(DEFAULT_SITE_LOGO)

  useEffect(() => {
    let active = true
    void preloadSiteLogo(configuredLogo).then((logo) => {
      if (active) setResolvedLogo(logo)
    })

    return () => {
      active = false
    }
  }, [configuredLogo])

  return resolvedLogo
}
