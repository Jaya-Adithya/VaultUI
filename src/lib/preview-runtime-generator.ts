/**
 * Preview Runtime Generator
 * 
 * Generates a disposable preview runtime WITHOUT modifying original code.
 * This is the "adapter layer" that makes previews work.
 * 
 * Strategy: Registry first → Auto-detect fallback (automatic, no prompts)
 *
 * Important: Stored code may contain TS/TSX. Preview runtime must compile it
 * (preview-only) before execution. Stored code remains untouched.
 */

import {
  extractImports,
  decidePreviewMode,
  getDependencyConfig,
  isValidNpmPackage,
  isBrowserSafePackage,
  generateAutoCdnUrl,
  getAutoDetectedPackages,
  type PreviewMode,
} from "./dependency-registry";

type ImportKind = "sideEffect" | "namespace" | "named" | "default" | "defaultNamed";

type ParsedImport = {
  kind: ImportKind;
  module: string;
  start: number;
  end: number; // exclusive
  defaultName?: string;
  namespaceName?: string;
  named?: Array<{ imported: string; local: string }>;
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scan and parse top-level import statements (including multi-line).
 * Returns parsed imports + code with those import ranges removed.
 * Uses a character-by-character state machine for reliability.
 */
function scanTopLevelImports(code: string): { imports: ParsedImport[]; codeWithoutImports: string } {
  const imports: ParsedImport[] = [];
  const lines = code.split(/\r?\n/);
  const toRemove: boolean[] = new Array(lines.length).fill(false);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Only process lines that start with "import" at the top level
    if (trimmed.startsWith("import")) {
      let j = i;
      let importText = trimmed;
      let foundSemicolon = trimmed.includes(";");

      // Collect continuation lines until we find a semicolon
      while (!foundSemicolon && j < lines.length - 1) {
        j++;
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();

        // If the next line starts a new import, do NOT treat it as a continuation.
        // This supports semicolon-less import style:
        //   import gsap from 'gsap'
        //   import { ScrollTrigger } from 'gsap/ScrollTrigger';
        if (nextTrimmed.startsWith("import")) {
          j--; // back up so the outer loop processes the next import normally
          break;
        }

        // Stop if we hit a non-continuation line
        if (nextTrimmed && !nextTrimmed.match(/^(from|,|\{|\}|\*|\/\/)/) && !nextTrimmed.match(/^[a-zA-Z_$]/)) {
          j--; // Back up one line
          break;
        }

        importText += " " + nextTrimmed;
        if (nextTrimmed.includes(";")) {
          foundSemicolon = true;
        }
      }

      // Parse the import statement
      const startPos = lines.slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
      const endPos = lines.slice(0, j + 1).join("\n").length + (j > 0 ? 1 : 0);

      const parsed = parseImportStatement(importText, startPos, endPos);
      if (parsed) {
        imports.push(parsed);
        // Mark lines for removal
        for (let k = i; k <= j; k++) {
          toRemove[k] = true;
        }
      }

      i = j; // Skip processed lines
    }
  }

  if (imports.length === 0) {
    return { imports: [], codeWithoutImports: code };
  }

  // Rebuild code without import lines
  const filteredLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!toRemove[i]) {
      filteredLines.push(lines[i]);
    }
  }

  let out = filteredLines.join("\n");

  // Final safety check: remove any remaining import statements
  out = out.replace(/^\s*import\s+.*?;?\s*$/gm, "");

  return { imports, codeWithoutImports: out };
}

function parseImportStatement(stmt: string, start: number, end: number): ParsedImport | null {
  // Side-effect import: import "x";
  const sideEffect = stmt.match(/^import\s+["']([^"']+)["']\s*;?$/);
  if (sideEffect) {
    return { kind: "sideEffect", module: sideEffect[1], start, end };
  }

  // General: import ... from "x";
  const fromMatch = stmt.match(/from\s+["']([^"']+)["']\s*;?$/);
  if (!fromMatch) return null;
  const module = fromMatch[1];

  // specifiers part: between 'import' and 'from'
  const specPart = stmt
    .replace(/^import\s+/, "")
    .replace(/\s+from\s+["'][^"']+["']\s*;?$/, "")
    .trim()
    .replace(/\btype\b\s*/g, ""); // drop TS 'type' keyword in import

  // Namespace import: * as Name
  const ns = specPart.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (ns) {
    return { kind: "namespace", module, start, end, namespaceName: ns[1] };
  }

  // Named import: { ... }
  const namedOnly = specPart.match(/^\{([\s\S]*)\}$/);
  if (namedOnly) {
    const named = parseNamedList(namedOnly[1]);
    return { kind: "named", module, start, end, named };
  }

  // Default + named: Default, { ... }
  const defNamed = specPart.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
  if (defNamed) {
    const named = parseNamedList(defNamed[2]);
    return { kind: "defaultNamed", module, start, end, defaultName: defNamed[1], named };
  }

  // Default import: Default
  const def = specPart.match(/^([A-Za-z_$][\w$]*)$/);
  if (def) {
    return { kind: "default", module, start, end, defaultName: def[1] };
  }

  return null;
}

