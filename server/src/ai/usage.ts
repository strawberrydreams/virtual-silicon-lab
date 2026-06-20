import type Database from 'better-sqlite3'

export type AiUsageSummary = {
  since: number
  until: number
  totalCalls: number
  distinctUsers: number
  byKind: Record<string, number>
}

/** Aggregates ai_prompt_log over the inclusive owner-selected time window. */
export function summarizeAiUsage(
  db: Database.Database,
  window: { since: number; until: number },
): AiUsageSummary {
  const { since, until } = window
  const totals = db
    .prepare(
      'SELECT COUNT(*) AS n, COUNT(DISTINCT user_id) AS u FROM ai_prompt_log WHERE created_at >= ? AND created_at <= ?',
    )
    .get(since, until) as { n: number; u: number }
  const rows = db
    .prepare(
      'SELECT kind, COUNT(*) AS n FROM ai_prompt_log WHERE created_at >= ? AND created_at <= ? GROUP BY kind',
    )
    .all(since, until) as { kind: string; n: number }[]
  const byKind: Record<string, number> = {}
  for (const row of rows) byKind[row.kind] = row.n
  return {
    since,
    until,
    totalCalls: totals.n,
    distinctUsers: totals.u,
    byKind,
  }
}
