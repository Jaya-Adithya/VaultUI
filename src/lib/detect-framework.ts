export type Framework =
  | "react"
  | "next"
  | "vue"
  | "angular"
  | "html"
  | "css"
  | "js"
  | "other";

export type Language = "tsx" | "jsx" | "ts" | "vue" | "html" | "css" | "js";

export function detectFramework(code: string, filename?: string): Framework {
  // DEBUG: Log detection attempt
  console.log("[detectFramework] Detecting framework", { 
    codeLength: code.length, 
    filename,
    codePreview: code.substring(0, 100) 
  });

  // Check filename extension FIRST (most reliable)
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    console.log("[detectFramework] Filename extension:", ext);
    
    if (ext === "css") {
      console.log("[detectFramework] Detected CSS from filename");
      return "css";
    }
    if (ext === "html" || ext === "htm") {
      console.log("[detectFramework] Detected HTML from filename");
      return "html";
    }
    if (ext === "js" || ext === "jsx") {
      console.log("[detectFramework] Detected JS from filename");
      return "js";
    }
    if (ext === "ts" || ext === "tsx") {
      // Will be refined by React/Next checks below
    }
    if (ext === "vue") {
      console.log("[detectFramework] Detected Vue from filename");
      return "vue";
    }
  }

  // Check for Next.js specific patterns first
  if (code.includes('"use client"') || code.includes("'use client'")) {
    console.log("[detectFramework] Detected Next.js (use client)");
    return "next";
  }
  if (code.includes('"use server"') || code.includes("'use server'")) {
    console.log("[detectFramework] Detected Next.js (use server)");
    return "next";
  }
  if (/import\s+.*from\s+['"]next/.test(code)) {
    console.log("[detectFramework] Detected Next.js (import next)");
    return "next";
  }

  // Check for React patterns
  if (/import\s+.*from\s+['"]react['"]/.test(code)) {
    console.log("[detectFramework] Detected React (import react)");
    return "react";
  }
  if (
    code.includes("useState") ||
    code.includes("useEffect") ||
    code.includes("useRef") ||
    code.includes("useCallback") ||
    code.includes("useMemo")
  ) {
    console.log("[detectFramework] Detected React (hooks)");
    return "react";
  }
  if (/export\s+(default\s+)?function\s+\w+.*\(/.test(code) && code.includes("return")) {
    // Check if it returns JSX-like content
    if (/<[A-Z]|<[a-z]+[\s>]/.test(code)) {
      console.log("[detectFramework] Detected React (JSX return)");
      return "react";
    }
  }

  // Check for CSS BEFORE HTML (CSS has stronger indicators like @keyframes)
  // This fixes the issue where CSS files are detected as HTML
  // Priority 1: CSS @rules (most reliable)
  if (/@keyframes|@media|@import|@font-face|@supports|@page|@charset|@namespace/.test(code)) {
    console.log("[detectFramework] ✅ Detected CSS (@rules)");
    return "css";
  }
  
  // Priority 2: CSS selector patterns with properties
  // Match: .class { property: value; } or #id { property: value; } or element { property: value; }
  const cssSelectorPattern = /([.#]?[\w-]+\s*\{[\s\S]*?:\s*[^;{}]+;[\s\S]*?\})/;
  const hasCssSelectors = cssSelectorPattern.test(code);
  const hasCssProperties = /(?:display|margin|padding|color|background|border|width|height|position|flex|grid|transform|animation|transition)\s*:/i.test(code);
  const hasNoJsKeywords = !/(?:import|export|function|const|let|var|class|interface|type|return|if|else|for|while)\s+/.test(code);
  const hasNoHtmlTags = !/<\/?[a-z][\s>]/.test(code);
  
  if (hasCssSelectors && hasCssProperties && hasNoJsKeywords && hasNoHtmlTags) {
    console.log("[detectFramework] ✅ Detected CSS (selector + properties pattern)");
    return "css";
  }
  
  // Priority 3: CSS property patterns (more lenient, but still check for JS/HTML exclusion)
  if (hasCssProperties && hasNoJsKeywords && hasNoHtmlTags && code.includes("{") && code.includes("}")) {
    console.log("[detectFramework] ✅ Detected CSS (properties pattern)");
    return "css";
  }

  // Check for HTML (after CSS to avoid false positives)
  if (/<html|<!DOCTYPE/i.test(code)) {
    console.log("[detectFramework] Detected HTML (!DOCTYPE)");
    return "html";
  }
  if (/<(div|span|p|h[1-6]|a|button|input|form|table|ul|ol|li|section|article|header|footer|main|nav)/i.test(code) && !code.includes("import")) {
    console.log("[detectFramework] Detected HTML (tags)");
    return "html";
  }

  // Check for JavaScript
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=/.test(code)) {
    console.log("[detectFramework] Detected JavaScript");
    return "js";
  }

  // Check for Vue patterns
  if (/import\s+.*from\s+['"]vue['"]/.test(code)) {
    console.log("[detectFramework] Detected Vue (import vue)");
    return "vue";
  }
  if (/<template[\s>]/i.test(code) && /<script[\s>]/i.test(code)) {
    console.log("[detectFramework] Detected Vue (SFC)");
    return "vue";
  }

  // Check for Angular patterns
  if (/import\s+.*from\s+['"]@angular\/core['"]/.test(code)) {
    console.log("[detectFramework] Detected Angular");
    return "angular";
  }
  if (/@Component\s*\(/.test(code) || /@NgModule\s*\(/.test(code)) {
    console.log("[detectFramework] Detected Angular (decorator)");
    return "angular";
  }

  console.log("[detectFramework] No match, returning 'other'");
  return "other";
}

export function detectLanguage(code: string, framework: Framework): Language {
  // TypeScript indicators
  const hasTypeScript =
    /:\s*(string|number|boolean|any|void|null|undefined|object|never|unknown)\b/.test(code) ||
    /<[A-Z]\w*>/.test(code) || // Generic types
    /interface\s+\w+|type\s+\w+\s*=/.test(code) ||
    /as\s+(string|number|boolean|any|const)\b/.test(code);

  switch (framework) {
    case "react":
    case "next":
      return hasTypeScript ? "tsx" : "jsx";
    case "angular":
      return "ts";
    case "vue":
      return "vue";
    case "html":
      return "html";
    case "css":
      return "css";
    case "js":
    default:
      return "js";
  }
}

export function isRenderable(framework: Framework): boolean {
  return ["react", "next", "vue", "html"].includes(framework);
}

export function getFrameworkLabel(framework: Framework): string {
  const labels: Record<Framework, string> = {
    react: "React",
    next: "Next.js",
    vue: "Vue",
    angular: "Angular",
    html: "HTML",
    css: "CSS",
    js: "JavaScript",
    other: "Other",
  };
  return labels[framework];
}

export function getFrameworkColor(framework: Framework): string {
  const colors: Record<Framework, string> = {
    react: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    next: "bg-white/10 text-white border-white/20",
    vue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    angular: "bg-red-500/10 text-red-500 border-red-500/20",
    html: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    css: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    js: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };
  return colors[framework];
}