function parseNamedList(list: string): Array<{ imported: string; local: string }> {
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^\s*type\s+/, "")) // strip TS type in named import
    .map((part) => {
      const pieces = part.split(/\s+as\s+/);
      const imported = pieces[0]?.trim() ?? "";
      const local = (pieces[1] ?? pieces[0])?.trim() ?? "";
      return { imported, local };
    })
    .filter((x) => x.imported && x.local);
}

/**
 * Extract class names from CSS to create a CSS module object
 */
function extractClassNamesFromCSS(cssCode: string): Record<string, string> {
  const classNames: Record<string, string> = {};

  // Match CSS class selectors: .className { ... } or .className:something { ... }
  // Also handle nested selectors and pseudo-classes
  const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)(?::[a-zA-Z-]+|\[[^\]]+\])?\s*\{/g;
  let match;
  const seen = new Set<string>();

  while ((match = classRegex.exec(cssCode)) !== null) {
    const className = match[1];
    // Avoid duplicates
    if (seen.has(className)) continue;
    seen.add(className);

    // CSS modules typically use camelCase or keep original name
    // For simplicity, we'll use the original class name as both key and value
    // In a real CSS module, the class name would be hashed, but for preview we'll use the original
    classNames[className] = className;
  }

  return classNames;
}

export interface PreviewRuntimeResult {
  mode: PreviewMode;
  runtimeCode: string | null;
  error?: string;
  autoDetectedPackages?: string[]; // For warnings/badges
}

/**
 * Generate preview runtime code
 * 
 * IMPORTANT: Original code is included AS-IS, never modified.
 * Auto-detection happens automatically - no user prompts.
 */
