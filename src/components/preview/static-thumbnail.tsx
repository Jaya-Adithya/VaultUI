"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/detect-framework";
import { generatePreviewRuntime } from "@/lib/preview-runtime-generator";

interface FileData {
  filename: string;
  language: string;
  code: string;
}

interface StaticThumbnailProps {
  files: FileData[];
  framework: Framework;
  className?: string;
}

function generateHtmlDocument(files: FileData[], framework: Framework): string {
  const baseStyles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #root-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    #root {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }
  `;

  // Optimized scale script - debounced and throttled
  const scaleScript = `
    <script>
      (function() {
        const wrapper = document.getElementById('root-wrapper');
        const root = document.getElementById('root');
        let rafId = null;
        let timeoutId = null;
        let hasScaled = false;

        function updateScale() {
          if (!wrapper || !root || hasScaled) return;

          const containerWidth = wrapper.clientWidth;
          const containerHeight = wrapper.clientHeight;

          if (containerWidth === 0 || containerHeight === 0) {
            timeoutId = setTimeout(updateScale, 100);
            return;
          }

          // Reset for measurement - position absolute to not constrain by container
          root.style.transform = 'none';
          root.style.position = 'absolute';
          root.style.width = 'max-content';
          root.style.height = 'max-content';
          root.style.maxWidth = 'none';
          root.style.maxHeight = 'none';
          root.style.visibility = 'hidden';

          // Force reflow to get accurate measurements
          void root.offsetWidth;

          // Get natural size of content
          const naturalWidth = Math.max(root.scrollWidth, root.offsetWidth, 1);
          const naturalHeight = Math.max(root.scrollHeight, root.offsetHeight, 1);

          // Restore visibility
          root.style.visibility = 'visible';
          root.style.position = 'relative';

          // If content is very small or hasn't rendered yet, wait
          if (naturalWidth < 10 && naturalHeight < 10) {
            timeoutId = setTimeout(updateScale, 150);
            return;
          }

          // Calculate scale to fit both width and height with padding
          const padding = 16;
          const availableWidth = containerWidth - padding;
          const availableHeight = containerHeight - padding;
          const scaleX = availableWidth / naturalWidth;
          const scaleY = availableHeight / naturalHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

          // Apply scaling
          root.style.width = 'auto';
          root.style.height = 'auto';

          if (scale < 0.95) {
            root.style.transform = 'scale(' + scale.toFixed(4) + ')';
            root.style.transformOrigin = 'center center';
          } else {
            root.style.transform = 'none';
          }

          hasScaled = true;
        }

        function throttledUpdate() {
          if (rafId || hasScaled) return;
          rafId = requestAnimationFrame(() => {
            updateScale();
            rafId = null;
          });
        }

        // Throttled resize - allow re-scaling on resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          hasScaled = false;
          resizeTimeout = setTimeout(throttledUpdate, 100);
        });

        // Limited MutationObserver - only watch for child changes, not attributes
        const observer = new MutationObserver(() => {
          if (!hasScaled) throttledUpdate();
        });
        if (root) {
          observer.observe(root, { childList: true, subtree: false });
        }

        // Initial updates with delays
        setTimeout(updateScale, 50);
        setTimeout(updateScale, 200);
        setTimeout(updateScale, 500);
      })();
    </script>
  `;

  const wrapContent = (content: string) => `
    <div id="root-wrapper">
      <div id="root">${content}</div>
    </div>
    ${scaleScript}
  `;

  // Extract code from files by type
  const htmlFile = files.find((f) => f.language === "html");
  const cssFiles = files.filter((f) => f.language === "css");
  const jsFiles = files.filter((f) => f.language === "js");
  const reactFiles = files.filter((f) => f.language === "tsx" || f.language === "jsx");

  const htmlCode = htmlFile?.code ?? "";
  const cssCode = cssFiles.map((f) => f.code).join("\n");
  const reactCode = reactFiles.map((f) => f.code).join("\n");

  // Multi-file HTML+CSS (STATIC - no JS execution)
  if (htmlFile || (cssFiles.length > 0 && files.some((f) => f.language === "html"))) {
    // DEBUG: Log what we're generating
    console.log('[StaticThumbnail] Generating HTML+CSS preview', {
      hasHtmlFile: !!htmlFile,
      cssFilesCount: cssFiles.length,
      htmlCodeLength: htmlCode.length,
      cssCodeLength: cssCode.length
    });
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- Removed Tailwind CDN - blocked by COEP headers -->
          <style>
            ${baseStyles}
            ${cssCode}
          </style>
        </head>
        <body>
          ${wrapContent(htmlCode)}
        </body>
      </html>
    `;
  }

  if (framework === "html") {
    const code = files[0]?.code ?? "";
    console.log('[StaticThumbnail] Generating HTML-only preview', { codeLength: code.length });
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <!-- Removed Tailwind CDN - blocked by COEP headers -->
          <style>
            ${baseStyles}
            ${cssCode}
          </style>
        </head>
        <body>
          ${wrapContent(code)}
        </body>
      </html>
    `;
  }

  if (framework === "css") {
    const code = files[0]?.code ?? "";
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${baseStyles}
            ${code}
          </style>
        </head>
        <body>
          ${wrapContent(`
            <div class="preview">CSS Preview</div>
          `)}
        </body>
      </html>
    `;
  }

  // React/Next.js - render actual component (static snapshot with JS execution)
  if (framework === "react" || framework === "next") {
    // Generate fallback placeholder HTML
    const fallbackPlaceholder = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:12px;padding:24px;background:linear-gradient(135deg, #1e1e2e 0%, #0d0d15 100%);border-radius:8px;">
          <svg style="width:48px;height:48px;opacity:0.6;" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="2.5" fill="#61dafb"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(60 12 12)"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(120 12 12)"/>
          </svg>
          <span style="font-size:12px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">${framework === "next" ? "Next.js" : "React"} Component</span>
        </div>
      `;

    if (reactCode.trim()) {
      // TEMPORARY: Use default thumbnail for React/Next components
      // The JSX transpilation in static thumbnails has issues with attribute escaping
      // TODO: Fix JSX transpilation or use a different approach for static previews
      console.log('[StaticThumbnail] Using default thumbnail for React/Next component (transpilation disabled temporarily)');
      return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}</style>
            </head>
            <body>
              ${wrapContent(fallbackPlaceholder)}
            </body>
          </html>
        `;
      
      // OLD CODE - Disabled temporarily due to JSX attribute escaping issues
      /*
      // DEBUG: Log React code detection
      console.log('[StaticThumbnail] Processing React code', {
        reactCodeLength: reactCode.length,
        reactCodePreview: reactCode.substring(0, 200)
      });
      
      const { mode, runtimeCode, error } = generatePreviewRuntime(reactCode);
      
      // DEBUG: Log runtime generation result
      console.log('[StaticThumbnail] Runtime generation result', {
        mode,
        hasRuntimeCode: !!runtimeCode,
        runtimeCodeLength: runtimeCode?.length || 0,
        error
      });

      if (mode === "disabled" || !runtimeCode) {
        console.warn('[StaticThumbnail] Preview disabled or no runtime code', { mode, error });
        return `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${baseStyles}</style>
              </head>
              <body>
                ${wrapContent(fallbackPlaceholder)}
              </body>
            </html>
          `;
      }

      // OLD CODE - Disabled temporarily due to JSX attribute escaping issues
      /*
      // DEBUG: Log before stringifying
      console.log('[StaticThumbnail] Stringifying runtime code', {
        runtimeCodeType: typeof runtimeCode,
        runtimeCodeLength: runtimeCode.length,
        runtimeCodePreview: runtimeCode.substring(0, 300)
      });
      
      const runtimeLiteral = JSON.stringify(runtimeCode)
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029")
        .replace(/<\/script/gi, "<\\/script");
      
      console.log('[StaticThumbnail] Runtime literal created', {
        literalLength: runtimeLiteral.length,
        literalPreview: runtimeLiteral.substring(0, 300)
      });

      return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}</style>
            </head>
            <body>
              <div id="root-wrapper">
                <div id="root"></div>
              </div>
              <script type="module">
                // ... (runtime code execution logic) ...
              </script>
            </body>
          </html>
        `;
      */
    } else {
      // No React code, show placeholder
      return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${baseStyles}</style>
            </head>
            <body>
              ${wrapContent(fallbackPlaceholder)}
            </body>
          </html>
        `;
    }
  }

  if (framework === "vue" || framework === "angular") {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${baseStyles}
            .react-placeholder {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 24px;
              background: linear-gradient(135deg, #1e1e2e 0%, #0d0d15 100%);
              border-radius: 8px;
              border: 1px solid rgba(255,255,255,0.1);
            }
            .react-icon {
              width: 48px;
              height: 48px;
              opacity: 0.6;
            }
            .react-label {
              font-size: 12px;
              color: rgba(255,255,255,0.5);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          ${wrapContent(`
            <div class="react-placeholder">
              <svg class="react-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2.5" fill="#61dafb"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(60 12 12)"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(120 12 12)"/>
              </svg>
              <span class="react-label">${framework === "vue" ? "Vue" : "Angular"} Component</span>
            </div>
          `)}
        </body>
      </html>
    `;
  }

  // For JS or other, show code preview placeholder
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          ${baseStyles}
          .code-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 24px;
            background: linear-gradient(135deg, #1e1e2e 0%, #0d0d15 100%);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .code-icon {
            font-size: 32px;
            opacity: 0.6;
          }
          .code-label {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        ${wrapContent(`
          <div class="code-placeholder">
            <span class="code-icon">&lt;/&gt;</span>
            <span class="code-label">Code Snippet</span>
          </div>
        `)}
      </body>
    </html>
  `;
}

export function StaticThumbnail({
  files,
  framework,
  className,
}: StaticThumbnailProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const srcDoc = useMemo(
    () => generateHtmlDocument(files, framework),
    [files, framework]
  );

  useEffect(() => {
    setIsLoaded(false);
  }, [srcDoc]);

  return (
    <div
      className={cn(
        "relative w-full aspect-video bg-muted/50 rounded-t-lg overflow-hidden",
        className
      )}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full border-0 pointer-events-none transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        title="Component preview"
      />
    </div>
  );
}
