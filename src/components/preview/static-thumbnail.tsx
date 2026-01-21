"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/detect-framework";

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

  const htmlCode = htmlFile?.code ?? "";
  const cssCode = cssFiles.map((f) => f.code).join("\n");
  const jsCode = jsFiles.map((f) => f.code).join("\n");
  const reactCode = reactFiles.map((f) => f.code).join("\n");

  // Multi-file HTML+CSS+JS (static preview - no JS execution for performance)
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
          <div id="root">${htmlCode}</div>
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
          <div id="root">
            <div class="preview">CSS Preview</div>
          </div>
        </body>
      </html>
    `;
  }

  if (framework === "react" || framework === "next" || framework === "vue" || framework === "angular") {
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
          <div id="root">
            <div class="react-placeholder">
              <svg class="react-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="2.5" fill="#61dafb"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(60 12 12)"/>
                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61dafb" stroke-width="1" fill="none" transform="rotate(120 12 12)"/>
              </svg>
              <span class="react-label">${
                framework === "next"
                  ? "Next.js"
                  : framework === "vue"
                    ? "Vue"
                    : framework === "angular"
                      ? "Angular"
                      : "React"
              } Component</span>
            </div>
          </div>
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
        <div id="root">
          <div class="code-placeholder">
            <span class="code-icon">&lt;/&gt;</span>
            <span class="code-label">Code Snippet</span>
          </div>
        </div>
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
        sandbox=""
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