export function generatePreviewRuntime(
  originalCode: string,
  componentName?: string,
  allFiles?: Array<{ filename: string; code: string }>
): PreviewRuntimeResult {
  const imports = extractImports(originalCode);

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewRuntime', message: 'generatePreviewRuntime called', data: { imports, importsCount: imports.length, hasAllFiles: !!allFiles, allFilesCount: allFiles?.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
  // #endregion

  const mode = decidePreviewMode(imports);

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewRuntime', message: 'Preview mode determined', data: { mode, imports }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
  // #endregion

  if (mode === "disabled") {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewRuntime', message: 'Preview disabled - returning error', data: { imports }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    return {
      mode: "disabled",
      runtimeCode: null,
      error: "Some dependencies are not supported for preview (server-only or unsafe packages detected)",
    };
  }

  // Get auto-detected packages for warnings
  const autoDetectedPackages = mode === "auto" ? getAutoDetectedPackages(imports) : [];

  // Generate dependency loader (handles registry + auto-detection)
  const dependencyLoader = generateDependencyLoader(imports, mode === "auto");

  // Generate preview wrapper SOURCE (TS/TSX allowed). We'll compile in the iframe.
  const previewSource = generatePreviewWrapperSource(
    originalCode,
    componentName,
    mode === "auto",
    allFiles
  );

  // IMPORTANT: this string is embedded into an HTML <script>. We must escape:
  // - U+2028 / U+2029 which can break JS parsing in some environments
  // - </script> which can prematurely terminate the script tag
  const vaultSourceLiteral = JSON.stringify(previewSource)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/<\/script/gi, "<\\/script");

  // Combine into runtime
  const runtimeCode = `
    (async () => {
      try {
        // Import React and ReactDOM - these are async ESM imports
        const ReactModule = await import("https://esm.sh/react@18");
        const React = ReactModule.default || ReactModule;
        const ReactDOMModule = await import("https://esm.sh/react-dom@18/client");
        const { createRoot } = ReactDOMModule;
        const BabelModule = await import("https://esm.sh/@babel/standalone@7.26.10");
        const Babel = BabelModule.default || BabelModule;
        
        // Load dependencies
        window.__deps = window.__deps || {};
        ${dependencyLoader}
        
        const __VAULT_SOURCE__ = ${vaultSourceLiteral};
        const __VAULT_TIMEOUT_MS__ = 5000;
        const __VAULT_START__ = Date.now();

        function __vaultRenderError(err) {
          const rootElement = document.getElementById("root");
          if (!rootElement) return;
          const message = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
          let extra = "";
          let helpfulTips = "";
          
          // Add helpful tips for common syntax errors
          const errorStr = String(message).toLowerCase();
          if (errorStr.includes("syntaxerror") || errorStr.includes("unexpected token") || errorStr.includes("invalid")) {
            helpfulTips = "\\n\\n🔍 Common Syntax Issues to Check:\\n";
            helpfulTips += "• Missing '=' in function declaration (e.g., 'const Button () =>' should be 'const Button = () =>')\\n";
            helpfulTips += "• Unclosed brackets, braces, or parentheses\\n";
            helpfulTips += "• Invalid characters in JSX (check for stray text or numbers)\\n";
            helpfulTips += "• Missing closing tags in JSX\\n";
            helpfulTips += "• Incorrect arrow function syntax\\n";
            helpfulTips += "• Stray semicolons or unexpected tokens";
          }
          
          try {
            const deps = window.__deps || {};
            const rdp = deps["react-day-picker"];
            const luc = deps["lucide-react"];
            // Add extra diagnostics for common missing symbols
            if (String(message).includes("DayPicker is not defined")) {
              extra += "\\n\\n[debug] __deps['react-day-picker'] keys: " + (rdp ? Object.keys(rdp).join(", ") : "MISSING");
              extra += "\\n[debug] __deps['react-day-picker'].default keys: " + (rdp && rdp.default ? Object.keys(rdp.default).join(", ") : "MISSING");
            }
            if (String(message).includes("ChevronLeft") || String(message).includes("Lucide")) {
              extra += "\\n\\n[debug] __deps['lucide-react'] keys: " + (luc ? Object.keys(luc).slice(0, 30).join(", ") : "MISSING");
            }
          } catch {}
          rootElement.innerHTML = \`
            <div style="color:#ef4444;padding:16px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12px;white-space:pre-wrap;background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;">
              <div style="font-weight:600;margin-bottom:8px;color:#fca5a5;">❌ Error</div>
              <div style="color:#fca5a5;">\${message}\${extra}\${helpfulTips}</div>
            </div>\`;
        }
        
        // Global error handler to catch unhandled errors
        window.addEventListener('error', function(e) {
          __vaultRenderError(e.error || e.message || 'Unknown error');
        });
        
        window.addEventListener('unhandledrejection', function(e) {
          __vaultRenderError(e.reason || 'Unhandled promise rejection');
        });

        try {
          if (Date.now() - __VAULT_START__ > __VAULT_TIMEOUT_MS__) {
            throw new Error("Preview timed out before compilation");
          }

          // Basic validation before Babel compilation
          const sourceStr = String(__VAULT_SOURCE__);
          
          // Check for common syntax errors that Babel might not catch clearly
          if (sourceStr.includes("const ") && sourceStr.match(/const\s+\w+\s*\(\s*\)\s*=>/)) {
            const match = sourceStr.match(/const\s+(\w+)\s*\(\s*\)\s*=>/);
            if (match && !sourceStr.includes("const " + match[1] + " =")) {
              throw new Error("Syntax Error: Missing '=' in function declaration.\\n\\nFound: const " + match[1] + " () =>\\nShould be: const " + match[1] + " = () =>\\n\\nArrow functions require an equals sign between the name and the parameters.");
            }
          }
          
          let transformed;
          try {
            // Ensure TypeScript types are properly stripped by Babel
            transformed = Babel.transform(__VAULT_SOURCE__, {
              presets: [
                ["typescript", { 
                  isTSX: true, 
                  allExtensions: true
                }],
                ["react", { runtime: "classic" }],
              ],
              filename: "VaultPreview.tsx",
            }).code;

          } catch (compileError) {
            // DEBUG: Log compilation error details
            console.error('[PreviewRuntime] Babel compilation failed:', {
              error: compileError.message || String(compileError),
              sourcePreview: __VAULT_SOURCE__.substring(0, 500),
              sourceLength: __VAULT_SOURCE__.length
            });
            const errorMsg = compileError.message || String(compileError);
            let detailedMsg = "Babel compilation failed: " + errorMsg;
            
            // Add specific guidance based on error type
            if (errorMsg.includes("Unexpected token") || errorMsg.includes("Invalid")) {
              detailedMsg += "\\n\\n💡 This usually indicates:\\n";
              detailedMsg += "• A syntax error in your JSX or JavaScript code\\n";
              detailedMsg += "• Missing or mismatched brackets, braces, or parentheses\\n";
              detailedMsg += "• Invalid characters or unexpected text in your code\\n";
              detailedMsg += "• Incorrect arrow function syntax (missing '=')\\n";
              detailedMsg += "\\n📝 Tip: Check the line number mentioned in the error and look for syntax issues around that area.";
            } else {
              detailedMsg += "\\n\\nThis usually means there's a syntax error in your code. Please check for:\\n";
              detailedMsg += "• Missing or extra brackets, braces, or parentheses\\n";
              detailedMsg += "• Incorrect JSX syntax\\n";
              detailedMsg += "• Invalid TypeScript syntax";
            }
            
            throw new Error(detailedMsg);
          }

          // Make React available globally for the eval'd code
          // This must happen BEFORE eval so React is available during code execution
          window.React = React;
          window.ReactDOM = { createRoot };

          // Execute the transformed code directly
          // React bindings are already included in the preview source via generatePreviewWrapperSource
          try {
            eval(transformed);
          } catch (evalError) {
            // Provide more context for syntax errors
            const errorMsg = evalError.message || String(evalError);
            if (errorMsg.includes("SyntaxError") || errorMsg.includes("Unexpected token") || errorMsg.includes("Invalid")) {
              throw new Error("Syntax Error: " + errorMsg + "\\n\\nTip: Check your code for:\\n- Missing or extra brackets, braces, parentheses, or semicolons\\n- Incorrect JSX syntax (e.g., closing tags)\\n- Invalid characters or unexpected tokens\\n- Missing '=' in arrow function declarations");
            }
            throw evalError;
          }

          // Check for the preview component
          const Preview = globalThis.__VaultPreview;
          if (typeof Preview !== "function") {
            // Try to find any exported component or the last defined component
            const possibleComponents = [
              globalThis.ExportedComponent,
              globalThis.Component,
              window.Component,
            ];
            
            let foundComponent = null;
            for (const comp of possibleComponents) {
              if (typeof comp === "function") {
                foundComponent = comp;
                break;
              }
            }
            
            if (!foundComponent) {
              // Try to extract component name from source
              const componentMatch = __VAULT_SOURCE__.match(/(?:const|function|class)\s+(\w+)\s*[=(]/);
              if (componentMatch) {
                const compName = componentMatch[1];
                foundComponent = globalThis[compName] || window[compName];
              }
            }
            
            if (foundComponent) {
              // Create a wrapper function
              globalThis.__VaultPreview = function() {
                return React.createElement(foundComponent);
              };
            } else {
              throw new Error("Preview component was not created.\\n\\nMake sure your component is:\\n- Properly exported (export default ComponentName or export const ComponentName)\\n- Or defined as a const/function/class\\n- And has no syntax errors");
            }
          }

          const rootElement = document.getElementById("root");
          if (rootElement) {
            const root = createRoot(rootElement);
            root.render(React.createElement(Preview));
          }
        } catch (e) {
          __vaultRenderError(e);
        }
      } catch (e) {
        const rootElement = document.getElementById("root");
        if (rootElement) {
          const message = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
          rootElement.innerHTML = \`
            <div style="color:#ef4444;padding:16px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;font-size:12px;white-space:pre-wrap;background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;">
              <div style="font-weight:600;margin-bottom:8px;color:#fca5a5;">❌ Error</div>
              <div style="color:#fca5a5;">\${message}</div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(239,68,68,0.3);opacity:0.8;">
                Note: Universal preview attempts to load packages automatically. If a package fails to load, it might not have a browser-compatible ESM build available on esm.sh.
              </div>
            </div>\`;
        }
      }
    })();
  `;

  return {
    mode,
    runtimeCode: runtimeCode.trim(),
    autoDetectedPackages: autoDetectedPackages.length > 0 ? autoDetectedPackages : undefined,
  };
}

