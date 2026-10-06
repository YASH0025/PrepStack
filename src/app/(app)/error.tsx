"use client";

import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={
        <>
          This page could not be loaded. Your data is safe; nothing was changed.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs">Reference: {error.digest}</span>
          )}
        </>
      }
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
