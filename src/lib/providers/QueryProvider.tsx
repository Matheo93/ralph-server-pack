"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import {
  ToastProvider,
  ToastHandlerSync,
} from "@/components/custom/toast-notifications"

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            // Cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus in development
            refetchOnWindowFocus: process.env.NODE_ENV === "production",
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider position="bottom-right" maxToasts={5}>
        <ToastHandlerSync />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  )
}
