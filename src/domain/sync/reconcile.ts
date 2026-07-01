export type SyncMeta = {
  id: string
  updatedAt: number
  deleted?: boolean
}

export type ReconcilePlan = {
  toPush: string[]
  toApply: string[]
  toDeleteLocal: string[]
}

export function reconcile(local: SyncMeta[], remote: SyncMeta[]): ReconcilePlan {
  const localById = new Map(local.map((meta) => [meta.id, meta]))
  const remoteById = new Map(remote.map((meta) => [meta.id, meta]))
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()])

  const toPush: string[] = []
  const toApply: string[] = []
  const toDeleteLocal: string[] = []

  for (const id of ids) {
    const l = localById.get(id)
    const r = remoteById.get(id)

    if (l && !r) {
      toPush.push(id)
      continue
    }
    if (!l && r) {
      // A remote-only live project arrives from another device; a remote-only
      // tombstone has nothing local to remove, so ignore it.
      if (!r.deleted) toApply.push(id)
      continue
    }
    if (l && r) {
      if (r.deleted) {
        if (r.updatedAt >= l.updatedAt) {
          toDeleteLocal.push(id)
        } else {
          toPush.push(id)
        }
      } else if (r.updatedAt > l.updatedAt) {
        toApply.push(id)
      } else if (r.updatedAt < l.updatedAt) {
        toPush.push(id)
      }
      // equal updatedAt on a live pair: already in sync, no-op
      continue
    }
  }

  const asc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return {
    toPush: toPush.sort(asc),
    toApply: toApply.sort(asc),
    toDeleteLocal: toDeleteLocal.sort(asc),
  }
}
