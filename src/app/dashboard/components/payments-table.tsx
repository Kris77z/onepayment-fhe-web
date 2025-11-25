"use client"

import * as React from "react"
import { getJson } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconChevronLeft, IconChevronRight, IconExternalLink, IconDownload } from "@tabler/icons-react"

// Type workaround for React version conflicts
const IconChevronLeftComp = IconChevronLeft as any;
const IconChevronRightComp = IconChevronRight as any;
const IconExternalLinkComp = IconExternalLink as any;
const IconDownloadComp = IconDownload as any;
import { formatCurrency } from "@/lib/utils"

type PaymentRow = {
  id: string
  orderId: string
  chain: string
  txHash: string
  sender: string
  receiver: string
  tokenAddress: string
  amount: string
  status: string
  createdAt: string
  confirmedAt?: string | null
  order?: { tokenSymbol?: string | null; decimals?: number | null }
}

type ListResp = {
  items: PaymentRow[]
  total: number
  page: number
  pageSize: number
}

function explorerBase(chain: string): string | null {
  const c = chain.toLowerCase()
  if(c === 'bsc') return 'https://bscscan.com/tx/'
  if(c === 'ethereum') return 'https://etherscan.io/tx/'
  if(c === 'arbitrum') return 'https://arbiscan.io/tx/'
  if(c === 'polygon') return 'https://polygonscan.com/tx/'
  if(c === 'base' || c === 'base-sepolia') return 'https://sepolia.basescan.org/tx/'
  return null
}

export default function PaymentsTable(){
  const [status, setStatus] = React.useState<string>('confirmed')
  const [search, setSearch] = React.useState<string>('')
  const [page, setPage] = React.useState<number>(1)
  const [pageSize, setPageSize] = React.useState<number>(10)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [resp, setResp] = React.useState<ListResp>({ items: [], total: 0, page: 1, pageSize })
  const [exporting, setExporting] = React.useState(false)

  // Fetch payment data from backend API
  const fetchList = React.useCallback(async ()=>{
    try{
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      qs.set('page', String(page))
      qs.set('pageSize', String(pageSize))
      if(status && status !== 'all') qs.set('status', status)
      if(search.trim()) qs.set('search', search.trim())
      qs.set('range', '30d')
      qs.set('includeFees', 'true')
      const data = await getJson<ListResp>(`/me/payments?${qs.toString()}`)
      setResp(data)
    }catch(e){ 
      console.error('Failed to fetch payments:', e)
      setError(e instanceof Error ? e.message : String(e))
    }
    finally{ setLoading(false) }
  }, [page, pageSize, status, search])

  React.useEffect(() => { 
    fetchList() 
  }, [fetchList])

  const toCsv = (rows: PaymentRow[]) => {
    const header = ['time','chain','token','amount','sender','status','txHash']
    const lines = [header.join(',')]
    for(const it of rows){
      const token = it.order?.tokenSymbol || (it.status==='fee' ? 'FEE' : '')
      const sender = it.sender ? `${it.sender}` : ''
      const cols = [
        new Date(it.createdAt).toISOString(),
        it.chain,
        token,
        it.amount,
        sender,
        it.status,
        it.txHash || ''
      ]
      lines.push(cols.map(v => String(v).replace(/"/g,'""')).map(v=>`"${v}"`).join(','))
    }
    return lines.join('\n')
  }

  async function handleExport(){
    try{
      setExporting(true)
      const rows = resp?.items || []
      const csv = toCsv(rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payments_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }catch(e){ setError(e instanceof Error ? e.message : String(e)) }
    finally{ setExporting(false) }
  }

  const displayRows = resp?.items || []
  const totalPages = Math.max(1, Math.ceil((resp?.total||0) / (resp?.pageSize||pageSize)))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <Input id="search" placeholder="Search txHash / sender" value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ setPage(1); fetchList() }}} />
          </div>
          <Select value={status} onValueChange={(v: string)=>{ setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v: string)=>{ setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10,20,30,50].map(n => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={()=>{ setPage(1); fetchList() }}>Refresh</Button>
          <Button onClick={handleExport} disabled={exporting}>
            <IconDownloadComp className="h-4 w-4 mr-2" />{exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows
                .filter(row => {
                  if (status && status !== 'all' && row.status !== status) return false
                  if (search.trim()) {
                    const searchLower = search.toLowerCase()
                    return (
                      row.txHash?.toLowerCase().includes(searchLower) ||
                      row.sender?.toLowerCase().includes(searchLower)
                    )
                  }
                  return true
                })
                .slice((page - 1) * pageSize, page * pageSize)
                .map((it)=>{
                const tokenSymbol = it.order?.tokenSymbol || ''
                const linkBase = it.status === 'fee' ? null : explorerBase(it.chain)
                return (
                  <TableRow key={it.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(it.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="whitespace-nowrap">{it.chain}</TableCell>
                    <TableCell className="whitespace-nowrap">{tokenSymbol || (it.status==='fee' ? 'FEE' : '-')}</TableCell>
                    <TableCell className="whitespace-nowrap">{it.amount}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{it.sender ? `${it.sender.slice(0,6)}...${it.sender.slice(-4)}` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={it.status==='confirmed' ? 'default' : it.status==='pending' ? 'secondary' : it.status==='fee' ? 'outline' : 'destructive'}>
                        {it.status==='fee' ? 'fee' : it.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled={!linkBase || !it.txHash} onClick={()=>{
                        if(linkBase && it.txHash){ 
                          const url = `${linkBase}${it.txHash}`
                          window.open(url, '_blank') 
                        } else if(it.txHash){ window.open(it.txHash, '_blank') }
                      }}>
                        <IconExternalLinkComp className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {displayRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No Data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Total {resp?.total||0} items</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page<=1 || loading} onClick={()=> setPage(p=> Math.max(1, p-1))}>
              <IconChevronLeftComp className="h-4 w-4" />
            </Button>
            <div className="text-sm">{page} / {totalPages}</div>
            <Button variant="outline" size="icon" disabled={page>=totalPages || loading} onClick={()=> setPage(p=> Math.min(totalPages, p+1))}>
              <IconChevronRightComp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && <div className="text-xs text-muted-foreground">Loading...</div>}
        {error && <div className="text-xs text-red-500">{error}</div>}
      </CardContent>
    </Card>
  )
}
