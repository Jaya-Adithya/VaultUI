/**
 * Parse imports from code and extract third-party dependencies
 */

export interface ImportInfo {
  source: string;
  defaultImport?: string;
  namedImports: string[];
  namespaceImport?: string;
  isLocal: boolean; // true if starts with ./ or ../
}

export interface DependencyInfo {
  packageName: string;
  version?: string;
  cdnUrl?: string;
  globalVar?: string; // Global variable name when loaded via CDN
  needsReactIs?: boolean; // For styled-components
}

/**
 * Parse all import statements from code
 */
export function parseImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // Match import statements
  // import defaultExport, { named1, named2 } from 'source';
  // import * as name from 'source';
  // import { named1 as alias1 } from 'source';
  const importRegex = /import\s+(?:(?:(?:\*\s+as\s+(\w+))|(\w+)(?:\s*,\s*\{([^}]+)\})?)|(\{[^}]+\}))\s+from\s+['"]([^'"]+)['"];?/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const namespaceImport = match[1];
    const defaultImport = match[2];
    const namedImportsStr = match[3] || match[4];
    const source = match[5];
    
    const namedImports: string[] = [];
    if (namedImportsStr) {
      // Parse named imports: { name1, name2 as alias2 }
      const namedRegex = /(\w+)(?:\s+as\s+(\w+))?/g;
      let namedMatch;
      while ((namedMatch = namedRegex.exec(namedImportsStr)) !== null) {
        namedImports.push(namedMatch[2] || namedMatch[1]);
      }
    }
    
    imports.push({
      source,
      defaultImport,
      namedImports,
      namespaceImport,
      isLocal: source.startsWith('./') || source.startsWith('../'),
    });
  }
  
  return imports;
}

/**
 * Get CDN information for a package
 */
export function getPackageCdnInfo(packageName: string): DependencyInfo | null {
  const cdnMap: Record<string, DependencyInfo> = {
    'react': {
      packageName: 'react',
      version: '18',
      cdnUrl: 'https://unpkg.com/react@18/umd/react.production.min.js',
      globalVar: 'React',
    },
    'react-dom': {
      packageName: 'react-dom',
      version: '18',
      cdnUrl: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
      globalVar: 'ReactDOM',
    },
    'styled-components': {
      packageName: 'styled-components',
      version: '6',
      cdnUrl: 'https://unpkg.com/styled-components@6/dist/styled-components.min.js',
      globalVar: 'styled',
      needsReactIs: true,
    },
    'react-day-picker': {
      packageName: 'react-day-picker',
      version: '9',
      cdnUrl: 'https://unpkg.com/react-day-picker@9/dist/index.umd.js',
      globalVar: 'ReactDayPicker',
    },
    'lucide-react': {
      packageName: 'lucide-react',
      version: 'latest',
      // Note: lucide-react doesn't have a UMD build, so we'll use stubs
      cdnUrl: '', // Will be handled via stubs
      globalVar: 'lucide',
    },
    'framer-motion': {
      packageName: 'framer-motion',
      version: 'latest',
      cdnUrl: 'https://unpkg.com/framer-motion@latest/dist/framer-motion.umd.js',
      globalVar: 'FramerMotion',
    },
    'react-is': {
      packageName: 'react-is',
      version: '18',
      cdnUrl: 'https://unpkg.com/react-is@18/umd/react-is.production.min.js',
      globalVar: 'ReactIs',
    },
  };
  
  return cdnMap[packageName] || null;
}

/**
 * Extract all third-party dependencies from code
 */
export function extractDependencies(code: string): DependencyInfo[] {
  const imports = parseImports(code);
  const dependencies = new Map<string, DependencyInfo>();
  
  for (const imp of imports) {
    if (!imp.isLocal) {
      const cdnInfo = getPackageCdnInfo(imp.source);
      if (cdnInfo) {
        dependencies.set(imp.source, cdnInfo);
        
        // Add react-is if styled-components is detected
        if (imp.source === 'styled-components' && cdnInfo.needsReactIs) {
          const reactIsInfo = getPackageCdnInfo('react-is');
          if (reactIsInfo) {
            dependencies.set('react-is', reactIsInfo);
          }
        }
      }
    }
  }
  
  return Array.from(dependencies.values());
}

/**
 * Extract component name from code
 * Looks for: export default ComponentName, export { ComponentName }, export function ComponentName
 */
export function extractComponentName(code: string): string | null {
  // Try export default ComponentName
  const defaultExportMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultExportMatch) {
    return defaultExportMatch[1];
  }
  
  // Try export { ComponentName } - this handles named exports
  const namedExportMatch = code.match(/export\s*\{\s*(\w+)\s*\}/);
  if (namedExportMatch) {
    const name = namedExportMatch[1];
    // Only return if it starts with uppercase (likely a component)
    if (name[0] === name[0].toUpperCase()) {
      return name;
    }
  }
  
  // Try export const/function ComponentName
  const constFunctionMatch = code.match(/export\s+(?:const|function|class)\s+(\w+)/);
  if (constFunctionMatch) {
    return constFunctionMatch[1];
  }
  
  // Try export { ComponentName as default }
  const reExportMatch = code.match(/export\s*\{\s*(\w+)(?:\s+as\s+default)?\s*\}/);
  if (reExportMatch) {
    const name = reExportMatch[1];
    if (name[0] === name[0].toUpperCase()) {
      return name;
    }
  }
  
  // Try function ComponentName() or const ComponentName = (but only if uppercase)
  const functionMatch = code.match(/(?:function|const)\s+(\w+)\s*[=(]/);
  if (functionMatch) {
    const name = functionMatch[1];
    // Skip common non-component names
    if (!['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'cn', 'buttonVariants'].includes(name)) {
      // Check if it's likely a component (starts with uppercase)
      if (name[0] === name[0].toUpperCase()) {
        return name;
      }
    }
  }
  
  return null;
}

/**
 * Generate suggested filename based on component name
 */
export function suggestFilename(componentName: string | null, language: string): string {
  if (!componentName) {
    // Default filenames
    const defaults: Record<string, string> = {
      tsx: 'App.tsx',
      jsx: 'App.jsx',
      ts: 'app.component.ts',
      js: 'script.js',
      html: 'index.html',
      css: 'styles.css',
      vue: 'App.vue',
    };
    return defaults[language] || 'App.tsx';
  }
  
  // Convert ComponentName to component-name.ext
  const kebabCase = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  
  const extensions: Record<string, string> = {
    tsx: '.tsx',
    jsx: '.jsx',
    ts: '.ts',
    js: '.js',
    html: '.html',
    css: '.css',
    vue: '.vue',
  };
  
  return `${kebabCase}${extensions[language] || '.tsx'}`;
}
