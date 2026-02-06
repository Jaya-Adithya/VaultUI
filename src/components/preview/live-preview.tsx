"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  Play,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  RotateCw,
  Search,
  ChevronDown,
  GripHorizontal,
  GripVertical,
  ZoomIn,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WaterProgress } from "@/components/ui/water-progress";
import type { Framework } from "@/lib/detect-framework";
import { generatePreviewRuntime } from "@/lib/preview-runtime-generator";

// File structure for multi-file support
interface ComponentFile {
  filename: string;
  language: string;
  code: string;
}

interface LivePreviewProps {
  files: ComponentFile[];
  framework: Framework;
  className?: string;
  onRun?: () => void;
}

const DEVICES = [
  { name: "Responsive", width: "100%", height: "100%", icon: Monitor },
  { name: "Desktop", width: 1280, height: 800, icon: Monitor },
  { name: "MacBook Air", width: 1440, height: 900, icon: Monitor },
  { name: "iMac 27\"", width: 2560, height: 1440, icon: Monitor },
  { name: "iPhone SE", width: 375, height: 667, icon: Smartphone },
  { name: "iPhone XR", width: 414, height: 896, icon: Smartphone },
  { name: "iPhone 12 Pro", width: 390, height: 844, icon: Smartphone },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, icon: Smartphone },
  { name: "Pixel 7", width: 412, height: 915, icon: Smartphone },
  { name: "Samsung Galaxy S20 Ultra", width: 412, height: 915, icon: Smartphone },
  { name: "iPad Mini", width: 768, height: 1024, icon: Tablet },
  { name: "iPad Air", width: 820, height: 1180, icon: Tablet },
  { name: "iPad Pro", width: 1024, height: 1366, icon: Tablet },
  { name: "Surface Pro 7", width: 912, height: 1368, icon: Tablet },
  { name: "Galaxy Z Fold 5", width: 373, height: 911, icon: Smartphone },
];

const ZOOM_LEVELS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1.0 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2.0 },
];

