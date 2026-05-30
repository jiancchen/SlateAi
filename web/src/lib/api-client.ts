const DEFAULT_API_TIMEOUT_MS = 1200

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL?.trim()

export const isPublicStaticMode = () => import.meta.env.PROD && !configuredApiBaseUrl()

export const getApiBaseUrl = () => {
  const configured = configuredApiBaseUrl()
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return 'http://127.0.0.1:8787'
    }

    if (import.meta.env.DEV) {
      return window.location.origin
    }
  }

  return null
}

export const fetchJsonWithTimeout = async <T>(url: string, timeoutMs = DEFAULT_API_TIMEOUT_MS): Promise<T> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}
