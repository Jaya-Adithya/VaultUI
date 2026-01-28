"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount, OnChange, loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type * as monaco from "monaco-editor";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/detect-framework";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  className?: string;
  readOnly?: boolean;
}

const languageMap: Record<Language, string> = {
  tsx: "typescript",
  jsx: "javascript",
  ts: "typescript",
  vue: "html",
  html: "html",
  css: "css",
  js: "javascript",
};

// Configure Monaco loader to use local or specific CDN path
// and ensure it works with COEP (Cross-Origin-Embedder-Policy)
if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs",
    },
  });
}


export function CodeEditor({
  value,
  onChange,
  language,
  className,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Store Monaco globally so monaco-types utility can access it
    if (typeof window !== "undefined") {
      (window as any).monaco = monaco;
    }

    // Configure TypeScript/JavaScript language service to avoid noisy \"Cannot find module\" errors
    // (Vault stores code; preview loads deps via CDN/shims, not node_modules.)
    try {
      const ts = monaco.languages.typescript;
      const compilerOptions: Parameters<
        typeof ts.typescriptDefaults.setCompilerOptions
      >[0] = {
        jsx: ts.JsxEmit.React,
        jsxFactory: "React.createElement",
        reactNamespace: "React",
        allowNonTsExtensions: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
        // Better JSX parsing
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitAny: false,
      };

      ts.typescriptDefaults.setCompilerOptions(compilerOptions);
      ts.javascriptDefaults.setCompilerOptions(compilerOptions);

      // Keep syntax validation, but disable semantic \"cannot find module\" noise
      ts.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        // Show more helpful error messages
        diagnosticCodesToIgnore: [],
      });
      ts.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [],
      });

      // Add React types for better JSX support
      const reactTypes = `
        declare namespace React {
          type ReactElement = any;
          type ReactNode = any;
          function createElement(type: any, props?: any, ...children: any[]): ReactElement;
        }
        declare const React: typeof import('react');
      `;
      ts.typescriptDefaults.addExtraLib(
        reactTypes,
        "file:///vaultui/react.d.ts"
      );

      const extraDts = `
        declare module "react-day-picker" { export const DayPicker: any; const _default: any; export default _default; }
        declare module "lucide-react" { 
          const x: any; 
          export = x; 
          export default x;
          // Common named exports for lucide-react
          export const Calendar: any;
          export const Button: any;
          export const Input: any;
          export const Check: any;
          export const X: any;
          export const Plus: any;
          export const Minus: any;
          export const Edit: any;
          export const Trash: any;
          export const Save: any;
          export const Search: any;
          export const ArrowLeft: any;
          export const ArrowRight: any;
          export const ChevronUp: any;
          export const ChevronDown: any;
          export const MoreVertical: any;
          export const Info: any;
          export const AlertCircle: any;
          export const AlertTriangle: any;
        }
        declare module "styled-components" { const x: any; export default x; }
        declare module "framer-motion" { const x: any; export = x; export default x; }
        declare module "./utils" { export function cn(...args: any[]): string; }
        declare module "../utils" { export function cn(...args: any[]): string; }
        declare module "./button" { export const buttonVariants: any; export const Button: any; }
        declare module "./button" { export const buttonVariants: any; export const Button: any; }
        declare module "../button" { export const buttonVariants: any; export const Button: any; }
        declare module "date-fns" { const x: any; export = x; export default x; }
      `;
      ts.typescriptDefaults.addExtraLib(
        extraDts,
        "file:///vaultui/preview-shims.d.ts"
      );
    } catch {
      // ignore editor TS config failures
    }

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: "on",
      renderLineHighlight: "line",
      tabSize: 2,
      wordWrap: "on",
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
      // Better error display
      renderValidationDecorations: "on",
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
    });

    // Add helpful error markers for common issues
    const model = editor.getModel();
    if (model) {
      const checkCommonErrors = () => {
        const text = model.getValue();
        const markers: editor.IMarkerData[] = [];

        // Check for missing = in arrow functions (common syntax error)
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Pattern: const ComponentName () => but missing =
          const missingArrowMatch = line.match(/const\s+(\w+)\s*\(\s*\)\s*=>/);
          if (missingArrowMatch && !line.includes('=')) {
            const componentName = missingArrowMatch[1];
            const matchIndex = line.indexOf(`const ${componentName} (`);
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: i + 1,
              startColumn: matchIndex + 1,
              endLineNumber: i + 1,
              endColumn: matchIndex + `const ${componentName} (`.length + 1,
              message: `Missing '=' in function declaration. Should be: const ${componentName} = () =>`,
            });
          }
        }

        if (markers.length > 0) {
          monaco.editor.setModelMarkers(model, 'common-errors', markers);
        } else {
          monaco.editor.setModelMarkers(model, 'common-errors', []);
        }
      };

      // Check on content change (debounced)
      let timeoutId: NodeJS.Timeout;
      model.onDidChangeContent(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkCommonErrors, 300);
      });

      // Initial check
      setTimeout(checkCommonErrors, 100);
    }
  }, []);

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange(value ?? "");
    },
    [onChange]
  );

  return (
    <div className={cn("relative h-full", className)}>
      <Editor
        height="100%"
        language={languageMap[language] || "plaintext"}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          renderLineHighlight: "line",
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      />
    </div>
  );
}