function generateMultiFileHtmlDocument(
  files: ComponentFile[],
  framework: Framework,
  viewportWidth?: number,
  viewportHeight?: number,
  zoom?: number,
  isResponsive?: boolean
): string {
  // Generate viewport meta tag based on dimensions and zoom (like Chrome DevTools)
  const getViewportMeta = () => {
    // For responsive mode, always use device-width to ensure content fits properly
    if (isResponsive) {
      return `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">`;
    }
    if (viewportWidth && viewportHeight) {
      // Chrome DevTools approach: set explicit viewport width and scale
      const scale = zoom || 1.0;
      return `<meta name="viewport" content="width=${viewportWidth}, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}, user-scalable=no">`;
    }
    return `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  };

  const viewportMeta = getViewportMeta();
  const baseStyles = `
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: fixed;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
    }
    #root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      max-width: 100%;
      max-height: 100%;
    }
    #root > * {
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
    }
    .error-display {
      color: #ef4444;
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
    }
  `;

  // Extract files by type
  const htmlFile = files.find((f) => f.language === "html");
  const cssFiles = files.filter((f) => f.language === "css");
  const jsFiles = files.filter((f) => f.language === "js");
  const reactFiles = files.filter((f) => f.language === "tsx" || f.language === "jsx");
  const vueFiles = files.filter((f) => f.language === "vue" || f.filename.endsWith(".vue"));
  const angularFiles = files.filter((f) => f.filename.endsWith(".component.ts") || f.filename.endsWith(".ts"));

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
          ${viewportMeta}
          <style>
            ${baseStyles}
            ${cssFiles.map((f) => f.code).join("\n")}
          </style>
        </head>
        <body>
          <div id="root"></div>
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
            
            // Extract template - more robust regex that handles attributes and whitespace
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
            
            // Extract style block - more robust extraction
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
            
            // Inject styles if present
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
              document.getElementById("root").innerHTML = '<div class="error-display">Vue preview: missing &lt;template&gt; block.<br><br>Source preview: ' + 
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
                  // Enhanced script setup processing
                  let setupCode = scriptSetup.trim();
                  
                  // Check if VueUse is needed
                  const needsVueUse = needsVueUseCheck;
                  
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
                  
                  // Strip TypeScript type annotations (basic)
                  setupCode = setupCode
                    .replace(/:\\s*\\w+(\\[\\])?(\\s*[=,;)])/g, '$2') // Remove simple type annotations
                    .replace(/as\\s+\\w+/g, '') // Remove 'as Type' casts
                    .replace(/\\btype\\s+\\w+\\s*=\\s*[^;]+;/g, '') // Remove type definitions
                    .replace(/\\binterface\\s+\\w+\\s*\\{[^}]*\\}/g, ''); // Remove interface definitions
                  
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
                      
                      // Create a more comprehensive setup context
                      const setupContext = {
                        reactive,
                        ref,
                        computed,
                        watch,
                        watchEffect,
                        onMounted,
                        onUnmounted,
                        // Add console for debugging
                        console: window.console,
                        // Add defineProps as a runtime function
                        defineProps: function(propsDef) {
                          // Return a reactive object with default values
                          return reactive(propsDef || {});
                        },
                        // VueUse composables
                        useMouseInElement,
                        useDebounceFn,
                        // Make AnimateGrid available in setup context
                        AnimateGrid
                      };
                      
                      // Parse the setup code to extract variable declarations
                      const varPattern = /(?:const|let|var)\\s+(\\w+)\\s*=/g;
                      const variables = [];
                      let match;
                      while ((match = varPattern.exec(setupCode)) !== null) {
                        variables.push(match[1]);
                      }
                      
                      // Create a function that returns all declared variables
                      const wrappedCode = setupCode + '\\n\\n' +
                        '// Return all declared variables for template access\\n' +
                        'return {\\n' +
                        '  ' + variables.join(',\\n  ') + '\\n' +
                        '};';
                      
                      
                      const setupFn = new Function(...Object.keys(setupContext), wrappedCode);
                      const result = setupFn(...Object.values(setupContext));
                      
                      return result || {};
                    } catch (e) {
                      console.error('Vue script setup execution error:', e);
                      console.error('Setup code:', setupCode);
                      // Return empty object to prevent complete failure
                      return {};
                    }
                  };
                } else if (script) {
                  // Regular script block - extract component options
                  try {
                    const scriptFn = new Function('return ' + script);
                    const scriptResult = scriptFn();
                    if (scriptResult && typeof scriptResult === 'object') {
                      componentOptions = { ...componentOptions, ...scriptResult };
                    }
                  } catch (e) {
                    console.warn('Vue script execution warning:', e);
                  }
                }
                
                const app = createApp(componentOptions);
                // Register AnimateGrid globally so it's available in templates
                app.component('AnimateGrid', AnimateGrid);
                app.mount("#root");
              } catch (e) {
                const errorMsg = e.message || String(e);
                console.error('Vue component error:', e);
                document.getElementById("root").innerHTML = '<div class="error-display">Vue preview error: ' + errorMsg + '</div>';
              }
            }
            })();
          </script>
        </body>
      </html>
    `;
  }

  // Angular (not supported in-browser yet)
  if (framework === "angular" || angularFiles.length > 0) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${viewportMeta}
          <style>${baseStyles}</style>
        </head>
        <body>
          <div id="root">
            <div class="error-display" style="text-align:center; padding:48px;">
              <div style="color:#fbbf24; font-weight:600; margin-bottom:8px;">Angular preview unavailable</div>
              <div style="opacity:0.8;">Vault preserved the code. Angular requires a build step (AOT/JIT) not supported in this sandbox yet.</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // If we have React files, render them
  if (reactFiles.length > 0) {
    const reactCode = reactFiles.map((f) => f.code).join("\n\n");
    const cssCode = cssFiles.map((f) => f.code).join("\n");

    // Generate preview runtime (original code is NOT modified)
    // Auto-detection happens automatically - no user prompts
    // Pass all files to enable CSS module matching
    const { mode, runtimeCode, error, autoDetectedPackages } = generatePreviewRuntime(reactCode, undefined, files);

    if (mode === "disabled" || !runtimeCode) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            ${viewportMeta}
            <style>${baseStyles}</style>
          </head>
          <body>
            <div id="root">
              <div class="error-display" style="text-align: center; padding: 48px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #fbbf24;">Preview Unavailable</p>
                <p style="margin: 0; font-size: 14px; opacity: 0.8;">${error || "Code preserved - some dependencies not supported for preview"}</p>
              </div>
            </div>
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

    // IMPORTANT: runtimeCode is already a valid JS string that will be embedded
    // in the HTML. We only need to escape characters that would break the HTML
    // or the JS string literal context.
    //
    // JSON.stringify already properly escapes:
    // - Quotes (")
    // - Backslashes (\)
    // - Newlines, tabs, etc.
    //
    // We do NOT escape backticks (`) or dollar signs ($) because:
    // - They are inside a double-quoted JSON string
    // - They don't need escaping in that context
    // - Escaping them with \ creates invalid JSON (e.g., \` is not a valid JSON escape)
    const runtimeLiteral = JSON.stringify(runtimeCode)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/<\/script/gi, "<\\/script");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${viewportMeta}
          <style>
            ${baseStyles}
            ${cssCode}
          </style>
        </head>
        <body style="position: relative;">
          ${autoBadge}
          <div id="root"></div>
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
                root.innerHTML = '<div class="error-display" style="text-align:left; max-width: 100%;">' +
                  '<div style="font-weight:700; margin-bottom: 8px;">Preview Error</div>' +
                  '<pre style="margin:0; white-space:pre-wrap; overflow:auto;">' +
                  escapeHtml(msg + where) +
                  '</pre></div>';
              }
            };

            window.addEventListener('error', (e) => {
              showError(e.error || e.message || 'Unknown error', { filename: e.filename, lineno: e.lineno, colno: e.colno });
              window.parent.postMessage({ type: 'console', level: 'error', message: e.message || 'Unknown error' }, '*');
            });
            window.addEventListener('unhandledrejection', (e) => {
              showError(e.reason || 'Unhandled promise rejection');
              window.parent.postMessage({ type: 'console', level: 'error', message: String(e.reason) || 'Unhandled promise rejection' }, '*');
            });

            // Override console methods to send messages to parent
            const originalConsole = { 
              log: console.log, 
              error: console.error, 
              warn: console.warn, 
              info: console.info,
              debug: console.debug,
              trace: console.trace,
              table: console.table,
              group: console.group,
              groupEnd: console.groupEnd,
            };
            const formatArgs = (args) => {
              try {
                return args.map(a => {
                  if (a === null) return 'null';
                  if (a === undefined) return 'undefined';
                  if (typeof a === 'object') {
                    try {
                      return JSON.stringify(a, null, 2);
                    } catch {
                      return String(a);
                    }
                  }
                  return String(a);
                }).join(' ');
              } catch {
                return String(args);
              }
            };
            
            // Override all console methods
            console.log = (...args) => { 
              originalConsole.log(...args); 
              window.parent.postMessage({ type: 'console', level: 'log', message: formatArgs(args) }, '*'); 
            };
            console.error = (...args) => { 
              originalConsole.error(...args); 
              window.parent.postMessage({ type: 'console', level: 'error', message: formatArgs(args) }, '*'); 
            };
            console.warn = (...args) => { 
              originalConsole.warn(...args); 
              window.parent.postMessage({ type: 'console', level: 'warn', message: formatArgs(args) }, '*'); 
            };
            console.info = (...args) => { 
              originalConsole.info(...args); 
              window.parent.postMessage({ type: 'console', level: 'info', message: formatArgs(args) }, '*'); 
            };
            console.debug = (...args) => { 
              originalConsole.debug(...args); 
              window.parent.postMessage({ type: 'console', level: 'log', message: formatArgs(args) }, '*'); 
            };
            console.trace = (...args) => { 
              originalConsole.trace(...args); 
              window.parent.postMessage({ type: 'console', level: 'log', message: 'Trace: ' + formatArgs(args) }, '*'); 
            };

            // Load the generated runtime via Blob import so parse-time errors are catchable.
            const code = ${runtimeLiteral};
            const blob = new Blob([code], { type: 'text/javascript' });
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

  // HTML + CSS + JS multi-file rendering
  if (htmlFile || cssFiles.length > 0 || jsFiles.length > 0) {
    const htmlCode = htmlFile?.code ?? '<div id="app"></div>';
    const cssCode = cssFiles.map((f) => f.code).join("\n");
    const jsCode = jsFiles.map((f) => f.code).join("\n");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${viewportMeta}
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${baseStyles}
            /* Preview-only layout constraints */
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            body {
              display: flex;
              align-items: flex-start;
              justify-content: flex-start;
            }
            #root {
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              max-width: 100%;
              overflow: auto;
              box-sizing: border-box;
            }
            #root > * {
              max-width: 100%;
            }
            ${cssCode}
          </style>
        </head>
        <body>
          <div id="root">${htmlCode}</div>
          <script>
            // Wait for Tailwind to load before executing JS
            if (typeof tailwind !== 'undefined') {
              window.onerror = function(msg, url, line, col, error) {
                document.getElementById('root').innerHTML = '<div class="error-display">Error: ' + msg + '</div>';
                return true;
              };

              try {
                ${jsCode}
              } catch (error) {
                document.getElementById('root').innerHTML = '<div class="error-display">Error: ' + error.message + '</div>';
              }
            } else {
              // Wait for Tailwind
              const checkTailwind = setInterval(() => {
                if (typeof tailwind !== 'undefined') {
                  clearInterval(checkTailwind);
                  try {
                    ${jsCode}
                  } catch (error) {
                    document.getElementById('root').innerHTML = '<div class="error-display">Error: ' + error.message + '</div>';
                  }
                }
              }, 50);
              setTimeout(() => clearInterval(checkTailwind), 5000);
            }
          </script>
        </body>
      </html>
    `;
  }

  // Single file fallback (legacy support)
  const singleFile = files[0];
  if (!singleFile) {
    return `
      <!DOCTYPE html>
      <html>
        <head><style>${baseStyles}</style></head>
        <body><div id="root">No files to preview</div></body>
      </html>
    `;
  }

  // Handle by framework for single files
  if (framework === "css") {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${baseStyles}
            ${singleFile.code}
          </style>
        </head>
        <body>
          <div id="root">
            <div class="preview-container">
              <div class="box">Box 1</div>
              <div class="box">Box 2</div>
              <div class="box">Box 3</div>
            </div>
            <button class="btn">Button</button>
            <p class="text">Sample text</p>
          </div>
        </body>
      </html>
    `;
  }

  if (framework === "js") {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${baseStyles}
            #output {
              font-family: monospace;
              font-size: 14px;
              white-space: pre-wrap;
              padding: 16px;
              background: #1a1a1a;
              color: #e5e5e5;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div id="root"><div id="output"></div></div>
          <script>
            const output = document.getElementById('output');
            const logs = [];
            console.log = function(...args) {
              logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
              output.textContent = logs.join('\\n');
            };
            try { ${singleFile.code} } catch (e) { output.innerHTML = '<span style="color:#ef4444;">Error: ' + e.message + '</span>'; }
          </script>
        </body>
      </html>
    `;
  }

  // Default HTML
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${baseStyles}</style>
      </head>
      <body>
        <div id="root">${singleFile.code}</div>
      </body>
    </html>
  `;
}

