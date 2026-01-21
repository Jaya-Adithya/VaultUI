/**
 * Dependency Registry
 * 
 * This registry defines how dependencies are handled in preview mode.
 * Original code is NEVER modified - this only affects preview rendering.
 * 
 * Strategy: Registry first (fast, safe) → Auto-detect fallback (flexible)
 */

export type DependencyType = "core" | "cdn" | "shim" | "unsupported";

export interface DependencyConfig {
  type: DependencyType;
  cdn?: string; // ESM CDN URL
  cdnDom?: string; // For React DOM separately
  global?: string; // Global variable name (for UMD)
  shim?: string; // Shim code for local imports
  browserSafe?: boolean; // Explicitly marked as browser-safe
  peerDependencies?: string[]; // Peer dependencies that should be loaded automatically
}

export const dependencyRegistry: Record<string, DependencyConfig> = {
  // Core React (always available)
  react: {
    type: "core",
    cdn: "https://esm.sh/react@18",
    cdnDom: "https://esm.sh/react-dom@18/client",
    browserSafe: true,
  },
  "react-dom": {
    type: "core",
    cdn: "https://esm.sh/react-dom@18/client",
    browserSafe: true,
  },

  // Third-party libraries with CDN support
  // IMPORTANT: All libraries must include deps=react@18,react-dom@18 to avoid version mismatches
  "lucide-react": {
    type: "cdn",
    cdn: "https://esm.sh/lucide-react@latest?deps=react@18,react-dom@18",
    global: "LucideIcons",
    browserSafe: true,
  },
  "styled-components": {
    type: "cdn",
    // Use bundle mode and specify React deps to avoid duplicate React instances
    cdn: "https://esm.sh/styled-components@6?bundle&deps=react@18,react-dom@18",
    global: "styled",
    browserSafe: true,
    // styled-components requires react-is as a peer dependency
    peerDependencies: ["react-is"],
  },
  "react-is": {
    type: "cdn",
    cdn: "https://esm.sh/react-is@18?deps=react@18",
    global: "ReactIs",
    browserSafe: true,
  },
  "react-day-picker": {
    type: "cdn",
    cdn: "https://esm.sh/react-day-picker@9?deps=react@18,react-dom@18",
    global: "ReactDayPicker",
    browserSafe: true,
  },
  "framer-motion": {
    type: "cdn",
    cdn: "https://esm.sh/framer-motion@latest?deps=react@18,react-dom@18",
    global: "FramerMotion",
    browserSafe: true,
  },
  "date-fns": {
    type: "cdn",
    cdn: "https://esm.sh/date-fns@2?deps=react@18,react-dom@18",
    global: "dateFns",
    browserSafe: true,
  },

  // Common local imports - shims
  "./utils": {
    type: "shim",
    shim: `
      function cn(...args) {
        return args.filter(Boolean).join(" ");
      }
    `,
    browserSafe: true,
  },
  "../utils": {
    type: "shim",
    shim: `
      function cn(...args) {
        return args.filter(Boolean).join(" ");
      }
    `,
    browserSafe: true,
  },
  "./button": {
    type: "shim",
    shim: `
      function Button(props) {
        return React.createElement("button", props, props.children);
      }
      function buttonVariants({ variant = "default" }) {
        const variants = {
          default: "px-4 py-2 bg-blue-500 text-white rounded",
          outline: "px-4 py-2 border border-gray-300 rounded",
          ghost: "px-4 py-2 hover:bg-gray-100 rounded",
        };
        return variants[variant] || variants.default;
      }
    `,
    browserSafe: true,
  },
  "../button": {
    type: "shim",
    shim: `
      function Button(props) {
        return React.createElement("button", props, props.children);
      }
      function buttonVariants({ variant = "default" }) {
        const variants = {
          default: "px-4 py-2 bg-blue-500 text-white rounded",
          outline: "px-4 py-2 border border-gray-300 rounded",
          ghost: "px-4 py-2 hover:bg-gray-100 rounded",
        };
        return variants[variant] || variants.default;
      }
    `,
    browserSafe: true,
  },
};

/**
 * Server-only packages that should NEVER be auto-loaded
 */
