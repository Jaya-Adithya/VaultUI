import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebContainer requires cross-origin isolation (SharedArrayBuffer support),
  // but applying COEP/COOP globally breaks previews that load 3rd-party assets
  // (SVGs/videos/embeds) inside sandboxed iframes. Scope these headers only to
  // pages that actually boot WebContainer, and explicitly disable them for the
  // preview frame route.
  async headers() {
    return [
      {
        // Preview frame must NOT be cross-origin isolated, otherwise cross-origin
        // images/SVGs/iframes will be blocked unless the remote server opts into CORP/CORS.
        source: "/preview/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        // WebContainer is used on the component playground route.
        source: "/component/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        // Tools that might use WebContainers or need isolation
        source: "/tools/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
