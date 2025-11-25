export const API_BASE = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000').replace(/\/$/, '')
const ENV_API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

function getEffectiveApiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      const s = sessionStorage.getItem('onepay_override_api_key')
      if (s && s.trim()) return s.trim()
    } catch {}
  }
  return ENV_API_KEY
}

// 为 window 增加类型（必须在模块顶层声明）
declare global {
  interface Window { __onepay_api_logged?: boolean }
}

// Debug: log env once in browser (masked key)
(function debugLogEnv(){
  if (typeof window !== 'undefined' && !window.__onepay_api_logged) {
    const k = getEffectiveApiKey()
    const masked = k ? `${k.slice(0,4)}…${k.slice(-4)}` : '<empty>'
    console.info('[PayAgent][api] BASE=%s KEY=%s', API_BASE || '<empty>', masked)
    window.__onepay_api_logged = true
  }
})()

type Json = Record<string, unknown>

function maskKey(k?: string){ return k ? `${k.slice(0,4)}…${k.slice(-4)}` : '<empty>' }

function buildUrl(path: string, key: string): string {
  const base = `${API_BASE}${path}`
  try{
    const u = new URL(base)
    // 对 /me 与 /me/* 以及 /auth/* 端点不附加 api_key（避免泄露在 URL）
    const skipKey = path.startsWith('/me') || path.startsWith('/auth/')
    if (!skipKey && key && !u.searchParams.has('api_key')) u.searchParams.set('api_key', key)
    return u.toString()
  }catch{
    // relative or invalid URL, fallback简单拼接
    const sep = base.includes('?') ? '&' : '?'
    const skipKey = path.startsWith('/me') || path.startsWith('/auth/')
    return (!skipKey && key) ? `${base}${sep}api_key=${encodeURIComponent(key)}` : base
  }
}

export async function postJson<T = unknown>(path: string, body: Json, init?: RequestInit): Promise<T> {
  const effKey = getEffectiveApiKey()
  const url = buildUrl(path, effKey)
  // 临时：始终携带 X-API-Key 以兼容代理导致的 Cookie 丢失（生产可恢复为仅会话）
  const baseHeaders: Record<string,string> = { 'Content-Type': 'application/json', ...(effKey ? { 'X-API-Key': effKey } : {}) }
  const headers = { ...baseHeaders, ...(init?.headers as Record<string,string> | undefined) }
  // Debug fetch
  if (typeof window !== 'undefined') {
    const usingKey = headers['X-API-Key']
    console.debug('[PayAgent][POST] %s key=%s', url, maskKey(usingKey))
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
    console.warn('[PayAgent][POST][%s] %s -> %s', res.status, url, JSON.stringify(err))
    throw Object.assign(new Error('RequestFailed'), { status: res.status, data: err })
  }
  try { return await res.json() as T } catch { return {} as T }
}

export async function getJson<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const effKey = getEffectiveApiKey()
  const url = buildUrl(path, effKey)
  // 临时：始终携带 X-API-Key 以兼容代理导致的 Cookie 丢失（生产可恢复为仅会话）
  const baseHeaders: Record<string,string> = { ...(effKey ? { 'X-API-Key': effKey } : {}) }
  const headers = { ...baseHeaders, ...(init?.headers as Record<string,string> | undefined) }
  if (typeof window !== 'undefined') {
    const usingKey = headers['X-API-Key']
    console.debug('[PayAgent][GET] %s key=%s', url, maskKey(usingKey))
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
    console.warn('[PayAgent][GET][%s] %s -> %s', res.status, url, JSON.stringify(err))
    throw Object.assign(new Error('RequestFailed'), { status: res.status, data: err })
  }
  try { return await res.json() as T } catch { return {} as T }
}