const SERVER_ONLY_BLOCKLIST = new Set([
  "fs",
  "path",
  "child_process",
  "crypto",
  "http",
  "https",
  "net",
  "os",
  "process",
  "buffer",
  "stream",
  "util",
  "events",
  "cluster",
  "dgram",
  "dns",
  "tls",
  "tty",
  "vm",
  "zlib",
  "next/server",
  "next/headers",
  "@prisma/client",
  "prisma",
]);

/**
 * Dangerous patterns that should be blocked
 */
const DANGEROUS_PATTERNS = [
  /^\.\./, // Relative paths going up (except shims)
  /^https?:\/\//, // URLs
  /^file:\/\//, // File URLs
  /process\./, // Process access
  /fs\./, // File system
  /child_process/, // Process spawning
];

/**
 * Extract all imports from code
 */
export function extractImports(code: string): string[] {
  const imports = new Set<string>();

  // Match: import ... from "source"
  const importRegex = /import\s+(?:.*?\s+from\s+)?["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    imports.add(match[1]);
  }

  return Array.from(imports);
}

/**
 * Validate if a package name is safe for browser auto-loading
 */
export function isBrowserSafePackage(packageName: string): boolean {
  // Block server-only packages
  if (SERVER_ONLY_BLOCKLIST.has(packageName)) {
    return false;
  }

  // Block dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(packageName)) {
      return false;
    }
  }

  // Must be a valid npm package name
  // Format: @scope/package or package
  // Allowed: lowercase, numbers, hyphens, underscores, dots, @scope/
  const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (!npmPackageRegex.test(packageName)) {
    return false;
  }

  return true;
}

/**
 * Check if a package name looks like a valid npm package
 */
export function isValidNpmPackage(name: string): boolean {
  // Skip local imports
  if (name.startsWith('./') || name.startsWith('../')) {
    return false;
  }

  // Skip React core
  if (name === "react" || name === "react-dom") {
    return false;
  }

  // Basic npm package name validation
  const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return npmPackageRegex.test(name);
}

/**
 * Generate CDN URL for an unknown npm package
 */
export function generateAutoCdnUrl(packageName: string): string {
  // Use esm.sh for auto-detection (supports most npm packages)
  // Add ?bundle to ensure we get a bundled version with dependencies
  // Add deps=react@18,react-dom@18 to ensure consistent React version
  return `https://esm.sh/${packageName}@latest?bundle&deps=react@18,react-dom@18`;
}

/**
 * Decide preview mode based on dependencies
 */
export type PreviewMode = "live" | "shimmed" | "auto" | "disabled";

export function decidePreviewMode(imports: string[]): PreviewMode {
  const unknownDeps: string[] = [];

  // Check for unsafe dependencies
  const hasUnsafeDeps = imports.some((imp) => {
    // Skip React - it's always available
    if (imp === "react" || imp === "react-dom") return false;

    // Skip local imports (handled by shims)
    if (imp.startsWith('./') || imp.startsWith('../')) return false;

    // Check if it's in registry
    if (dependencyRegistry[imp]) return false;

    // Check if it's a valid npm package (if not valid, it's unsafe)
    if (!isValidNpmPackage(imp)) return true;

    // Check if it's explicitly unsafe (server-only etc)
    if (!isBrowserSafePackage(imp)) return true;

    // Valid and safe - can auto-detect
    unknownDeps.push(imp);
    return false;
  });

  // If we have unsafe dependencies, disable preview
  if (hasUnsafeDeps) {
    return "disabled";
  }

  // If we have unknown but safe npm packages, use auto mode
  if (unknownDeps.length > 0) {
    return "auto";
  }

  // Default to live/shimmed if only known deps are present
  const hasShims = imports.some(
    (imp) => dependencyRegistry[imp]?.type === "shim"
  );

  return hasShims ? "shimmed" : "live";
}

/**
 * Get dependency config or null if unsupported
 */
export function getDependencyConfig(importPath: string): DependencyConfig | null {
  return dependencyRegistry[importPath] || null;
}

/**
 * Get list of auto-detected packages (for warnings)
 */
export function getAutoDetectedPackages(imports: string[]): string[] {
  return imports.filter((imp) => {
    if (imp === "react" || imp === "react-dom") return false;
    if (imp.startsWith('./') || imp.startsWith('../')) return false;
    if (dependencyRegistry[imp]) return false;
    return isValidNpmPackage(imp) && isBrowserSafePackage(imp);
  });
}
