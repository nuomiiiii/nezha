import { SharedClient } from "@/hooks/use-rpc2"
import { getKomariNodes, komariToNezhaWebsocketResponse } from "@/lib/utils"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { WebSocketContext, WebSocketContextType } from "./websocket-context"

interface WebSocketProviderProps {
  url: string
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [lastMessage, setLastMessage] = useState<{ data: string } | null>(null)
  const [messageHistory, setMessageHistory] = useState<{ data: string }[]>([])
  const [connected, setConnected] = useState(false)
  const [needReconnect, setNeedReconnect] = useState(false)
  const activeRef = useRef(false)
  const requestRunningRef = useRef(false)

  const updateData = useCallback(async () => {
    if (requestRunningRef.current) return
    requestRunningRef.current = true

    try {
      const rpc2 = SharedClient()
      const [nodes, status] = await Promise.all([getKomariNodes(true), rpc2.call("common:getNodesLatestStatus")])
      if (!activeRef.current) return

      const message = { data: JSON.stringify(komariToNezhaWebsocketResponse(status, nodes)) }
      setLastMessage(message)
      setMessageHistory((previous) => [message, ...previous].slice(0, 30))
      setConnected(true)
    } catch (error) {
      console.warn("加载服务器状态失败，等待下一轮：", error instanceof Error ? error.message : error)
    } finally {
      requestRunningRef.current = false
    }
  }, [])

  useEffect(() => {
    activeRef.current = true
    void updateData()

    const intervalId = window.setInterval(() => {
      void updateData()
    }, 2000)

    return () => {
      activeRef.current = false
      window.clearInterval(intervalId)
    }
  }, [updateData])

  const reconnect = useCallback(() => {
    void updateData()
  }, [updateData])

  const contextValue: WebSocketContextType = {
    lastMessage,
    connected,
    messageHistory,
    reconnect,
    needReconnect,
    setNeedReconnect,
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}
