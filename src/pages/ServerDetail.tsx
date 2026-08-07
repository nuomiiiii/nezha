import { NetworkChart } from "@/components/NetworkChart"
import ServerDetailChart from "@/components/ServerDetailChart"
import ServerDetailOverview from "@/components/ServerDetailOverview"
import TabSwitch from "@/components/TabSwitch"
import { Separator } from "@/components/ui/separator"
import { isNetworkView, parsePingTaskId, resolveServerRouteId } from "@/lib/server-route"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Navigate, useParams, useSearchParams } from "react-router-dom"

const tabs = ["Detail", "Network"]

export default function ServerDetail() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  const { id: routeId } = useParams()
  const [searchParams] = useSearchParams()
  const pingTaskId = parsePingTaskId(searchParams.get("ping_task"))
  const openNetworkView = isNetworkView(searchParams.get("view")) || pingTaskId !== undefined
  const serverId = routeId ? resolveServerRouteId(routeId) : null
  const [currentTab, setCurrentTab] = useState(openNetworkView ? tabs[1] : tabs[0])

  useEffect(() => {
    setCurrentTab(openNetworkView ? tabs[1] : tabs[0])
  }, [openNetworkView, routeId])

  if (serverId === null) return <Navigate to="/404" replace />

  return (
    <div className="mx-auto w-full max-w-5xl px-0 flex flex-col gap-4 server-info">
      <ServerDetailOverview server_id={serverId} />
      <section className="flex items-center my-2 w-full">
        <Separator className="flex-1" />
        <div className="flex justify-center w-full max-w-[200px]">
          <TabSwitch tabs={tabs} currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </div>
        <Separator className="flex-1" />
      </section>
      <div className="relative w-full">
        <div
          aria-hidden={currentTab !== tabs[0]}
          data-testid="server-detail-panel"
          className={cn("w-full", currentTab === tabs[0] ? "relative visible" : "pointer-events-none invisible absolute inset-x-0 top-0")}
        >
          <ServerDetailChart server_id={serverId} />
        </div>
        <div
          aria-hidden={currentTab !== tabs[1]}
          data-testid="server-network-panel"
          className={cn("w-full", currentTab === tabs[1] ? "relative visible" : "pointer-events-none invisible absolute inset-x-0 top-0")}
        >
          <NetworkChart server_id={serverId} show={currentTab === tabs[1]} initialMonitorId={pingTaskId} />
        </div>
      </div>
    </div>
  )
}
