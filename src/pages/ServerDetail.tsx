import { NetworkChart } from "@/components/NetworkChart"
import ServerDetailChart from "@/components/ServerDetailChart"
import ServerDetailOverview from "@/components/ServerDetailOverview"
import TabSwitch from "@/components/TabSwitch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ServerDetail() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  const tabs = ["Detail", "Network"]
  const [currentTab, setCurrentTab] = useState(tabs[0])

  const { id: server_id } = useParams()

  if (!server_id) {
    navigate("/404")
    return null
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-0 flex flex-col gap-4 server-info">
      <ServerDetailOverview server_id={server_id} />
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
          <ServerDetailChart server_id={server_id} />
        </div>
        <div
          aria-hidden={currentTab !== tabs[1]}
          data-testid="server-network-panel"
          className={cn("w-full", currentTab === tabs[1] ? "relative visible" : "pointer-events-none invisible absolute inset-x-0 top-0")}
        >
          <NetworkChart server_id={Number(server_id)} show={currentTab === tabs[1]} />
        </div>
      </div>
    </div>
  )
}
