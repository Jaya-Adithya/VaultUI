"use client";

import { useState, useEffect, useCallback } from "react";

export interface CrossOriginIsolationStatus {
  isIsolated: boolean;
  isChecking: boolean;
  error: string | null;
  diagnostics: {
    hasSharedArrayBuffer: boolean;
    hasAtomics: boolean;
    protocol: string;
    hostname: string;
    isLocalhost: boolean;
    isHttps: boolean;
    headers: {
      coep: string | null;
      coop: string | null;
    };
  };
}

const CHECK_DELAYS = [0, 100, 500, 1000]; // Progressive delays for header propagation

/**
 * Industrial-grade hook for checking cross-origin isolation status
 * 
 * Best practices implemented:
 * - Progressive checking with multiple attempts (headers may set asynchronously)
 * - Comprehensive diagnostics for debugging
 * - Clear error messages with actionable guidance
 * - Graceful handling of edge cases
 */
export function useCrossOriginIsolation(): CrossOriginIsolationStatus {
  const [status, setStatus] = useState<CrossOriginIsolationStatus>(() => {
    if (typeof window === "undefined") {
      return {
        isIsolated: false,
        isChecking: true,
        error: null,
        diagnostics: {
          hasSharedArrayBuffer: false,
          hasAtomics: false,
          protocol: "",
          hostname: "",
          isLocalhost: false,
          isHttps: false,
          headers: { coep: null, coop: null },
        },
      };
    }

    return getInitialStatus();
  });

  const checkIsolation = useCallback(() => {
    if (typeof window === "undefined") return;

    const diagnostics = getDiagnostics();
    const isIsolated = window.crossOriginIsolated === true;

    setStatus((prev) => ({
      ...prev,
      isIsolated,
      isChecking: false,
      error: isIsolated ? null : getErrorMessage(diagnostics),
      diagnostics,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Progressive checking - headers may be set asynchronously
    const timeouts: NodeJS.Timeout[] = [];

    CHECK_DELAYS.forEach((delay) => {
      const timeoutId = setTimeout(() => {
        checkIsolation();
      }, delay);
      timeouts.push(timeoutId);
    });

    // Also check when page becomes visible (in case headers were set after initial load)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkIsolation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      timeouts.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkIsolation]);

  return status;
}

function getInitialStatus(): CrossOriginIsolationStatus {
  const diagnostics = getDiagnostics();
  return {
    isIsolated: typeof window !== "undefined" && window.crossOriginIsolated === true,
    isChecking: true,
    error: null,
    diagnostics,
  };
}

function getDiagnostics() {
  if (typeof window === "undefined") {
    return {
      hasSharedArrayBuffer: false,
      hasAtomics: false,
      protocol: "",
      hostname: "",
      isLocalhost: false,
      isHttps: false,
      headers: { coep: null, coop: null },
    };
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";
  const isHttps = window.location.protocol === "https:";

  // Try to detect headers (may not always be accessible from client-side)
  let coep: string | null = null;
  let coop: string | null = null;

  // Note: Headers are not directly accessible from client-side JavaScript
  // This is a limitation - we can only check the result (crossOriginIsolated)
  // The actual header values would need to be checked server-side or via DevTools

  return {
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    hasAtomics: typeof Atomics !== "undefined",
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    isLocalhost,
    isHttps,
    headers: { coep, coop },
  };
}

function getErrorMessage(diagnostics: CrossOriginIsolationStatus["diagnostics"]): string {
  const { isLocalhost, isHttps, protocol } = diagnostics;

  if (!isLocalhost && !isHttps) {
    return `Cross-origin isolation requires HTTPS. Current protocol: ${protocol}. Please use HTTPS or localhost.`;
  }

  if (isLocalhost) {
    return "Cross-origin isolation headers (COOP/COEP) are not properly configured. Check proxy configuration and restart the dev server.";
  }

  return "Cross-origin isolation headers (COOP/COEP) are not properly configured. Verify server headers are set correctly.";
}

/**
 * Utility function to check if cross-origin isolation is available synchronously
 */
export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return window.crossOriginIsolated === true;
}

/**
 * Utility function to get diagnostic information
 */
export function getCrossOriginDiagnostics() {
  return getDiagnostics();
}


