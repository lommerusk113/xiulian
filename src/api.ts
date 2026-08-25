const TOKEN = 'xiulian.token'

export const getToken = () => localStorage.getItem(TOKEN)
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN))

/** JSON call to the backend. Throws on non-2xx; a 401 with a stored token means it expired → back to login. */
export async function api<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch('/api' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && token) {
    setToken(null)
    location.hash = '#/login'
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.message ?? `${res.status} ${res.statusText}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}
