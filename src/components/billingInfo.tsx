import { PublicNoteData, cn, formatBillingAmount, getDaysBetweenDatesWithAutoRenewal } from "@/lib/utils"
import { getBillingRemainingTone } from "@/lib/billing-status"
import { useTranslation } from "react-i18next"

import RemainPercentBar from "./RemainPercentBar"

export default function BillingInfo({
  parsedData,
  showProgress = true,
  compact = false,
  stacked = false,
  capsuleDensity = "default",
}: {
  parsedData: PublicNoteData
  showProgress?: boolean
  compact?: boolean
  stacked?: boolean
  capsuleDensity?: "default" | "dense"
}) {
  const { t } = useTranslation()
  if (!parsedData || !parsedData.billingDataMod) {
    return null
  }

  const billingData = parsedData.billingDataMod
  const billingPrice = `${formatBillingAmount(billingData.amount, billingData.currency)}/${billingData.cycle}`

  let isNeverExpire = false
  let daysLeftObject = {
    days: 0,
    cycleLabel: "",
    remainingPercentage: 0,
  }

  if (billingData.endDate) {
    if (billingData.endDate.startsWith("0000-00-00")) {
      isNeverExpire = true
    } else {
      try {
        daysLeftObject = getDaysBetweenDatesWithAutoRenewal(billingData)
      } catch (error) {
        console.error(error)
        return (
          <div className={cn("text-[10px] text-muted-foreground text-red-600")}>
            {t("billingInfo.remaining")}: {t("billingInfo.error")}
          </div>
        )
      }
    }
  }

  if (compact) {
    const capsuleTextClass = "text-[10px]"
    const capsuleGapClass = capsuleDensity === "dense" ? "gap-0.5" : "gap-1"
    const hasPrice = billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1"
    const remainingTone = getBillingRemainingTone(daysLeftObject.days, isNeverExpire)
    const remainingLabel =
      daysLeftObject.days >= 0
        ? t("billingInfo.remainingShort", { defaultValue: t("billingInfo.remaining") })
        : t("billingInfo.expired")
    const remainingValue = isNeverExpire
      ? t("billingInfo.indefinite")
      : `${Math.abs(daysLeftObject.days)} ${t("billingInfo.days")}`

    if (stacked) {
      return (
        <div
          className={cn(
            "shrink-0 rounded-full border border-border/70 bg-muted/45",
            capsuleDensity === "dense" ? "px-2.5 py-0.5" : "px-3 py-1.5",
          )}
        >
          <div
            className={cn(
              "flex justify-end whitespace-nowrap",
              capsuleDensity === "dense" ? "h-4 items-center" : "min-h-4 items-baseline",
              capsuleGapClass,
            )}
          >
            {hasPrice ? (
              <>
                <span className={cn("text-muted-foreground", capsuleTextClass)}>{t("billingInfo.price")}</span>
                <span className={cn("truncate font-semibold leading-4 text-foreground", capsuleTextClass)}>{billingPrice}</span>
              </>
            ) : billingData.amount === "-1" ? (
              <>
                <span className={cn("text-muted-foreground", capsuleTextClass)}>{t("billingInfo.price")}</span>
                <span className={cn("font-semibold leading-4 text-emerald-500 dark:text-emerald-400", capsuleTextClass)}>{t("billingInfo.free")}</span>
              </>
            ) : null}
            <span className={cn("text-border", capsuleTextClass, capsuleDensity === "dense" ? "mx-0" : "mx-0.5")}>/</span>
            <span className={cn("text-muted-foreground", capsuleTextClass)}>{remainingLabel}</span>
            <span
              className={cn(
                "truncate font-semibold leading-4",
                capsuleTextClass,
                remainingTone === "danger" ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400",
              )}
            >
              {remainingValue}
            </span>
          </div>
          {showProgress && !isNeverExpire && daysLeftObject.days >= 0 && (
            <RemainPercentBar className="mt-1" value={daysLeftObject.remainingPercentage * 100} />
          )}
        </div>
      )
    }

    return (
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {hasPrice ? (
            <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] text-muted-foreground">{t("billingInfo.price")}</span>
              <span className="text-[10px] font-normal leading-4 text-muted-foreground">{billingPrice}</span>
            </span>
          ) : billingData.amount === "-1" ? (
            <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[10px] text-muted-foreground">{t("billingInfo.price")}</span>
              <span className="text-[10px] font-normal leading-4 text-emerald-500 dark:text-emerald-400">
                {t("billingInfo.free")}
              </span>
            </span>
          ) : null}
          <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-muted-foreground">{remainingLabel}</span>
            <span
              className={cn(
                "text-[10px] font-normal leading-4",
                remainingTone === "danger"
                  ? "text-red-500 dark:text-red-400"
                  : "text-emerald-500 dark:text-emerald-400",
              )}
            >
              {remainingValue}
            </span>
          </span>
        </div>
        {showProgress && !isNeverExpire && daysLeftObject.days >= 0 && (
          <RemainPercentBar className="mt-0.5" value={daysLeftObject.remainingPercentage * 100} />
        )}
      </div>
    )
  }

  return daysLeftObject.days >= 0 ? (
    <>
      {billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1" ? (
        <p className={cn("text-[10px] text-muted-foreground ")}>
          {t("billingInfo.price")}: {billingPrice}
        </p>
      ) : billingData.amount === "-1" ? (
        <p className={cn("text-[10px] text-green-600 ")}>{t("billingInfo.free")}</p>
      ) : null}
      <div className={cn("text-[10px] text-muted-foreground")}>
        {t("billingInfo.remaining")}: {isNeverExpire ? t("billingInfo.indefinite") : daysLeftObject.days + " " + t("billingInfo.days")}
      </div>
      {showProgress && !isNeverExpire && <RemainPercentBar className="mt-0.5" value={daysLeftObject.remainingPercentage * 100} />}
    </>
  ) : (
    <>
      {billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1" ? (
        <p className={cn("text-[10px] text-muted-foreground ")}>
          {t("billingInfo.price")}: {billingPrice}
        </p>
      ) : billingData.amount === "-1" ? (
        <p className={cn("text-[10px] text-green-600 ")}>{t("billingInfo.free")}</p>
      ) : null}
      <p className={cn("text-[10px] text-muted-foreground text-red-600")}>
        {t("billingInfo.expired")}: {daysLeftObject.days * -1} {t("billingInfo.days")}
      </p>
    </>
  )
}
