"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useCrossOriginIsolation } from "@/lib/use-cross-origin-isolation";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IsolationStatusProps {
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  variant?: "badge" | "inline" | "minimal";
}

/**
 * Reusable component for displaying cross-origin isolation status
 * 
 * Best practices:
 * - Shows real-time status with progressive checking
 * - Provides actionable error messages
 * - Graceful degradation when isolation is unavailable
 */
export function IsolationStatus({
  className,
  showIcon = true,
  showText = true,
  variant = "badge",
}: IsolationStatusProps) {
  const status = useCrossOriginIsolation();

  if (status.isChecking && variant !== "minimal") {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        {showIcon && <Loader2 className="h-3 w-3 animate-spin" />}
        {showText && <span className="text-xs">Checking isolation...</span>}
      </div>
    );
  }

  if (status.isIsolated) {
    if (variant === "minimal") {
      return null; // Don't show anything when everything is fine
    }

    return (
      <div
        className={cn(
          "flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded text-xs border border-green-500/20",
          className
        )}
      >
        {showIcon && <CheckCircle2 className="h-3 w-3" />}
        {showText && <span className="font-medium">Isolated</span>}
      </div>
    );
  }

  // Isolation is missing
  const content = (
    <div
      className={cn(
        "flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1 rounded text-xs border border-amber-500/20",
        variant === "inline" && "bg-transparent border-none px-0 py-0",
        className
      )}
    >
      {showIcon && <AlertTriangle className="h-3 w-3" />}
      {showText && (
        <span className="font-medium">
          {variant === "inline" ? "Isolation Missing" : "Isolation Missing"}
        </span>
      )}
    </div>
  );

  if (status.error && variant !== "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md">
            <div className="space-y-2">
              <p className="font-semibold">Cross-Origin Isolation Required</p>
              <p className="text-sm">{status.error}</p>
              <div className="text-xs text-muted-foreground mt-2">
                <p>Diagnostics:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Protocol: {status.diagnostics.protocol}</li>
                  <li>Hostname: {status.diagnostics.hostname}</li>
                  <li>SharedArrayBuffer: {status.diagnostics.hasSharedArrayBuffer ? "Available" : "Unavailable"}</li>
                </ul>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}


