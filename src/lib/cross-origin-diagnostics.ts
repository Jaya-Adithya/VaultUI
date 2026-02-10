/**
 * Cross-Origin Isolation Diagnostics Utility
 * 
 * Provides server-side and client-side utilities for diagnosing
 * cross-origin isolation configuration issues.
 */

export interface IsolationDiagnostics {
  client: {
    crossOriginIsolated: boolean;
    hasSharedArrayBuffer: boolean;
    hasAtomics: boolean;
    protocol: string;
    hostname: string;
    userAgent: string;
  };
  recommendations: string[];
}

/**
 * Get client-side diagnostics
 * Call this from the browser console or client-side code
 */
export function getClientDiagnostics(): IsolationDiagnostics["client"] {
  if (typeof window === "undefined") {
    return {
      crossOriginIsolated: false,
      hasSharedArrayBuffer: false,
      hasAtomics: false,
      protocol: "",
      hostname: "",
      userAgent: "",
    };
  }

  return {
    crossOriginIsolated: window.crossOriginIsolated === true,
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    hasAtomics: typeof Atomics !== "undefined",
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    userAgent: navigator.userAgent,
  };
}

/**
 * Generate recommendations based on diagnostics
 */
export function getRecommendations(diagnostics: IsolationDiagnostics["client"]): string[] {
  const recommendations: string[] = [];

  if (!diagnostics.crossOriginIsolated) {
    recommendations.push("Cross-origin isolation is not enabled");

    if (diagnostics.protocol !== "https:" && !isLocalhost(diagnostics.hostname)) {
      recommendations.push("Use HTTPS or localhost (cross-origin isolation requires HTTPS in production)");
    }

    if (!diagnostics.hasSharedArrayBuffer) {
      recommendations.push("SharedArrayBuffer is not available - this indicates missing COOP/COEP headers");
    }

    recommendations.push("Verify proxy.ts is setting COOP/COEP headers correctly");
    recommendations.push("Check browser DevTools → Network → Response Headers for 'Cross-Origin-Embedder-Policy' and 'Cross-Origin-Opener-Policy'");
    recommendations.push("Try restarting the dev server if in development");
    recommendations.push("Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)");
  }

  return recommendations;
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.startsWith("localhost:")
  );
}

/**
 * Print comprehensive diagnostics to console
 * Useful for debugging in browser console
 */
export function printDiagnostics(): void {
  const client = getClientDiagnostics();
  const recommendations = getRecommendations(client);

  console.group("🔍 Cross-Origin Isolation Diagnostics");
  console.log("Client Status:", client);
  console.log("Recommendations:", recommendations);
  
  if (client.crossOriginIsolated) {
    console.log("✅ Cross-origin isolation is enabled");
  } else {
    console.warn("❌ Cross-origin isolation is NOT enabled");
    console.info("This is required for WebContainer and SharedArrayBuffer features");
  }
  
  console.groupEnd();
}

/**
 * Validate headers from a Response object (server-side)
 */
export function validateHeaders(headers: Headers): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  let valid = true;

  const coep = headers.get("Cross-Origin-Embedder-Policy");
  const coop = headers.get("Cross-Origin-Opener-Policy");

  if (!coep) {
    issues.push("Missing 'Cross-Origin-Embedder-Policy' header");
    valid = false;
  } else if (coep !== "require-corp" && coep !== "credentialless") {
    issues.push(`Invalid 'Cross-Origin-Embedder-Policy' value: ${coep}. Expected 'require-corp' or 'credentialless'`);
    valid = false;
  }

  if (!coop) {
    issues.push("Missing 'Cross-Origin-Opener-Policy' header");
    valid = false;
  } else if (coop !== "same-origin" && coop !== "unsafe-none") {
    issues.push(`Invalid 'Cross-Origin-Opener-Policy' value: ${coop}. Expected 'same-origin' or 'unsafe-none'`);
    valid = false;
  }

  // For WebContainer, we need require-corp + same-origin
  if (coep === "require-corp" && coop !== "same-origin") {
    issues.push("For WebContainer, use 'require-corp' with 'same-origin' (not 'unsafe-none')");
    valid = false;
  }

  return { valid, issues };
}


