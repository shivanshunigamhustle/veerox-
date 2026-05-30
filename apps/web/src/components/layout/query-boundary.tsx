import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  /** True when the request succeeded but returned no rows. */
  isEmpty?: boolean;
  /** Refetch callback wired to the error-state Retry button. */
  onRetry?: () => void;
  /** Shown while loading — pass a skeleton (e.g. <SkeletonRows/>). Defaults to a generic block. */
  loadingFallback?: ReactNode;
  /** Shown when isEmpty — pass an <EmptyState/>. */
  emptyFallback?: ReactNode;
  children: ReactNode;
}

/**
 * The standard load/empty/error/success wrapper every list + detail view uses
 * (UI plan §7.4). Keeps the four states visually consistent across pages
 * instead of each page hand-rolling them.
 */
export function QueryBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loadingFallback,
  emptyFallback,
  children,
}: QueryBoundaryProps) {
  if (isLoading) {
    return <>{loadingFallback ?? <div className="h-40 animate-pulse rounded-2xl bg-white" />}</>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <span className="flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          {error?.message ?? "Something went wrong loading this data."}
        </span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return <>{children}</>;
}
