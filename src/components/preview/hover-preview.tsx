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

  // Multi-file HTML+CSS+JS
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
          <div id="root">${htmlCode}</div>
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
          <div id="root">${code}</div>
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
          <div id="root">
            <div class="preview-container">
              <div class="box">1</div>
              <div class="box">2</div>
              <div class="box">3</div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

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
          <style>${baseStyles}${cssCode}</style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            import { createApp, reactive, ref, computed } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
            const source = \`${safeVueCode}\`;
            
            const templateMatch = source.match(/<template[^>]*>([\\s\\S]*?)<\\/template>/i);
            const template = templateMatch ? templateMatch[1].trim() : null;
            
            const scriptSetupMatch = source.match(/<script[^>]*\\s+setup[^>]*>([\\s\\S]*?)<\\/script>/i);
            const scriptSetup = scriptSetupMatch ? scriptSetupMatch[1].trim() : null;
            
            const scriptMatch = source.match(/<script[^>]*(?!\\s+setup)[^>]*>([\\s\\S]*?)<\\/script>/i);
            const script = scriptMatch ? scriptMatch[1].trim() : null;
            
            if (!template) {
              document.getElementById("root").innerHTML = '<div style="color:#ef4444;padding:16px;font-family:monospace;font-size:12px;">Vue preview: missing &lt;template&gt; block.</div>';
            } else {
              try {
                let componentOptions = { template };
                
                if (scriptSetup) {
                  const setupCode = scriptSetup.trim();
                  componentOptions.setup = function() {
                    try {
                      const setupContext = { reactive, ref, computed };
                      const setupFn = new Function(...Object.keys(setupContext), setupCode);
                      return setupFn(...Object.values(setupContext)) || {};
                    } catch (e) {
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
                  } catch (e) {}
                }
                
                createApp(componentOptions).mount("#root");
              } catch (e) {
                document.getElementById("root").innerHTML = '<div style="color:#ef4444;padding:16px;font-family:monospace;font-size:12px;">Vue preview error: ' + (e.message || String(e)) + '</div>';
              }
            }
          </script>
        </body>
      </html>
    `;
  }

  if (framework === "react" || framework === "next") {
    const code = reactCode || (files[0]?.code ?? "");

    // Generate preview runtime (original code is NOT modified)
    // Auto-detection happens automatically - no user prompts
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
            <div id="root">
              <div style="color: #fbbf24; padding: 24px; text-align: center; font-family: system-ui;">
                <p style="margin: 0 0 8px 0; font-weight: 600;">Preview Unavailable</p>
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

    const runtimeLiteral = JSON.stringify(runtimeCode)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$")
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
                root.innerHTML = '<div style="color:#ef4444;padding:16px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12px;white-space:pre-wrap;background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;">' +
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
        <div id="root">
          <div class="placeholder">Code preview</div>
        </div>
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

  const srcDoc = useMemo(
    () => (isActive ? generateHoverPreviewDocument(files, framework) : ""),
    [files, framework, isActive]
  );

  useEffect(() => {
    if (!isActive) {
      setIsLoaded(false);
    }
  }, [isActive]);

  // Timeout guard
  useEffect(() => {
    if (!isActive) return;

    const timeout = setTimeout(() => {
      if (!isLoaded) {
        setIsLoaded(true); // Force show even if not loaded
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isActive, isLoaded]);

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
      <div className="absolute top-2 right-2 z-20">
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-400 rounded">
          LIVE
        </span>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        onLoad={() => setIsLoaded(true)}
        className="w-full h-full border-0 rounded-t-lg"
        title="Hover preview"
      />
    </div>
  );
}
