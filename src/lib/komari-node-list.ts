export type KomariNodeMap = Record<string, any>
export type KomariStatusMap = Record<string, any>

export type KomariServerEntry = {
  uuid: string
  node: any
  status: any | undefined
}

export function listKomariNodes(nodes: KomariNodeMap | any[] | null | undefined): any[] {
  if (!nodes) return []
  return Array.isArray(nodes) ? nodes : Object.values(nodes)
}

export function leftoverStatusUuids(nodeUuids: Iterable<string>, status: KomariStatusMap | null | undefined): string[] {
  const known = new Set(nodeUuids)
  return Object.keys(status || {}).filter((uuid) => !known.has(uuid))
}

export function isKomariServerOnline(status: any | undefined): boolean {
  return status?.online === true
}

// 首页卡片以 common:getNodes 为清单。getNodesLatestStatus 只提供实时指标和在线标记。
// 状态接口没有某台机器时标离线，不能当成已删除；状态里多出来、节点表没有的 UUID 也不渲染，避免幽灵卡片。
export function resolveKomariServerEntries(
  nodes: KomariNodeMap | any[] | null | undefined,
  status: KomariStatusMap | null | undefined,
): KomariServerEntry[] {
  const statusMap = status && typeof status === "object" && !Array.isArray(status) ? status : {}
  return listKomariNodes(nodes)
    .filter((node) => node && typeof node.uuid === "string" && node.uuid)
    .map((node) => ({
      uuid: node.uuid as string,
      node,
      status: Object.prototype.hasOwnProperty.call(statusMap, node.uuid) ? statusMap[node.uuid] : undefined,
    }))
}
