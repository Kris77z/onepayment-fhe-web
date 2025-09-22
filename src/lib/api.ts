export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

// Debug: log env once in browser (masked key)
(function debugLogEnv(){
  if (typeof window !== 'undefined' && !(window as any).__onepay_api_logged) {
    const masked = API_KEY ? `${API_KEY.slice(0,4)}…${API_KEY.slice(-4)}` : '<empty>'
    console.info('[OnePay][api] BASE=%s KEY=%s', API_BASE || '<empty>', masked)
    ;(window as any).__onepay_api_logged = true
  }
})()

type Json = Record<string, unknown>

function maskKey(k?: string){ return k ? `${k.slice(0,4)}…${k.slice(-4)}` : '<empty>' }

export async function postJson<T = unknown>(path: string, body: Json, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const baseHeaders: Record<string,string> = { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) }
  const headers = { ...baseHeaders, ...(init?.headers as Record<string,string> | undefined) }
  // Debug fetch
  if (typeof window !== 'undefined') {
    const usingKey = headers['X-API-Key']
    console.debug('[OnePay][POST] %s key=%s', url, maskKey(usingKey))
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
    ...init,
  })
  if (!res.ok) {
    let err: unknown
    try { err = await res.json() } catch { err = { error: res.statusText } }
    console.warn('[OnePay][POST][%s] %s -> %s', res.status, url, JSON.stringify(err))
    throw Object.assign(new Error('RequestFailed'), { status: res.status, data: err })
  }
  try { return await res.json() as T } catch { return {} as T }
}

export async function getJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const baseHeaders: Record<string,string> = { ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) }
  const headers = { ...baseHeaders, ...(init?.headers as Record<string,string> | undefined) }
  if (typeof window !== 'undefined') {
    const usingKey = headers['X-API-Key']
    console.debug('[OnePay][GET] %s key=%s', url, maskKey(usingKey))
  }
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
    ...init,
  })
  if (!res.ok) {
    let err: unknown
    try { err = await res.json() } catch { err = { error: res.statusText } }
    console.warn('[OnePay][GET][%s] %s -> %s', res.status, url, JSON.stringify(err))
    throw Object.assign(new Error('RequestFailed'), { status: res.status, data: err })
  }
  try { return await res.json() as T } catch { return {} as T }
}