export function LivePreview({ files, framework, className, onRun }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFrameLoaded, setIsFrameLoaded] = useState(false);

  // Responsive settings state
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0].name); // Start with Responsive
  const [customWidth, setCustomWidth] = useState<string>("");
  const [customHeight, setCustomHeight] = useState<string>("");
  const [zoom, setZoom] = useState(1.0);
  const [isPortrait, setIsPortrait] = useState(true);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);

  // Motion values for magnifier
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const lensX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const lensY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  const currentDevice = useMemo(
    () => DEVICES.find((d) => d.name === selectedDevice) || DEVICES[0],
    [selectedDevice]
  );

  // Track container dimensions for responsive mode (like Chrome DevTools)
  const [containerDimensions, setContainerDimensions] = useState({ width: 1280, height: 800 });

  // Use ResizeObserver to track container size changes (industrial standard approach)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      if (container) {
        const rect = container.getBoundingClientRect();
        // Account for padding (p-4 = 16px on each side = 32px total)
        const padding = 32;
        setContainerDimensions({
          width: Math.max(200, Math.floor(rect.width - padding)),
          height: Math.max(200, Math.floor(rect.height - padding))
        });
      }
    };

    // Initial measurement with a small delay to ensure container is rendered
    const timeoutId = setTimeout(updateDimensions, 0);

    // Use ResizeObserver for efficient size tracking (like Chrome DevTools)
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const dimensions = useMemo(() => {
    if (selectedDevice === "Responsive") {
      // For responsive mode, use actual pixel values (like Chrome DevTools)
      // If custom values are percentages or empty, use container dimensions
      let w = parseInt(customWidth);
      let h = parseInt(customHeight);

      if (isNaN(w) || customWidth === "100%" || customWidth === "") {
        w = containerDimensions.width || 1280;
      }
      if (isNaN(h) || customHeight === "100%" || customHeight === "") {
        h = containerDimensions.height || 800;
      }

      // Ensure minimum dimensions
      w = Math.max(200, w);
      h = Math.max(200, h);

      return { width: w, height: h };
    }

    let w = typeof currentDevice.width === "number" ? currentDevice.width : 375;
    let h = typeof currentDevice.height === "number" ? currentDevice.height : 667;

    if (!isPortrait) {
      [w, h] = [h, w];
    }

    return { width: w, height: h };
  }, [selectedDevice, currentDevice, customWidth, customHeight, isPortrait, containerDimensions]);

  const srcDoc = useMemo(
    () => {
      const width = typeof dimensions.width === "number" ? dimensions.width : undefined;
      const height = typeof dimensions.height === "number" ? dimensions.height : undefined;
      return generateMultiFileHtmlDocument(files, framework, width, height, zoom, selectedDevice === "Responsive");
    },
    [files, framework, dimensions.width, dimensions.height, zoom, selectedDevice]
  );

  const postHtmlToFrame = useCallback(
    (html: string) => {
      const frame = iframeRef.current;
      const win = frame?.contentWindow;
      if (!win) return;
      win.postMessage({ type: "setPreviewHtml", html }, window.location.origin);
    },
    []
  );

  const handleReload = useCallback(() => {
    setKey((k) => k + 1);
    setIsLoading(true);
    setHasError(false);
    setIsFrameLoaded(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsFrameLoaded(true);
    postHtmlToFrame(srcDoc);
  }, [postHtmlToFrame, srcDoc]);

  const prevSrcDocRef = useRef<string>("");

  useEffect(() => {
    // Only trigger loading state and post message if srcDoc actually changed or frame just loaded
    if (srcDoc === prevSrcDocRef.current && isFrameLoaded) return;

    setIsLoading(true);
    setHasError(false);

    if (isFrameLoaded) {
      prevSrcDocRef.current = srcDoc;
      postHtmlToFrame(srcDoc);
    }
  }, [srcDoc, isFrameLoaded, postHtmlToFrame]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as any;
      if (!data || typeof data !== "object") return;
      if (data.type === "preview:loaded") {
        setIsLoading(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
        console.warn("[LivePreview] Timeout reached after 15s. Iframe might be blocked or taking too long to initialize.");
      }
    }, 15000); // Increased to 15s for slower reloads

    return () => clearTimeout(timeout);
  }, [isLoading, key]);

  const handleDeviceChange = (value: string) => {
    setSelectedDevice(value);
    const device = DEVICES.find((d) => d.name === value);
    if (device && typeof device.width === "number") {
      setCustomWidth(device.width.toString());
      setCustomHeight(device.height.toString());
    } else if (value === "Responsive") {
      // For responsive mode, use container dimensions (like Chrome DevTools)
      setCustomWidth("");
      setCustomHeight("");
    }
  };

  const handleRotate = () => {
    setIsPortrait(!isPortrait);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col bg-muted/30 rounded-lg overflow-hidden border border-border/40",
        isFullscreen && "fixed inset-4 z-50 shadow-2xl border-border",
        className
      )}
    >
      {/* Upper Toolbar: Title and Main Actions */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-background/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground/80">
            Live Preview
          </span>
          {framework && (
            <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-medium text-primary uppercase tracking-wider">
              {framework}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRun && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accentTransition"
              onClick={onRun}
              title="Run preview (Ctrl+R)"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Run
            </Button>
          )}
          <div className="w-px h-4 bg-border/40 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Responsive Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 border-b border-border/40 bg-background/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Dimensions:</span>
          <Select value={selectedDevice} onValueChange={handleDeviceChange}>
            <SelectTrigger className="h-7 w-[140px] text-xs py-0 px-2 bg-background/50 border-border/40 hover:bg-background/80 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICES.map((device) => (
                <SelectItem key={device.name} value={device.name} className="text-xs">
                  <div className="flex items-center gap-2">
                    <device.icon className="h-3 w-3 opacity-60" />
                    {device.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            value={typeof dimensions.width === "number" ? dimensions.width.toString() : customWidth}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                setCustomWidth(value);
              }
            }}
            disabled={selectedDevice !== "Responsive" && typeof currentDevice.width === "number"}
            placeholder={selectedDevice === "Responsive" ? "W" : String(dimensions.width)}
            className="h-7 w-14 text-xs px-1.5 text-center bg-background/50 border-border/40 focus-visible:ring-primary/20"
          />
          <span className="text-muted-foreground/40 text-[10px]">×</span>
          <Input
            value={typeof dimensions.height === "number" ? dimensions.height.toString() : customHeight}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d+$/.test(value)) {
                setCustomHeight(value);
              }
            }}
            disabled={selectedDevice !== "Responsive" && typeof currentDevice.height === "number"}
            placeholder={selectedDevice === "Responsive" ? "H" : String(dimensions.height)}
            className="h-7 w-14 text-xs px-1.5 text-center bg-background/50 border-border/40 focus-visible:ring-primary/20"
          />
        </div>

        {selectedDevice !== "Responsive" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleRotate}
            title="Rotate"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="w-px h-4 bg-border/40" />

        <div className="flex items-center gap-2">
          <Select value={zoom.toString()} onValueChange={(v) => setZoom(parseFloat(v))}>
            <SelectTrigger className="h-7 w-[70px] text-xs py-0 px-2 bg-background/50 border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZOOM_LEVELS.map((z) => (
                <SelectItem key={z.value} value={z.value.toString()} className="text-xs">
                  {z.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors cursor-default",
              isMagnifierActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            title="Magnifier (Right-click on preview to zoom 4X)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleReload}
            title="Reload frame"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 bg-muted/20 overflow-auto flex items-center justify-center p-4 scrollbar-hide",
          isMagnifierActive && "cursor-none"
        )}
        style={{
          // Ensure container can scroll when content is larger (like Chrome DevTools)
          minHeight: 0,
        }}
        onMouseMove={(e) => {
          if (!isMagnifierActive) return;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            mouseX.set(e.clientX - rect.left);
            mouseY.set(e.clientY - rect.top);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            mouseX.set(e.clientX - rect.left);
            mouseY.set(e.clientY - rect.top);
            setIsMagnifierActive(true);
          }
        }}
        onClick={() => {
          if (isMagnifierActive) {
            setIsMagnifierActive(false);
          }
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 transition-opacity">
            <WaterProgress size={24} strokeWidth={2} duration={2000} />
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <span className="text-sm text-muted-foreground">
              Preview timed out
            </span>
            <Button variant="outline" size="sm" onClick={handleReload}>
              Try Again
            </Button>
          </div>
        )}

        <div
          style={{
            width: typeof dimensions.width === "number" ? `${dimensions.width}px` : dimensions.width,
            height: typeof dimensions.height === "number" ? `${dimensions.height}px` : dimensions.height,
            // Apply visual zoom via transform (like Chrome DevTools device frame)
            // The actual content zoom is handled via viewport meta tag
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "width 0.2s ease-out, height 0.2s ease-out, transform 0.2s ease-out",
            boxShadow: selectedDevice !== "Responsive" ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "none",
            // Ensure minimum size constraints (like Chrome DevTools)
            minWidth: typeof dimensions.width === "number" ? `${Math.max(200, dimensions.width)}px` : "200px",
            minHeight: typeof dimensions.height === "number" ? `${Math.max(200, dimensions.height)}px` : "200px",
          }}
          className={cn(
            "relative bg-background overflow-visible",
            selectedDevice !== "Responsive" && "border border-border/50 rounded-xl"
          )}
        >
          {/* Resize Handles */}
          {selectedDevice === "Responsive" && (
            <>
              {/* Right handle */}
              <motion.div
                drag="x"
                dragMomentum={false}
                onDragStart={() => {
                  // If width is empty or using container dimensions, capture current width
                  if ((!customWidth || customWidth === "") && iframeRef.current) {
                    const currentWidth = Math.round(iframeRef.current.offsetWidth / zoom);
                    setCustomWidth(currentWidth.toString());
                  }
                }}
                onDrag={(_, info) => {
                  const current = parseInt(customWidth || "0") || (iframeRef.current ? Math.round(iframeRef.current.offsetWidth / zoom) : containerDimensions.width);
                  // Adjust for zoom level when dragging
                  const newWidth = Math.max(200, current + Math.round(info.delta.x / zoom));
                  setCustomWidth(newWidth.toString());
                }}
                className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 z-30 flex items-center justify-center group"
              >
                <div className="h-12 w-1.5 bg-border/40 rounded-full group-hover:bg-primary/50 transition-colors" />
              </motion.div>

              {/* Bottom handle */}
              <motion.div
                drag="y"
                dragMomentum={false}
                onDragStart={() => {
                  // If height is empty or using container dimensions, capture current height
                  if ((!customHeight || customHeight === "") && iframeRef.current) {
                    const currentHeight = Math.round(iframeRef.current.offsetHeight / zoom);
                    setCustomHeight(currentHeight.toString());
                  }
                }}
                onDrag={(_, info) => {
                  const current = parseInt(customHeight || "0") || (iframeRef.current ? Math.round(iframeRef.current.offsetHeight / zoom) : containerDimensions.height);
                  // Adjust for zoom level when dragging
                  const newHeight = Math.max(200, current + Math.round(info.delta.y / zoom));
                  setCustomHeight(newHeight.toString());
                }}
                className="absolute -bottom-1 left-0 right-0 h-3 cursor-row-resize hover:bg-primary/20 active:bg-primary/40 z-30 flex items-center justify-center group"
              >
                <div className="w-12 h-1.5 bg-border/40 rounded-full group-hover:bg-primary/50 transition-colors" />
              </motion.div>

              {/* Corner handle */}
              <motion.div
                drag
                dragMomentum={false}
                onDragStart={() => {
                  if (iframeRef.current) {
                    if (!customWidth || customWidth === "") {
                      setCustomWidth(Math.round(iframeRef.current.offsetWidth / zoom).toString());
                    }
                    if (!customHeight || customHeight === "") {
                      setCustomHeight(Math.round(iframeRef.current.offsetHeight / zoom).toString());
                    }
                  }
                }}
                onDrag={(_, info) => {
                  const curW = parseInt(customWidth || "0") || (iframeRef.current ? Math.round(iframeRef.current.offsetWidth / zoom) : containerDimensions.width);
                  const curH = parseInt(customHeight || "0") || (iframeRef.current ? Math.round(iframeRef.current.offsetHeight / zoom) : containerDimensions.height);
                  // Adjust for zoom level when dragging
                  setCustomWidth(Math.max(200, curW + Math.round(info.delta.x / zoom)).toString());
                  setCustomHeight(Math.max(200, curH + Math.round(info.delta.y / zoom)).toString());
                }}
                className="absolute -right-2 -bottom-2 w-5 h-5 cursor-nwse-resize hover:scale-110 active:scale-95 z-30 rounded-full border-2 border-primary bg-background shadow-lg transition-transform flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              </motion.div>
            </>
          )}

          <iframe
            key={key}
            ref={iframeRef}
            src="/preview/frame"
            sandbox="allow-scripts allow-same-origin allow-forms"
            // @ts-ignore - credentialless is a newer attribute that helps with COEP
            credentialless="true"
            onLoad={handleLoad}
            className="border-0 relative z-10"
            style={{
              width: typeof dimensions.width === "number" ? `${dimensions.width}px` : "100%",
              height: typeof dimensions.height === "number" ? `${dimensions.height}px` : "100%",
              display: "block",
              overflow: "hidden",
            }}
            scrolling="no"
            title="Live preview"
          />

          {/* Magnifier Lens Overlay */}
          <AnimatePresence>
            {isMagnifierActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                style={{
                  left: lensX,
                  top: lensY,
                  x: "-50%",
                  y: "-50%",
                }}
                className="absolute w-56 h-56 border-3 border-primary/50 rounded-full overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[100] pointer-events-none backdrop-blur-sm"
              >
                <div className="absolute inset-0 border-[12px] border-black/10 rounded-full z-20 pointer-events-none" />
                <div
                  className="absolute inset-0 bg-background"
                  style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    transform: `scale(${zoom * 4})`,
                    // Calculate relative position within the iframe box
                    transformOrigin: `${mouseX.get() - ((containerRef.current?.clientWidth || 0) - (iframeRef.current?.clientWidth || 0) * zoom) / 2}px ${mouseY.get() - 16}px`,
                    position: 'absolute',
                    left: 0,
                    top: 0
                  }}
                >
                  <iframe
                    src="/preview/frame"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '0',
                      pointerEvents: 'none'
                    }}
                    onLoad={(e) => {
                      const frame = e.currentTarget;
                      const win = frame.contentWindow;
                      if (win) win.postMessage({ type: "setPreviewHtml", html: srcDoc }, window.location.origin);
                    }}
                  />
                </div>
                {/* Crosshair & Glass Effect */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="w-full h-[1px] bg-primary/20" />
                  <div className="h-full w-[1px] bg-primary/20 absolute" />
                  <div className="w-3 h-3 border border-primary/40 rounded-full" />
                  <div className="absolute top-4 right-8 w-8 h-4 bg-white/10 rounded-full blur-md rotate-[-45deg]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
