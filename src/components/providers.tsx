"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"

function ThemeSync() {
  const theme = useAppStore((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") root.classList.add("dark")
    else root.classList.remove("dark")
    // color-scheme para controles nativos
    root.style.colorScheme = theme
  }, [theme])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const sessionVersion = useAppStore((s) => s.sessionVersion)
  return (
    <SessionQueryProvider key={sessionVersion}>
      <ThemeSync />
      {children}
    </SessionQueryProvider>
  )
}

// Cada sesión tiene su propio cliente: una mutación tardía de la sesión anterior
// nunca puede escribir en la caché de la nueva sesión.
function SessionQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  useEffect(() => () => {
    void client.cancelQueries()
    client.clear()
  }, [client])

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  )
}
