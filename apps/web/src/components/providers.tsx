"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Client-side provider shell. Wraps the whole app so every page can use
 * TanStack Query hooks. The QueryClient is created once per browser session
 * via useState (not at module scope) so it isn't shared across SSR requests.
 *
 * Wave 2/4 agents may add a <ToastProvider> here — leave room for it.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
