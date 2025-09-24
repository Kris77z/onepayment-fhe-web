import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getJson } from "@/lib/api"

type OverviewResp = {
  available_now: number
  net_revenue: number
  payers_total: number
  revenue_growth_rate: number | null
  payers_growth_rate: number | null
  period: { from: string; to: string }
}

// 切换到会话端点，不再使用 MERCHANT_ID 常量

export function SectionCards() {
  const [data, setData] = useState<OverviewResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try{
        setLoading(true)
        const resp = await getJson<OverviewResp>(`/me/dashboard/overview?range=30d`)
        if(!cancelled) setData(resp)
      }catch(e){ if(!cancelled) setError(e instanceof Error ? e.message : String(e)) }
      finally{ if(!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const fmt = (n?: number | null, d=2) => {
    if(n === null || n === undefined || Number.isNaN(Number(n))) return '-'
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
  }
  const pct = (n?: number | null) => {
    if(n === null || n === undefined || Number.isNaN(Number(n))) return '-'
    const v = n * 100
    const pos = v >= 0
    return `${pos?'+':''}${fmt(v, 1)}%`
  }

  const available = data?.available_now ?? 0
  const revenue = data?.net_revenue ?? 0
  const payers = data?.payers_total ?? 0
  const revGrowth = data?.revenue_growth_rate ?? null
  const payersGrowth = data?.payers_growth_rate ?? null

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Available Balance</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? 'Loading...' : `$${fmt(available, 2)}`}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data ? `${data.period.from} ~ ${data.period.to}` : 'Last 30 days'}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Net Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? 'Loading...' : `$${fmt(revenue, 2)}`}
          </CardTitle>
          <div>
            <Badge variant="outline">
              {revGrowth !== null && revGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {pct(revGrowth)}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data ? `${data.period.from} ~ ${data.period.to}` : 'Last 30 days'}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Distinct Payers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? 'Loading...' : fmt(payers, 0)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Payer Growth</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pct(payersGrowth)}
          </CardTitle>
          <div>
            <Badge variant="outline">
              {payersGrowth !== null && payersGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {pct(payersGrowth)}
            </Badge>
          </div>
        </CardHeader>
      </Card>
      {error && (
        <div className="col-span-full text-xs text-red-500">{error}</div>
      )}
    </div>
  )
}
