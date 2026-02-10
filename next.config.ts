import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: swcMinify was removed in Next.js 13+ and is no longer a valid option.
  // Next.js always uses SWC for minification now, so we omit this flag.
  // Enable experimental features for faster builds
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'framer-motion',
    ],
  },

  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  // Empty config silences the warning - Turbopack handles optimizations automatically
  turbopack: {},

  // Webpack configuration (fallback when using --webpack flag)
  webpack: (config, { dev, isServer }) => {
    // Faster builds in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // Exclude Monaco Editor from server-side bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@monaco-editor/react': 'commonjs @monaco-editor/react',
        'monaco-editor': 'commonjs monaco-editor',
      });
    }

    return config;
  },

  // Cross-origin isolation headers are now handled via the proxy
  // convention in Next.js 16. Keep this empty unless you have very specific
  // per-route header needs that cannot be expressed via proxy.
};

export default nextConfig;
