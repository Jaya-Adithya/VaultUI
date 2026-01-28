"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/detect-framework";
import { generatePreviewRuntime } from "@/lib/preview-runtime-generator";

interface FileData {
  filename: string;
  language: string;
  code: string;
}

interface HoverPreviewProps {
  files: FileData[];
  framework: Framework;
  isActive: boolean;
  className?: string;
}

function generateHoverPreviewDocument(
  files: FileData[],
  framework: Framework
): string {
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

  // Optimized scale script - debounced and throttled to prevent hangs
  const scaleScript = `
    <script>
      (function() {
        const wrapper = document.getElementById('root-wrapper');
        const root = document.getElementById('root');
        let rafId = null;
        let timeoutId = null;
        let isUpdating = false;
        
        function updateScale() {
          if (!wrapper || !root || isUpdating) return;
          isUpdating = true;
          
          const containerWidth = wrapper.clientWidth;
          const containerHeight = wrapper.clientHeight;
          
          if (containerWidth === 0 || containerHeight === 0) {
            isUpdating = false;
            timeoutId = setTimeout(updateScale, 100);
            return;
          }
          
          // Reset
          root.style.transform = 'none';
          root.style.width = 'auto';
          root.style.height = 'auto';
          root.style.maxWidth = 'none';
          root.style.maxHeight = 'none';
          
          // Force reflow
          void root.offsetWidth;
          
          // Get natural size
          const naturalWidth = root.scrollWidth || root.offsetWidth || containerWidth;
          const naturalHeight = root.scrollHeight || root.offsetHeight || containerHeight;
          
          if (naturalWidth === 0 || naturalHeight === 0 || naturalWidth === containerWidth) {
            isUpdating = false;
            timeoutId = setTimeout(updateScale, 150);
            return;
          }
          
          // Calculate scale
          const scaleX = containerWidth / naturalWidth;
          const scaleY = containerHeight / naturalHeight;
          const scale = Math.min(scaleX, scaleY, 1);
          
          if (scale < 1) {
            root.style.transform = 'scale(' + scale + ')';
            root.style.transformOrigin = 'center center';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
          } else {
            root.style.transform = 'none';
          }
          
          isUpdating = false;
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
          resizeTimeout = setTimeout(throttledUpdate, 150);
        }, { passive: true });
        
        // Limited MutationObserver - only watch direct children, not subtree
        const observer = new MutationObserver(() => {
          throttledUpdate();
        });
        if (root) {
          observer.observe(root, { childList: true, subtree: false });
        }
        
        // Initial updates
        setTimeout(updateScale, 150);
        setTimeout(updateScale, 400);
        setTimeout(updateScale, 1000);
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
  const vueFiles = files.filter((f) => f.language === "vue" || f.filename.endsWith(".vue"));

  const htmlCode = htmlFile?.code ?? "";
  const cssCode = cssFiles.map((f) => f.code).join("\n");
  const jsCode = jsFiles.map((f) => f.code).join("\n");
  const reactCode = reactFiles.map((f) => f.code).join("\n");

  // Multi-file HTML+CSS+JS (FULL INTERACTIVITY on hover)
  if (htmlFile) {
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
          ${jsCode ? `<script>
            // Wait for Tailwind to load before executing JS
            if (typeof tailwind !== 'undefined') {
              try {
                ${jsCode}
              } catch (error) {
                console.error('JS execution error:', error);
              }
            } else {
              const checkTailwind = setInterval(() => {
                if (typeof tailwind !== 'undefined') {
                  clearInterval(checkTailwind);
                  try {
                    ${jsCode}
                  } catch (error) {
                    console.error('JS execution error:', error);
                  }
                }
              }, 50);
              setTimeout(() => clearInterval(checkTailwind), 3000);
            }
          </script>` : ""}
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
          ${jsCode ? `<script>
            // Wait for Tailwind to load before executing JS
            if (typeof tailwind !== 'undefined') {
              try {
                ${jsCode}
              } catch (error) {
                console.error('JS execution error:', error);
              }
            } else {
              const checkTailwind = setInterval(() => {
                if (typeof tailwind !== 'undefined') {
                  clearInterval(checkTailwind);
                  try {
                    ${jsCode}
                  } catch (error) {
                    console.error('JS execution error:', error);
                  }
                }
              }, 50);
              setTimeout(() => clearInterval(checkTailwind), 3000);
            }
          </script>` : ""}
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
          <style>
            ${baseStyles}
            ${code}
          </style>
        </head>
        <body>
          ${wrapContent(`
            <div class="preview-container">
              <div class="box">1</div>
              <div class="box">2</div>
              <div class="box">3</div>
            </div>
          `)}
        </body>
      </html>
    `;
  }

  // Vue (basic SFC preview)
  if (framework === "vue" || vueFiles.length > 0) {
    const vueCode = (vueFiles[0]?.code ?? files[0]?.code ?? "").toString();
    // Use JSON.stringify for proper escaping (handles all edge cases)
    const safeVueCode = JSON.stringify(vueCode)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/<\/script/gi, "<\\/script");
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${baseStyles}${cssCode}</style>
        </head>
        <body>
          <div id="root-wrapper">
             <div id="root"></div>
          </div>
          ${scaleScript}
          <script type="module">
            (async () => {
              const { createApp, reactive, ref, computed, watch, watchEffect, onMounted, onUnmounted, h } = await import("https://unpkg.com/vue@3/dist/vue.esm-browser.js");
              
              // Dynamically import VueUse if needed
              let vueUseCore = null;
              const checkVueUse = async () => {
                try {
                  vueUseCore = await import("https://esm.sh/@vueuse/core@latest?deps=vue@3");
                } catch (e) {
                  console.warn('Failed to load VueUse:', e);
                }
              };
              
              const source = ${safeVueCode};
            
            // Helper function to escape HTML
            const escapeHtml = (text) => {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            };
            
            // Extract template - more robust extraction
            let template = null;
            const templateStart = source.indexOf('<template');
            if (templateStart !== -1) {
              const templateEnd = source.indexOf('</template>', templateStart);
              if (templateEnd !== -1) {
                const templateOpenEnd = source.indexOf('>', templateStart);
                if (templateOpenEnd !== -1 && templateOpenEnd < templateEnd) {
                  template = source.substring(templateOpenEnd + 1, templateEnd).trim();
                }
              }
            }
            
            // Fallback to regex if indexOf fails
            if (!template) {
              const templateMatch = source.match(/<template[^>]*>([\\s\\S]*?)<\\/template>/i);
              template = templateMatch ? templateMatch[1].trim() : null;
            }
            
            // Extract and inject styles - more robust extraction
            let styleContent = null;
            const styleStart = source.indexOf('<style');
            if (styleStart !== -1) {
              const styleEnd = source.indexOf('</style>', styleStart);
              if (styleEnd !== -1) {
                const styleOpenEnd = source.indexOf('>', styleStart);
                if (styleOpenEnd !== -1 && styleOpenEnd < styleEnd) {
                  styleContent = source.substring(styleOpenEnd + 1, styleEnd).trim();
                }
              }
            }
            
            // Fallback to regex
            if (!styleContent) {
              const styleMatch = source.match(/<style[^>]*>([\\s\\S]*?)<\\/style>/i);
              styleContent = styleMatch ? styleMatch[1].trim() : null;
            }
            
            if (styleContent) {
              const styleEl = document.createElement('style');
              styleEl.textContent = styleContent;
              document.head.appendChild(styleEl);
            }
            
            // Extract script setup - more robust extraction
            let scriptSetup = null;
            let script = null;
            
            // Find all script tags
            const scriptTags = [];
            let searchIndex = 0;
            while (true) {
              const scriptStart = source.indexOf('<script', searchIndex);
              if (scriptStart === -1) break;
              
              const scriptOpenEnd = source.indexOf('>', scriptStart);
              if (scriptOpenEnd === -1) break;
              
              const scriptEnd = source.indexOf('</script>', scriptOpenEnd);
              if (scriptEnd === -1) break;
              
              const scriptTag = source.substring(scriptStart, scriptOpenEnd + 1);
              const scriptContent = source.substring(scriptOpenEnd + 1, scriptEnd).trim();
              
              // Check if it's a setup script
              if (/setup/i.test(scriptTag) || /lang=["']ts["']/i.test(scriptTag)) {
                scriptSetup = scriptContent;
              } else if (!script) {
                script = scriptContent;
              }
              
              searchIndex = scriptEnd + 9; // Move past </script>
            }
            
            // Fallback to regex
            if (!scriptSetup) {
              const scriptSetupMatch = source.match(/<script[^>]*\\s+setup[^>]*>([\\s\\S]*?)<\\/script>/i);
              scriptSetup = scriptSetupMatch ? scriptSetupMatch[1].trim() : null;
            }
            
            if (!script) {
              const scriptMatch = source.match(/<script[^>]*(?!\\s+setup)[^>]*>([\\s\\S]*?)<\\/script>/i);
              script = scriptMatch ? scriptMatch[1].trim() : null;
            }
            
            // Create a stub AnimateGrid component if it's used but not defined
            const AnimateGrid = {
              name: 'AnimateGrid',
              props: ['cards', 'textGlowStartColor', 'perspective', 'textGlowEndColor', 'rotateX', 'rotateY'],
              setup(props, { slots }) {
                return () => {
                  const defaultSlot = slots.default || slots.logo;
                  return h('div', {
                    class: 'animate-grid',
                    style: {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1rem',
                      padding: '1rem',
                      perspective: props.perspective + 'px'
                    }
                  }, props.cards?.map((card, index) => {
                    return h('div', {
                      key: index,
                      class: 'grid-item',
                      style: {
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        transform: \`rotateX(\${props.rotateX}deg) rotateY(\${props.rotateY}deg)\`
                      }
                    }, defaultSlot ? defaultSlot({ logo: card.logo }) : [h('div', 'Card ' + index)]);
                  }) || []);
                };
              }
            };
            
            // Debug: log source if template is missing
            if (!template) {
              console.error('Vue template extraction failed. Source length:', source.length);
              console.error('Source preview:', source.substring(0, 200));
              document.getElementById("root").innerHTML = '<div style="color:#ef4444;padding:16px;">Vue preview: missing &lt;template&gt; block.<br><br>Source preview: ' + 
                (source.length > 0 ? escapeHtml(source.substring(0, 500)) : 'Empty source') + '</div>';
            } else {
              try {
                // Check if VueUse is needed and load it first
                const needsVueUseCheck = /@vueuse\\/core/i.test(source);
                if (needsVueUseCheck) {
                  await checkVueUse();
                }
                
                let componentOptions = { template };
                
                if (scriptSetup) {
                  let setupCode = scriptSetup.trim();
                  
                  // Check if VueUse is needed
                  const needsVueUse = needsVueUseCheck;
                  
                  // Check if VueUse is needed
                  const needsVueUse = /@vueuse\\/core/i.test(setupCode);
                  
                  // Handle VueUse imports - replace with dynamic import
                  if (needsVueUse) {
                    setupCode = setupCode.replace(
                      /import\\s+\\{([^}]+)\\}\s+from\\s+["']@vueuse\\/core["'];?/g,
                      (match, imports) => {
                        // Extract import names
                        const importNames = imports.split(',').map(i => i.trim());
                        return \`// VueUse imports will be available via vueUseCore\`;
                      }
                    );
                  }
                  
                  // Handle SVG imports - replace with placeholder data URL
                  setupCode = setupCode.replace(
                    /import\\s+(\\w+)\\s+from\\s+["']\\.\\/[^"']+\\.svg["'];?/g,
                    'const $1 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjY2NjIi8+PC9zdmc+";'
                  );
                  
                  // Handle defineProps macro - transform to runtime function
                  setupCode = setupCode.replace(
                    /const\\s+props\\s*=\\s*defineProps<[^>]+>\\(\\)/g,
                    'const props = { textGlowStartColor: "", perspective: 1000, textGlowEndColor: "", rotateX: 0, rotateY: 0 }'
                  );
                  
                  // Strip TypeScript type annotations
                  setupCode = setupCode
                    .replace(/:\\s*\\w+(\\[\\])?(\\s*[=,;)])/g, '$2')
                    .replace(/as\\s+\\w+/g, '')
                    .replace(/\\btype\\s+\\w+\\s*=\\s*[^;]+;/g, '')
                    .replace(/\\binterface\\s+\\w+\\s*\\{[^}]*\\}/g, '');
                  
                  componentOptions.setup = function() {
                    try {
                      // Create VueUse composables - use loaded module or shims
                      const useMouseInElement = vueUseCore?.useMouseInElement || function(el) {
                        const isOutside = ref(true);
                        if (el && typeof el.addEventListener === 'function') {
                          el.addEventListener('mouseenter', () => { isOutside.value = false; });
                          el.addEventListener('mouseleave', () => { isOutside.value = true; });
                        }
                        return { isOutside };
                      };
                      
                      const useDebounceFn = vueUseCore?.useDebounceFn || function(fn, delay = 200) {
                        let timeoutId = null;
                        return function(...args) {
                          clearTimeout(timeoutId);
                          timeoutId = setTimeout(() => fn.apply(this, args), delay);
                        };
                      };
                      
                      const setupContext = {
                        reactive, ref, computed, watch, watchEffect,
                        onMounted, onUnmounted, console: window.console,
                        // Add defineProps as a runtime function
                        defineProps: function(propsDef) {
                          return reactive(propsDef || {});
                        },
                        // VueUse composables
                        useMouseInElement,
                        useDebounceFn,
                        // Make AnimateGrid available in setup context
                        AnimateGrid
                      };
                      
                      // Extract variable declarations
                      const varPattern = /(?:const|let|var)\\s+(\\w+)\\s*=/g;
                      const variables = [];
                      let match;
                      while ((match = varPattern.exec(setupCode)) !== null) {
                        variables.push(match[1]);
                      }
                      
                      // Wrap code to return all variables
                      const wrappedCode = setupCode + '\\n\\n' +
                        '// Return all declared variables for template access\\n' +
                        'return {\\n' +
                        '  ' + variables.join(',\\n  ') + '\\n' +
                        '};';
                      
                      const setupFn = new Function(...Object.keys(setupContext), wrappedCode);
                      return setupFn(...Object.values(setupContext)) || {};
                    } catch (e) {
                      console.error('Vue script setup error:', e);
                      return {};
                    }
                  };
                } else if (script) {
                  try {
                    const scriptFn = new Function('return ' + script);
                    const scriptResult = scriptFn();
                    if (scriptResult && typeof scriptResult === 'object') {
                      componentOptions = { ...componentOptions, ...scriptResult };
                    }
                  } catch (e) {
                    console.warn('Vue script error:', e);
                  }
                }
                
                const app = createApp(componentOptions);
                // Register AnimateGrid globally so it's available in templates
                app.component('AnimateGrid', AnimateGrid);
                app.mount("#root");
              } catch (e) {
                console.error('Vue component error:', e);
                document.getElementById("root").innerHTML = '<div style="color:#ef4444;padding:16px;">Vue preview error: ' + (e.message || String(e)) + '</div>';
              }
            }
            })();
          </script>
        </body>
      </html>
    `;
  }

  if (framework === "react" || framework === "next") {
    const code = reactCode || (files[0]?.code ?? "");

    // Generate preview runtime
    const { mode, runtimeCode, error, autoDetectedPackages } = generatePreviewRuntime(code);

    if (mode === "disabled" || !runtimeCode) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>${baseStyles}</style>
          </head>
          <body>
            ${wrapContent(`
              <div style="color: #fbbf24; padding: 24px; text-align: center;">
                <p>Preview Unavailable</p>
                <p style="opacity: 0.8; font-size: 14px;">${error || "Code preserved - some dependencies not supported"}</p>
              </div>
            `)}
          </body>
        </html>
      `;
    }

    // Show auto-detection badge if packages were auto-loaded
    const autoBadge = autoDetectedPackages && autoDetectedPackages.length > 0
      ? `<div style="position: absolute; top: 8px; right: 8px; background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; z-index: 10;">
          ⚠ Auto: ${autoDetectedPackages.join(", ")}
        </div>`
      : "";

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
          <style>${baseStyles}${cssCode}</style>
        </head>
        <body style="position: relative;">
          ${autoBadge}
          <div id="root-wrapper">
             <div id="root"></div>
          </div>
          ${scaleScript}
          <script type="module">
            const root = document.getElementById('root');
            const escapeHtml = (s) =>
              String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

            const showError = (err, meta) => {
              const msg = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
              const where =
                meta && (meta.filename || meta.lineno)
                  ? \`\\n\\n[where] \${meta.filename || ""}:\${meta.lineno || ""}:\${meta.colno || ""}\`
                  : "";
              if (root) {
                root.innerHTML = '<div style="color:#ef4444;padding:16px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;white-space:pre-wrap;background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;">' +
                  '<div style="font-weight:700; margin-bottom: 8px;">Preview Error</div>' +
                  '<pre style="margin:0; white-space:pre-wrap; overflow:auto;">' +
                  escapeHtml(msg + where) +
                  '</pre></div>';
              }
            };

            window.addEventListener('error', (e) => {
              showError(e.error || e.message || 'Unknown error', { filename: e.filename, lineno: e.lineno, colno: e.colno });
            });
            window.addEventListener('unhandledrejection', (e) => {
              showError(e.reason || 'Unhandled promise rejection');
            });

            // Load the generated runtime via Blob import
            // Use Base64 encoding to prevent HTML parsing issues with the code string
            const runtimeCode = ${runtimeLiteral};
            const encodedCode = btoa(unescape(encodeURIComponent(runtimeCode)));
            
            const blob = new Blob([decodeURIComponent(escape(atob(encodedCode)))], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            try {
              await import(url);
            } catch (e) {
              showError(e);
            } finally {
              URL.revokeObjectURL(url);
            }
          </script>
        </body>
      </html>
    `;
  }

  // For non-renderable, show nothing special
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${baseStyles}
          .placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: rgba(255,255,255,0.3);
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${wrapContent(`
           <div class="placeholder">Code preview</div>
        `)}
      </body>
    </html>
  `;
}

export function HoverPreview({
  files,
  framework,
  isActive,
  className,
}: HoverPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isFrameLoaded, setIsFrameLoaded] = useState(false);

  const srcDoc = useMemo(
    () => (isActive ? generateHoverPreviewDocument(files, framework) : ""),
    [files, framework, isActive]
  );

  const postHtmlToFrame = useCallback((html: string) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "setPreviewHtml", html }, window.location.origin);
  }, []);

  // Cleanup iframe when inactive to prevent memory leaks
  useEffect(() => {
    if (!isActive) {
      setIsLoaded(false);
      setIsFrameLoaded(false);
      // Clear iframe srcDoc to stop execution
      if (iframeRef.current) {
        // If the frame is already running, blank it out; otherwise it will render
        // the last state when it becomes visible again.
        postHtmlToFrame("");
      }
      // Run cleanup if exists
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
  }, [isActive]);

  // Timeout guard with cleanup
  useEffect(() => {
    if (!isActive) return;

    const timeout = setTimeout(() => {
      if (!isLoaded) {
        setIsLoaded(true);
      }
    }, 2000);

    cleanupRef.current = () => clearTimeout(timeout);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isActive, isLoaded]);

  // When the preview document changes, push it into the frame.
  useEffect(() => {
    if (!isActive) return;
    if (isFrameLoaded) {
      postHtmlToFrame(srcDoc);
    }
  }, [srcDoc, isActive, isFrameLoaded, postHtmlToFrame]);

  // Receive lifecycle messages from /preview/frame
  useEffect(() => {
    if (!isActive) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as any;
      if (!data || typeof data !== "object") return;
      if (data.type === "preview:loaded") {
        setIsLoaded(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 transition-opacity duration-200",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded">
          LIVE
        </span>
      </div>
      <iframe
        ref={iframeRef}
        src="/preview/frame"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => {
          setIsFrameLoaded(true);
          postHtmlToFrame(srcDoc);
        }}
        className="w-full h-full border-0 rounded-t-lg"
        title="Hover preview"
        loading="lazy"
      />
    </div>
  );
}
