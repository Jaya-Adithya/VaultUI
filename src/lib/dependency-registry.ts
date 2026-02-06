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

  // Vue
  "vue": {
    type: "cdn",
    cdn: "https://esm.sh/vue@3/dist/vue.esm-browser.js",
    global: "Vue",
    browserSafe: true,
  },
  "@vueuse/core": {
    type: "cdn",
    cdn: "https://esm.sh/@vueuse/core@latest?deps=vue@3",
    global: "VueUse",
    browserSafe: true,
    peerDependencies: ["vue"],
  },
  "@vueuse/components": {
    type: "cdn",
    cdn: "https://esm.sh/@vueuse/components@latest?deps=vue@3,@vueuse/core@latest",
    global: "VueUseComponents",
    browserSafe: true,
    peerDependencies: ["vue", "@vueuse/core"],
  },

  // Three.js and React Three Fiber
  "three": {
    type: "cdn",
    cdn: "https://esm.sh/three@0.160.0",
    global: "THREE",
    browserSafe: true,
  },
  "@react-three/fiber": {
    type: "cdn",
    cdn: "https://esm.sh/@react-three/fiber@8?deps=three@0.160.0,react@18,react-dom@18",
    browserSafe: true,
    peerDependencies: ["three", "react", "react-dom"],
  },
  "@react-three/drei": {
    type: "cdn",
    cdn: "https://esm.sh/@react-three/drei@9?deps=three@0.160.0,react@18,react-dom@18,@react-three/fiber@8",
    browserSafe: true,
    peerDependencies: ["three", "react", "react-dom", "@react-three/fiber"],
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
  // Note: "next/image" is NOT in blocklist - it's a component, not server-only code
  // We'll handle it specially in the preview runtime
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

  // Skip subpath imports (e.g., "gsap/ScrollTrigger", "next/image")
  // These are not separate packages, they're subpaths of existing packages
  if (name.includes('/') && !name.startsWith('@')) {
    // Regular package with subpath (e.g., "gsap/ScrollTrigger")
    const basePackage = name.split('/')[0];
    // Only validate the base package part
    const npmPackageRegex = /^[a-z0-9-~][a-z0-9-._~]*$/;
    const isValidBase = npmPackageRegex.test(basePackage);

    return isValidBase;
  }

  // Basic npm package name validation
  const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  const isValid = npmPackageRegex.test(name);

  return isValid;
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
  const unsafeDeps: string[] = [];
  const skippedDeps: string[] = [];

  // Check for unsafe dependencies
  const hasUnsafeDeps = imports.some((imp) => {
    // Skip React - it's always available
    if (imp === "react" || imp === "react-dom") {
      skippedDeps.push(`${imp} (core)`);
      return false;
    }

    // Skip local imports (handled by shims/CSS modules)
    if (imp.startsWith('./') || imp.startsWith('../')) {
      skippedDeps.push(`${imp} (local)`);
      return false;
    }

    // Skip subpath imports (e.g., "gsap/ScrollTrigger", "next/image")
    // These are handled specially in the preview runtime, not as separate packages
    if (imp.includes('/') && !imp.startsWith('@')) {
      const basePackage = imp.split('/')[0];
      // Check if base package is in blocklist (e.g., "next/server" -> block "next")
      if (SERVER_ONLY_BLOCKLIST.has(basePackage)) {
        unsafeDeps.push(imp);
        return true;
      }
      // Allow subpath imports from non-blocked packages (e.g., "gsap/ScrollTrigger", "next/image")
      skippedDeps.push(`${imp} (subpath)`);
      return false;
    }

    // Check if it's in registry
    if (dependencyRegistry[imp]) {
      skippedDeps.push(`${imp} (registry)`);
      return false;
    }

    // Check if it's explicitly unsafe (server-only etc) - ONLY block these
    if (!isBrowserSafePackage(imp)) {
      unsafeDeps.push(imp);
      return true;
    }

    // For any valid npm package, allow auto-detection (more permissive)
    if (isValidNpmPackage(imp)) {
      unknownDeps.push(imp);
      return false; // Allow auto-detection
    }

    // If it's not a valid npm package and not explicitly blocked, still allow it
    // (might be a subpath import or something we can handle)
    return false;
  });

  // Only disable if we have explicitly unsafe dependencies (server-only packages)
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

  const mode = hasShims ? "shimmed" : "live";
  return mode;
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