/**
 * Generate dependency loader code
 * Automatically handles registry + auto-detection (no user prompts)
 * Uses dynamic imports for async compatibility
 */
function generateDependencyLoader(imports: string[], allowAutoDetect: boolean = false): string {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generateDependencyLoader', message: 'generateDependencyLoader called', data: { imports, allowAutoDetect }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
  // #endregion

  const loaders: string[] = [];
  const shims: string[] = [];
  const autoDetected: string[] = [];
  const processed = new Set<string>();

  // Helper to process a dependency and its peer dependencies
  const processDependency = (imp: string) => {
    if (processed.has(imp)) return;
    processed.add(imp);

    // Skip React - handled separately
    if (imp === "react" || imp === "react-dom") return;

    // Handle subpath imports (e.g., "gsap/ScrollTrigger", "next/image")
    // These need to be loaded separately from their base package
    if (imp.includes('/') && !imp.startsWith('@') && !imp.startsWith('./') && !imp.startsWith('../')) {
      const basePackage = imp.split('/')[0];
      const subpath = imp.substring(basePackage.length + 1);

      // For gsap subpath imports, load them from esm.sh
      if (basePackage === 'gsap' || basePackage === 'motion') {
        const importName = imp.replace(/[^a-zA-Z0-9]/g, "_");
        // Load the subpath import from esm.sh
        // Note: gsap/ScrollTrigger exports ScrollTrigger as a named export, not default
        loaders.push(`const ${importName}Module = await import("https://esm.sh/${imp}");`);
        loaders.push(`const ${importName} = ${importName}Module.default || ${importName}Module;`);
        loaders.push(`window.__deps = window.__deps || {};`);
        loaders.push(`window.__deps["${imp}"] = ${importName}Module;`);
        // Store the module itself (not just default) so named exports are accessible
        loaders.push(`window.${importName} = ${importName}Module;`);
        autoDetected.push(imp);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generateDependencyLoader', message: 'Loading subpath import', data: { imp, basePackage, subpath }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        return;
      }

      // For other subpath imports (like next/image), skip - they're handled in preview wrapper
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generateDependencyLoader', message: 'Skipping subpath import in loader', data: { imp }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      return;
    }

    const config = getDependencyConfig(imp);

    if (config) {
      // Load peer dependencies first
      if (config.peerDependencies) {
        for (const peerDep of config.peerDependencies) {
          if (!processed.has(peerDep)) {
            processDependency(peerDep);
          }
        }
      }

      // Known dependency - use registry config (FAST, SAFE)
      if (config.type === "cdn" && config.cdn) {
        const importName = config.global || imp.replace(/[^a-zA-Z0-9]/g, "_");
        // Use dynamic import for async compatibility
        loaders.push(`const ${importName}Module = await import("${config.cdn}");`);
        loaders.push(`const ${importName} = ${importName}Module.default || ${importName}Module;`);
        loaders.push(`window.__deps = window.__deps || {};`);
        loaders.push(`window.__deps["${imp}"] = ${importName}Module;`);
        // Also expose the default export directly on window for easier access
        loaders.push(`window.${importName} = ${importName};`);
      } else if (config.type === "shim" && config.shim) {
        // Add shim code (remove export if present, shims are inlined)
        const shimCode = config.shim.replace(/^\s*export\s+/gm, '').trim();
        shims.push(shimCode);
      }
    } else if (allowAutoDetect && isValidNpmPackage(imp) && isBrowserSafePackage(imp)) {
      // Unknown but safe dependency - auto-detect via esm.sh (FLEXIBLE)
      const importName = imp.replace(/[^a-zA-Z0-9]/g, "_");
      const autoCdnUrl = generateAutoCdnUrl(imp);
      loaders.push(`const ${importName}Module = await import("${autoCdnUrl}");`);
      loaders.push(`const ${importName} = ${importName}Module.default || ${importName}Module;`);
      loaders.push(`window.__deps = window.__deps || {};`);
      loaders.push(`window.__deps["${imp}"] = ${importName}Module;`);
      // Also expose on window for easier access
      loaders.push(`window.${importName} = ${importName};`);
      autoDetected.push(imp);
    }
  };

  // Process all dependencies
  for (const imp of imports) {
    processDependency(imp);
  }

  // Add comment for auto-detected packages (for transparency)
  if (autoDetected.length > 0) {
    loaders.unshift(`// Auto-detected packages: ${autoDetected.join(", ")}`);
  }

  return [...shims, ...loaders].join("\n        ");
}

