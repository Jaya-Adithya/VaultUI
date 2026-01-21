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

export function detectFramework(code: string): Framework {
  // Check for Next.js specific patterns first
  if (code.includes('"use client"') || code.includes("'use client'")) {
    return "next";
  }
  if (code.includes('"use server"') || code.includes("'use server'")) {
    return "next";
  }
  if (/import\s+.*from\s+['"]next/.test(code)) {
    return "next";
  }

  // Check for React patterns
  if (/import\s+.*from\s+['"]react['"]/.test(code)) {
    return "react";
  }
  if (
    code.includes("useState") ||
    code.includes("useEffect") ||
    code.includes("useRef") ||
    code.includes("useCallback") ||
    code.includes("useMemo")
  ) {
    return "react";
  }
  if (/export\s+(default\s+)?function\s+\w+.*\(/.test(code) && code.includes("return")) {
    // Check if it returns JSX-like content
    if (/<[A-Z]|<[a-z]+[\s>]/.test(code)) {
      return "react";
    }
  }

  // Check for HTML
  if (/<html|<!DOCTYPE/i.test(code)) {
    return "html";
  }
  if (/<(div|span|p|h[1-6]|a|button|input|form|table|ul|ol|li|section|article|header|footer|main|nav)/i.test(code) && !code.includes("import")) {
    return "html";
  }

  // Check for CSS
  if (/@keyframes|@media|@import|@font-face/.test(code)) {
    return "css";
  }
  if (/\{[\s\S]*?display\s*:|[\s\S]*?margin\s*:|[\s\S]*?padding\s*:|[\s\S]*?color\s*:/i.test(code) && !code.includes("import")) {
    return "css";
  }

  // Check for JavaScript
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=/.test(code)) {
    return "js";
  }

  // Check for Vue patterns
  if (/import\s+.*from\s+['"]vue['"]/.test(code)) {
    return "vue";
  }
  if (/<template[\s>]/i.test(code) && /<script[\s>]/i.test(code)) {
    return "vue";
  }

  // Check for Angular patterns
  if (/import\s+.*from\s+['"]@angular\/core['"]/.test(code)) {
    return "angular";
  }
  if (/@Component\s*\(/.test(code) || /@NgModule\s*\(/.test(code)) {
    return "angular";
  }

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
