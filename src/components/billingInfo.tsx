import { PublicNoteData, cn, formatBillingAmount, getDaysBetweenDatesWithAutoRenewal } from "@/lib/utils"
import { getBillingRemainingTone } from "@/lib/billing-status"
import { useTranslation } from "react-i18next"

import RemainPercentBar from "./RemainPercentBar"

export default function BillingInfo({
  parsedData,
  showProgress = true,
  compact = false,
}: {
  parsedData: PublicNoteData
  showProgress?: boolean
  compact?: boolean
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
    const hasPrice = billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1"
    const remainingTone = getBillingRemainingTone(daysLeftObject.days, isNeverExpire)
    const remainingLabel =
      daysLeftObject.days >= 0
        ? t("billingInfo.remainingShort", { defaultValue: t("billingInfo.remaining") })
        : t("billingInfo.expired")
    const remainingValue = isNeverExpire
      ? t("billingInfo.indefinite")
      : `${Math.abs(daysLeftObject.days)} ${t("billingInfo.days")}`

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
