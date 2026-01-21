"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
}

function generateMultiFileHtmlDocument(
  files: ComponentFile[],
  framework: Framework
): string {
  const baseStyles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      padding: 16px;
      min-height: 100vh;
    }
    #root {
      width: 100%;
      min-height: 100%;
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
    const safeVueCode = vueCode.replace(/`/g, "\\`").replace(/\$/g, "\\$");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${baseStyles}
            ${cssFiles.map((f) => f.code).join("\n")}
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import { createApp, reactive, ref, computed } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
            const source = \`${safeVueCode}\`;
            
            // Extract template
            const templateMatch = source.match(/<template[^>]*>([\\s\\S]*?)<\\/template>/i);
            const template = templateMatch ? templateMatch[1].trim() : null;
            
            // Extract script setup
            const scriptSetupMatch = source.match(/<script[^>]*\\s+setup[^>]*>([\\s\\S]*?)<\\/script>/i);
            const scriptSetup = scriptSetupMatch ? scriptSetupMatch[1].trim() : null;
            
            // Extract regular script (fallback)
            const scriptMatch = source.match(/<script[^>]*(?!\\s+setup)[^>]*>([\\s\\S]*?)<\\/script>/i);
            const script = scriptMatch ? scriptMatch[1].trim() : null;
            
            if (!template) {
              document.getElementById("root").innerHTML = '<div class="error-display">Vue preview: missing &lt;template&gt; block.</div>';
            } else {
              try {
                let componentOptions = { template };
                
                if (scriptSetup) {
                  // Transform script setup to a setup function
                  // This extracts reactive data and makes it available to template
                  const setupCode = scriptSetup.trim();
                  
                  // Create a setup function wrapper
                  // Note: Full script setup support requires Vue compiler, this is a basic approximation
                  componentOptions.setup = function() {
                    // Execute script setup code in this context
                    // Variables declared with const/let/var will be available
                    try {
                      // Use eval to execute in current scope (limited support)
                      const setupContext = { reactive, ref, computed };
                      const setupFn = new Function(...Object.keys(setupContext), setupCode);
                      const result = setupFn(...Object.values(setupContext));
                      
                      // Return all variables from script setup
                      // This is a simplified approach - full support needs compiler
                      return result || {};
                    } catch (e) {
                      console.warn('Vue script setup execution warning:', e);
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
                    // Ignore script errors, use template only
                  }
                }
                
                createApp(componentOptions).mount("#root");
              } catch (e) {
                document.getElementById("root").innerHTML = '<div class="error-display">Vue preview error: ' + (e.message || String(e)) + '</div>';
              }
            }
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    const { mode, runtimeCode, error, autoDetectedPackages } = generatePreviewRuntime(reactCode);

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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              align-items: center;
              justify-content: center;
            }
            #root {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
              max-width: 100%;
              max-height: 100%;
              overflow: auto;
              padding: 16px;
              box-sizing: border-box;
            }
            #root > * {
              max-width: 100%;
              max-height: 100%;
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
              background: #111;
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

export function LivePreview({ files, framework, className }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const srcDoc = useMemo(
    () => generateMultiFileHtmlDocument(files, framework),
    [files, framework]
  );

  const handleReload = useCallback(() => {
    setKey((k) => k + 1);
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [srcDoc]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading, key]);

  return (
    <div
      className={cn(
        "relative flex flex-col bg-muted/30 rounded-lg overflow-hidden",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-background/50">
        <span className="text-xs font-medium text-muted-foreground">
          Live Preview
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleReload}
            title="Reload preview"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleLoad}
          className="w-full h-full border-0"
          title="Live preview"
        />
      </div>
    </div>
  );
}
