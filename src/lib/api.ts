import { useAppStore } from "@/lib/store"

const BASE = "/api"

type FetchOpts = RequestInit & {
  auth?: boolean // include bearer token (default true)
}

let refreshing: Promise<boolean> | null = null

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = opts
  const token = auth ? useAppStore.getState().token : null

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  }
  if (auth && token) finalHeaders["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...rest, headers: finalHeaders })
  const text = await res.text()

  // 204 o vacío
  if (res.status === 204 || !text) {
    if (!res.ok) throw new ApiError("Error " + res.status, res.status)
    return undefined as T
  }

  let data: unknown = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!res.ok) {
    if (res.status === 401 && auth && !path.startsWith("/auth/")) {
      // sesión expirada: desloguear y forzar login
      useAppStore.getState().logout()
      throw new ApiError("Sesión expirada", 401, data)
    }
    const msg =
      (data && typeof data === "object" && "error" in data && String((data as { error: unknown }).error)) ||
      (data && typeof data === "object" && "message" in data && String((data as { message: unknown }).message)) ||
      `Error ${res.status}`
    throw new ApiError(msg, res.status, data)
  }
  return data as T
}

// Helper para subir archivos (FormData)
export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = useAppStore.getState().token
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && String((data as { error: unknown }).error)) ||
      `Error ${res.status}`
    throw new ApiError(msg, res.status, data)
  }
  return data as T
}

// Helper para descargar blobs (exportación)
export async function apiDownload(path: string, filename: string) {
  const token = useAppStore.getState().token
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const t = await res.text().catch(() => "")
    throw new ApiError(t || `Error ${res.status}`, res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export { refreshing }
