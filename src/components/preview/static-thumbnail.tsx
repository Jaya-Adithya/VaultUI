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
        
        function updateScale() {
          if (!wrapper || !root) return;
          
          const containerWidth = wrapper.clientWidth;
          const containerHeight = wrapper.clientHeight;
          
          if (containerWidth === 0 || containerHeight === 0) {
            timeoutId = setTimeout(updateScale, 100);
            return;
          }
          
          // Reset
          root.style.transform = 'none';
          root.style.width = 'auto';
          root.style.height = 'auto';
          root.style.maxWidth = 'none';
          root.style.maxHeight = 'none';
          
          // Force reflow to get accurate measurements
          void root.offsetWidth;
          
          // Get natural size - wait for content to render
          const naturalWidth = root.scrollWidth || root.offsetWidth || containerWidth;
          const naturalHeight = root.scrollHeight || root.offsetHeight || containerHeight;
          
          if (naturalWidth === 0 || naturalHeight === 0 || naturalWidth === containerWidth) {
            timeoutId = setTimeout(updateScale, 150);
            return;
          }
          
          // Calculate scale to fit both width and height
          const scaleX = containerWidth / naturalWidth;
          const scaleY = containerHeight / naturalHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
          
          if (scale < 1) {
            root.style.transform = 'scale(' + scale + ')';
            root.style.transformOrigin = 'center center';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
          } else {
            root.style.transform = 'none';
          }
        }
        
        function throttledUpdate() {
          if (rafId) return;
          rafId = requestAnimationFrame(() => {
            updateScale();
            rafId = null;
          });
        }
        
        // Throttled resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(throttledUpdate, 100);
        });
        
        // Limited MutationObserver - only watch for child changes, not attributes
        const observer = new MutationObserver(() => {
          throttledUpdate();
        });
        if (root) {
          observer.observe(root, { childList: true, subtree: false });
        }
        
        // Initial updates with delays
        setTimeout(updateScale, 100);
        setTimeout(updateScale, 300);
        setTimeout(updateScale, 800);
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
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
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
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
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
        const { mode, runtimeCode, error } = generatePreviewRuntime(reactCode);
        
        if (mode === "disabled" || !runtimeCode) {
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

        const runtimeLiteral = JSON.stringify(runtimeCode)
          .replace(/\u2028/g, "\\u2028")
          .replace(/\u2029/g, "\\u2029")
          .replace(/<\/script/gi, "<\\/script");

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
                const root = document.getElementById('root');
                const wrapper = document.getElementById('root-wrapper');
                
                if (!root || !wrapper) {
                  document.body.innerHTML = ${JSON.stringify(wrapContent(fallbackPlaceholder))};
                  return;
                }
                
                // Show loading state
                root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:rgba(255,255,255,0.5);font-size:12px;">Loading...</div>';
                
                const code = ${runtimeLiteral};
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                
                let renderTimeout;
                let fallbackTimeout;
                let observer;
                let isScaled = false;
                let hasRendered = false;
                
                const isErrorContent = () => {
                  const text = (root.innerText || '').toLowerCase();
                  return text.includes('error') || text.includes('syntax') || text.includes('referenceerror');
                };
                
                const showFallback = () => {
                  if (root && !hasRendered) {
                    root.innerHTML = ${JSON.stringify(fallbackPlaceholder)};
                    hasRendered = true;
                  }
                };
                
                const applyScaling = () => {
                  if (isScaled || !root || !wrapper) return;
                  
                  const containerWidth = wrapper.clientWidth;
                  const containerHeight = wrapper.clientHeight;
                  
                  if (containerWidth === 0 || containerHeight === 0) return;
                  
                  // Force reflow
                  void root.offsetWidth;
                  
                  const naturalWidth = root.scrollWidth || root.offsetWidth;
                  const naturalHeight = root.scrollHeight || root.offsetHeight;
                  
                  // Check if React has rendered (has children or non-empty content, and not just loading/error)
                  const innerHTML = root.innerHTML || '';
                  const hasContent = root.children.length > 0 && 
                                   !innerHTML.includes('Loading...') && 
                                   !innerHTML.includes('Preview Error') &&
                                   !innerHTML.includes('Error:') &&
                                   !isErrorContent() &&
                                   (root.textContent?.trim() || innerHTML !== '');
                  
                  if (hasContent && naturalWidth > 0 && naturalHeight > 0 && naturalWidth !== containerWidth) {
                    const scaleX = containerWidth / naturalWidth;
                    const scaleY = containerHeight / naturalHeight;
                    const scale = Math.min(scaleX, scaleY, 1);
                    
                    if (scale < 1) {
                      root.style.transform = 'scale(' + scale + ')';
                      root.style.transformOrigin = 'center center';
                      wrapper.style.display = 'flex';
                      wrapper.style.alignItems = 'center';
                      wrapper.style.justifyContent = 'center';
                      isScaled = true;
                      hasRendered = true;
                      
                      // Cleanup observer once scaled
                      if (observer) {
                        observer.disconnect();
                        observer = null;
                      }
                      if (fallbackTimeout) {
                        clearTimeout(fallbackTimeout);
                        fallbackTimeout = null;
                      }
                    } else {
                      hasRendered = true;
                      if (fallbackTimeout) {
                        clearTimeout(fallbackTimeout);
                        fallbackTimeout = null;
                      }
                    }
                  }
                };
                
                const cleanup = () => {
                  if (renderTimeout) clearTimeout(renderTimeout);
                  if (fallbackTimeout) clearTimeout(fallbackTimeout);
                  if (observer) {
                    observer.disconnect();
                    observer = null;
                  }
                  URL.revokeObjectURL(url);
                };
                
                // Set fallback timeout - if React hasn't rendered in 3 seconds, show placeholder
                fallbackTimeout = setTimeout(() => {
                  if (!hasRendered) {
                    showFallback();
                    cleanup();
                  }
                }, 3000);
                
                try {
                  await import(url);
                  
                  // Watch for React rendering using MutationObserver
                  observer = new MutationObserver(() => {
                    if (isErrorContent()) {
                      showFallback();
                      cleanup();
                      return;
                    }
                    applyScaling();
                  });
                  observer.observe(root, { childList: true, subtree: true });
                  
                  // Try scaling at intervals
                  renderTimeout = setTimeout(() => {
                    applyScaling();
                    setTimeout(applyScaling, 200);
                    setTimeout(applyScaling, 500);
                    setTimeout(() => {
                      if (!hasRendered) {
                        showFallback();
                      }
                      cleanup();
                    }, 1000);
                  }, 300);
                  
                  // Final fallback cleanup
                  setTimeout(() => {
                    if (!hasRendered) {
                      showFallback();
                    }
                    cleanup();
                  }, 4000);
                } catch (e) {
                  cleanup();
                  showFallback();
                }
              </script>
            </body>
          </html>
        `;
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
