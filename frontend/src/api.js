export async function api(path, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : ''
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  // No Content responses
  if (res.status === 204 || res.status === 205) return null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    // Some endpoints may return empty body with JSON content-type
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }
  if (ct.includes('application/pdf')) return res.blob()
  return res.text()
}