/**
 * Generate preview wrapper
 * 
 * Wraps original code WITHOUT modifying it.
 */
function generatePreviewWrapperSource(
  originalCode: string,
  componentName?: string,
  hasAutoDetected: boolean = false,
  allFiles?: Array<{ filename: string; code: string }>
): string {
  const { imports: parsedImports, codeWithoutImports } = scanTopLevelImports(originalCode);
  // Extract component name if not provided
  let detectedComponentName = componentName;
  if (!detectedComponentName) {
    // Try to find exported component
    const defaultExportMatch = originalCode.match(/export\s+default\s+(?:function\s+)?(\w+)/);
    const namedExportMatch = originalCode.match(/export\s+(?:const|function|class)\s+(\w+)/);
    const exportMatch = originalCode.match(/export\s*\{\s*(\w+)/);

    detectedComponentName = defaultExportMatch?.[1] ||
      namedExportMatch?.[1] ||
      exportMatch?.[1] ||
      "Component";
  }

  // Track which dependencies are CDN imports (already imported in dependencyLoader)
  const moduleToDepVar: Record<string, string> = {};
  for (const imp of parsedImports) {
    const mod = imp.module;
    if (mod === "react" || mod === "react-dom") continue;
    if (mod.startsWith("./") || mod.startsWith("../")) continue;

    // Handle subpath imports (e.g., "gsap/ScrollTrigger")
    if (mod.includes('/') && !mod.startsWith('@') && !mod.startsWith('./') && !mod.startsWith('../')) {
      const basePackage = mod.split('/')[0];
      if (basePackage === 'gsap' || basePackage === 'motion') {
        // GSAP and Motion subpath imports are loaded separately
        moduleToDepVar[mod] = mod.replace(/[^a-zA-Z0-9]/g, "_");
      }
      // Other subpath imports (like next/image) are handled separately
      continue;
    }

    const cfg = getDependencyConfig(mod);
    if (cfg?.type === "cdn") {
      moduleToDepVar[mod] = cfg.global || mod.replace(/[^a-zA-Z0-9]/g, "_");
      continue;
    }
    if (hasAutoDetected && !cfg && isValidNpmPackage(mod) && isBrowserSafePackage(mod)) {
      moduleToDepVar[mod] = mod.replace(/[^a-zA-Z0-9]/g, "_");
    }
  }

  // Process original code: imports removed by scanner; keep the rest
  let previewCode = codeWithoutImports;
  // Safety net: if any import lines survived, remove them (preview-only).
  previewCode = previewCode.replace(/^\s*import\s+.*$/gm, "");

  // Remove "use client" directive
  previewCode = previewCode.replace(/["']use\s+client["'];?\n?/g, '');

  // Remove export list statements like: export { Calendar };
  previewCode = previewCode.replace(/export\s*\{[^}]*\}\s*;?\n?/g, "");
  // Remove TS-only exports like: export type X = ...;
  previewCode = previewCode.replace(/export\s+type\s+[^;]+;?\n?/g, "");
  
  // Remove standalone type definitions (type X = ...)
  // This function properly handles multi-line type definitions with balanced braces
  const removeTypeDefinitions = (code: string): string => {
    const lines = code.split('\n');
    const result: string[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const typeMatch = line.match(/^\s*(export\s+)?type\s+(\w+)\s*=/);
      
      if (typeMatch) {
        // Found a type definition, need to find where it ends
        let braceCount = 0;
        let bracketCount = 0;
        let parenCount = 0;
        let inString = false;
        let stringChar = '';
        let j = i;
        let foundSemicolon = false;
        
        // Count braces/brackets/parens to find the end
        while (j < lines.length && !foundSemicolon) {
          const currentLine = lines[j];
          for (let k = 0; k < currentLine.length; k++) {
            const char = currentLine[k];
            const prevChar = k > 0 ? currentLine[k - 1] : '';
            
            // Handle string literals
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
                stringChar = '';
              }
              continue;
            }
            
            if (inString) continue;
            
            // Count braces, brackets, parens
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
            else if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            else if (char === ';' && braceCount === 0 && bracketCount === 0 && parenCount === 0) {
              foundSemicolon = true;
              break;
            }
          }
          
          if (foundSemicolon) break;
          j++;
        }
        
        // Skip all lines from i to j (inclusive)
        i = j + 1;
        continue;
      }
      
      result.push(line);
      i++;
    }
    
    return result.join('\n');
  };
  
  previewCode = removeTypeDefinitions(previewCode);

  // Replace export default with const for preview
  previewCode = previewCode.replace(/export\s+default\s+/g, 'const ExportedComponent = ');
  previewCode = previewCode.replace(/export\s+/g, '');

  // Generate bindings corresponding to original imports.
  // This recreates the identifiers the stored code expects, without executing original imports.
  const bindings: string[] = [];
  const declared = new Set<string>();

  const declareOnce = (name: string, rhs: string) => {
    if (!name) return;
    if (declared.has(name)) return;
    declared.add(name);
    bindings.push(`const ${name} = ${rhs};`);
  };

  for (const imp of parsedImports) {
    const mod = imp.module;
    if (imp.kind === "sideEffect") {
      // ignore: side-effect imports not supported in preview
      continue;
    }

    // Local imports: handle CSS modules and shims
    if (mod.startsWith("./") || mod.startsWith("../")) {
      // Check if it's a CSS module import (e.g., './page.module.css' or './styles.css')
      if (mod.endsWith('.module.css') || mod.endsWith('.css')) {
        // Find matching CSS file - be more flexible with matching
        const cssModulePath = mod.replace(/^\.\//, '').replace(/^\.\.\//, '');
        let cssFile = allFiles?.find(f => {
          const fname = f.filename;
          const importName = cssModulePath;

          // Exact match (case-sensitive first, then case-insensitive)
          if (fname === importName) return true;
          if (fname.toLowerCase() === importName.toLowerCase()) return true;

          // Match without path (just filename)
          const fnameOnly = fname.split('/').pop() || fname;
          const importNameOnly = importName.split('/').pop() || importName;
          if (fnameOnly === importNameOnly) return true;
          if (fnameOnly.toLowerCase() === importNameOnly.toLowerCase()) return true;

          return false;
        });

        // If no exact match, try to find any CSS file (fallback)
        if (!cssFile) {
          cssFile = allFiles?.find((f) => f.filename.endsWith(".css"));
        }

        if (cssFile && cssFile.code) {
          // Generate CSS module object from CSS file
          // Extract class names from CSS and create a styles object
          const classNames = extractClassNamesFromCSS(cssFile.code);
          const stylesObject = JSON.stringify(classNames);

          console.log(`[PreviewRuntime] CSS module import: ${mod} -> ${cssFile.filename}, classes:`, Object.keys(classNames));

          if (imp.kind === "default" && imp.defaultName) {
            // Default import: import styles from './page.module.css'
            declareOnce(imp.defaultName, stylesObject);
          } else if (imp.kind === "namespace" && imp.namespaceName) {
            // Namespace import: import * as styles from './page.module.css'
            declareOnce(imp.namespaceName, stylesObject);
          }
        } else {
          // CSS file not found, create empty styles object
          console.warn(`[PreviewRuntime] CSS module file not found for import: ${mod}`);
          if (imp.kind === "default" && imp.defaultName) {
            declareOnce(imp.defaultName, '{}');
          } else if (imp.kind === "namespace" && imp.namespaceName) {
            declareOnce(imp.namespaceName, '{}');
          }
        }
        continue;
      }

      // Regular local shims
      if (imp.defaultName) {
        // no default export support for local shim modules (skip)
      }
      if (imp.kind === "namespace" && imp.namespaceName) {
        // no namespace module object for shims (skip)
      }
      for (const n of imp.named ?? []) {
        if (n.imported !== n.local) {
          declareOnce(n.local, n.imported);
        }
      }
      continue;
    }

    // React import patterns: we already import React in the runtime.
    if (mod === "react") {
      if (imp.kind === "namespace" && imp.namespaceName) {
        declareOnce(imp.namespaceName, "window.React");
      }
      if (imp.kind === "default" && imp.defaultName) {
        declareOnce(imp.defaultName, "window.React");
      }
      // Handle named React imports (hooks etc.)
      for (const n of imp.named ?? []) {
        const imported = n.imported;
        const local = n.local;
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewWrapperSource', message: 'Binding react named import', data: { imported, local }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'E' }) }).catch(() => { });
        // #endregion
        // Prefer window.React (set by runtime), fall back to deps if present
        declareOnce(
          local,
          `(window.React && window.React.${imported}) || (window.__deps && window.__deps["react"] && (window.__deps["react"].${imported} || (window.__deps["react"].default && window.__deps["react"].default.${imported})))`
        );
      }
      continue;
    }

    // Handle Next.js subpath imports (e.g., "next/image")
    if (mod.startsWith("next/")) {
      if (mod === "next/image") {
        // Provide a shim for Next.js Image component
        if (imp.kind === "default" && imp.defaultName) {
          declareOnce(imp.defaultName, `function NextImage({ src, alt, width, height, className, ...props }) {
            return React.createElement('img', {
              src: src,
              alt: alt || '',
              width: width,
              height: height,
              className: className,
              ...props
            });
          }`);
        }
      } else if (mod === "next/link") {
        // Provide a shim for Next.js Link component
        if (imp.kind === "default" && imp.defaultName) {
          declareOnce(imp.defaultName, `function NextLink({ href, children, ...props }) {
            return React.createElement('a', { href: href, ...props }, children);
          }`);
        }
      } else {
        // Other next/* imports - provide empty object
        if (imp.kind === "default" && imp.defaultName) {
          declareOnce(imp.defaultName, '{}');
        } else if (imp.kind === "namespace" && imp.namespaceName) {
          declareOnce(imp.namespaceName, '{}');
        }
      }
      continue;
    }

    // Handle GSAP and Motion subpath imports
    if (mod.startsWith("gsap/") || mod.startsWith("motion/")) {
      const depVar = mod.replace(/[^a-zA-Z0-9]/g, "_");
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewWrapperSource', message: 'Processing gsap subpath import', data: { mod, depVar, hasModuleToDepVar: !!moduleToDepVar[mod], impKind: imp.kind, hasNamed: !!imp.named, namedCount: imp.named?.length, named: imp.named }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      // Check if the module was loaded in the dependency loader
      const loadedVar = moduleToDepVar[mod] || depVar;

      // Handle named imports: import { ScrollTrigger } from 'gsap/ScrollTrigger'
      if ((imp.kind === "named" || imp.kind === "defaultNamed") && imp.named) {
        for (const n of imp.named) {
          const imported = n.imported;
          const local = n.local;
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'preview-runtime-generator.ts:generatePreviewWrapperSource', message: 'Binding gsap named import', data: { mod, loadedVar, imported, local }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
          // #endregion
          // Access named export from the module (gsap/ScrollTrigger exports ScrollTrigger as named export)
          // Try multiple access patterns: window variable, window.__deps module, window.__deps module.default
          declareOnce(local, `(window.${loadedVar} && window.${loadedVar}.${imported}) || (window.__deps && window.__deps["${mod}"] && window.__deps["${mod}"].${imported}) || (window.__deps && window.__deps["${mod}"] && window.__deps["${mod}"].default && window.__deps["${mod}"].default.${imported}) || (window.__deps && window.__deps["${mod}"] && window.__deps["${mod}"].default && window.__deps["${mod}"].default.${imported}) || {}`);
        }
      }

      // Default import: import ScrollTrigger from 'gsap/ScrollTrigger'
      if (imp.kind === "default" && imp.defaultName) {
        declareOnce(imp.defaultName, `(window.${loadedVar} && window.${loadedVar}.default) || (window.${loadedVar}) || (window.__deps && window.__deps["${mod}"]) || {}`);
      }

      // Namespace import: import * as ScrollTrigger from 'gsap/ScrollTrigger'
      if (imp.kind === "namespace" && imp.namespaceName) {
        declareOnce(imp.namespaceName, `(window.${loadedVar}) || (window.__deps && window.__deps["${mod}"]) || {}`);
      }

      continue;
    }

    const depVar = moduleToDepVar[mod];
    if (!depVar) continue;

    // Namespace import: import * as X from "pkg";
    if (imp.kind === "namespace" && imp.namespaceName) {
      // If the loader already created a variable with this name, don't redeclare.
      // (e.g. config.global === "styled" and user does import * as styled ...)
      if (imp.namespaceName === depVar) continue;
      // depVar is the already imported namespace module (e.g. LucideIcons)
      declareOnce(imp.namespaceName, depVar);
      continue;
    }

    // Default import: import X from "pkg";
    if ((imp.kind === "default" || imp.kind === "defaultNamed") && imp.defaultName) {
      // The dependency loader creates a variable with the name from config.global (e.g., "styled")
      // and also sets window[globalName]. We need to ensure the user's import name is available.
      // If the names match, we still need to create a binding that references window[name]
      // so the eval scope has access to it.
      if (imp.defaultName === depVar) {
        // Names match - create binding from window since the loader sets window[name]
        declareOnce(imp.defaultName, `window.${depVar}`);
      } else {
        // Names differ - create alias
        declareOnce(imp.defaultName, `(${depVar} && ${depVar}.default) || ${depVar}`);
      }
    }

    // Named imports: import { A as B } from "pkg";
    for (const n of imp.named ?? []) {
      const imported = n.imported;
      const local = n.local;
      // Avoid redeclaring an identifier that the loader already created.
      if (local === depVar) continue;
      // export-shape fallbacks
      const rhs = `(${depVar} && ${depVar}.${imported}) || (${depVar} && ${depVar}.default && ${depVar}.default.${imported}) || (${depVar} && ${depVar}.default) || ${depVar}`;
      declareOnce(local, rhs);
    }
  }

  // Try to detect component name from the code itself
  let componentVarName = detectedComponentName;
  if (!componentVarName) {
    // Look for const/function/class declarations
    const constMatch = previewCode.match(/(?:^|\n)\s*(?:const|let|var)\s+(\w+)\s*[=:]/m);
    const functionMatch = previewCode.match(/(?:^|\n)\s*function\s+(\w+)\s*\(/m);
    const classMatch = previewCode.match(/(?:^|\n)\s*class\s+(\w+)/m);

    componentVarName = constMatch?.[1] || functionMatch?.[1] || classMatch?.[1] || "ExportedComponent";
  }

  const importsSummary = parsedImports.map((i) => ({
    module: i.module,
    kind: i.kind,
    named: (i.named ?? []).map((n) => n.imported),
  }));

  return `
    // Recreated bindings from original imports (preview-only)
    ${bindings.join("\n    ")}

    // #region agent log
    try {
      const __vaultDeps = (window && (window as any).__deps) ? (window as any).__deps : {};
      const __vaultSt = __vaultDeps["gsap/ScrollTrigger"];
      const __vaultStDefault = __vaultSt && __vaultSt.default ? __vaultSt.default : null;
      fetch('http://127.0.0.1:7245/ingest/c699f605-fa04-4a22-8b01-2579eb2ca0d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'preview-wrapper:runtime',message:'GSAP ScrollTrigger runtime diagnostics',data:{imports:${JSON.stringify(importsSummary)},typeofScrollTrigger:typeof ScrollTrigger,hasWindowGsapScrollTrigger:typeof (window as any).gsap_ScrollTrigger !== 'undefined',windowGsapScrollTriggerKeys:Object.keys(((window as any).gsap_ScrollTrigger)||{}).slice(0,50),depsKeys:Object.keys(__vaultDeps).slice(0,50),scrollTriggerModuleKeys:Object.keys(__vaultSt||{}).slice(0,50),scrollTriggerDefaultKeys:Object.keys(__vaultStDefault||{}).slice(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'runtime-check',hypothesisId:'B'})}).catch(()=>{});
    } catch {}
    // #endregion
    
    // Original code (imports removed, adapted for preview)
    ${previewCode}
    
    // Preview wrapper - try multiple ways to find the component
    function Preview() {
      // Try to find the component in multiple ways
      let ComponentToRender = null;
      
      // 1. Try detected/exported component name
      if (typeof ${componentVarName} !== 'undefined') {
        ComponentToRender = ${componentVarName};
      }
      // 2. Try ExportedComponent (from export default replacement)
      else if (typeof ExportedComponent !== 'undefined') {
        ComponentToRender = ExportedComponent;
      }
      // 3. Try to find any exported component
      else {
        // Look for the last defined function/const that could be a component
        const possibleNames = ['${componentVarName}', 'Component', 'App', 'Button', 'Loader'];
        for (const name of possibleNames) {
          if (typeof window[name] !== 'undefined' && typeof window[name] === 'function') {
            ComponentToRender = window[name];
            break;
          }
          if (typeof globalThis[name] !== 'undefined' && typeof globalThis[name] === 'function') {
            ComponentToRender = globalThis[name];
            break;
          }
        }
      }
      
      if (!ComponentToRender) {
        return React.createElement("div", {
          style: { padding: 24, color: '#ef4444' }
        }, "Component not found. Make sure your component is properly defined and exported.");
      }

      // Render the component directly without extra wrapper padding
      return React.createElement(ComponentToRender, null);
    }

    // Expose for runtime runner
    globalThis.__VaultPreview = Preview;
    
    // Also expose component directly for debugging
    if (typeof ${componentVarName} !== 'undefined') {
      globalThis.__VaultComponent = ${componentVarName};
    }
  `;
}
