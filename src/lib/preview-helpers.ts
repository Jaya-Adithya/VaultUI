import { extractDependencies, parseImports, type DependencyInfo } from './parse-imports';

/**
 * Process React code for preview:
 * - Extract dependencies
 * - Remove imports
 * - Provide stubs for local imports
 */
export function processReactCodeForPreview(
  code: string,
  allFiles: Array<{ filename: string; code: string }>
): {
  processedCode: string;
  dependencies: DependencyInfo[];
  localImports: string[];
} {
  const imports = parseImports(code);
  const dependencies = extractDependencies(code);
  const localImports: string[] = [];
  
  let processedCode = code;
  
  // Remove all import statements
  processedCode = processedCode.replace(
    /import\s+(?:(?:\*\s+as\s+\w+)|(?:\w+(?:\s*,\s*\{[^}]+\})?)|(?:\{[^}]+\}))\s+from\s+['"][^'"]+['"];?\n?/g,
    ''
  );
  
  // Remove "use client" directive
  processedCode = processedCode.replace(/["']use\s+client["'];?\n?/g, '');
  
  // Track local imports for stub generation
  for (const imp of imports) {
    if (imp.isLocal) {
      localImports.push(imp.source);
      
      // Try to find the imported file in allFiles
      const importedFile = allFiles.find(f => {
        const baseName = imp.source.replace(/^\.\//, '').replace(/^\.\.\//, '');
        return f.filename === baseName || f.filename.endsWith(`/${baseName}`);
      });
      
      // If not found, we'll need to provide a stub
      if (!importedFile) {
        // Common local imports that need stubs
        if (imp.source.includes('utils') || imp.source.includes('cn')) {
          // cn utility - provide stub
          if (!processedCode.includes('function cn(') && !processedCode.includes('const cn =')) {
            processedCode = `function cn(...classes) {
              return classes.filter(Boolean).join(' ');
            }\n\n${processedCode}`;
          }
        }
        
        if (imp.source.includes('button')) {
          // buttonVariants - provide stub
          if (!processedCode.includes('buttonVariants')) {
            processedCode = `function buttonVariants({ variant = 'default' }) {
              const variants = {
                default: 'bg-primary text-primary-foreground',
                outline: 'border border-input bg-background hover:bg-accent',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
              };
              return variants[variant] || variants.default;
            }\n\n${processedCode}`;
          }
        }
      }
    }
  }
  
  // Replace export default with const
  processedCode = processedCode.replace(/export\s+default\s+/g, 'const ExportedComponent = ');
  
  // Remove other exports
  processedCode = processedCode.replace(/export\s+/g, '');
  
  return {
    processedCode,
    dependencies,
    localImports,
  };
}

/**
 * Generate script tags for dependencies with proper loading order
 */
export function generateDependencyScripts(
  dependencies: DependencyInfo[],
  isDevelopment = false
): string {
  const scripts: string[] = [];
  const added = new Set<string>();
  
  // Always add React and ReactDOM first if not already present
  const hasReact = dependencies.some(d => d.packageName === 'react');
  const hasReactDOM = dependencies.some(d => d.packageName === 'react-dom');
  
  if (!hasReact) {
    scripts.push(
      `<script src="https://unpkg.com/react@18/umd/react.${isDevelopment ? 'development' : 'production.min'}.js" crossorigin></script>`
    );
  }
  
  if (!hasReactDOM) {
    scripts.push(
      `<script src="https://unpkg.com/react-dom@18/umd/react-dom.${isDevelopment ? 'development' : 'production.min'}.js" crossorigin></script>`
    );
  }
  
  // Add react-is before styled-components if needed
  const needsReactIs = dependencies.some(d => d.needsReactIs);
  if (needsReactIs && !added.has('react-is')) {
    const reactIsInfo = dependencies.find(d => d.packageName === 'react-is') || {
      packageName: 'react-is',
      version: '18',
      cdnUrl: `https://unpkg.com/react-is@18/umd/react-is.${isDevelopment ? 'development' : 'production.min'}.js`,
      globalVar: 'ReactIs',
    };
    scripts.push(`<script src="${reactIsInfo.cdnUrl}" crossorigin></script>`);
    added.add('react-is');
  }
  
  // Add other dependencies (skip lucide-react as it doesn't have UMD)
  for (const dep of dependencies) {
    if (!added.has(dep.packageName) && dep.cdnUrl && dep.packageName !== 'lucide-react') {
      scripts.push(`<script src="${dep.cdnUrl}" crossorigin></script>`);
      added.add(dep.packageName);
    }
  }
  
  return scripts.join('\n          ');
}

/**
 * Generate script loader that ensures scripts load in order
 */
export function generateScriptLoader(scripts: string[]): string {
  if (scripts.length === 0) return '';
  
  return `
    <script>
      (function() {
        const scriptsToLoad = ${JSON.stringify(scripts)};
        let currentIndex = 0;
        
        function loadNextScript() {
          if (currentIndex >= scriptsToLoad.length) {
            window.allScriptsLoaded = true;
            return;
          }
          
          const script = document.createElement('script');
          script.src = scriptsToLoad[currentIndex];
          script.crossOrigin = 'anonymous';
          script.onload = function() {
            currentIndex++;
            loadNextScript();
          };
          script.onerror = function() {
            console.error('Failed to load script:', scriptsToLoad[currentIndex]);
            currentIndex++;
            loadNextScript(); // Continue loading other scripts even if one fails
          };
          document.head.appendChild(script);
        }
        
        loadNextScript();
      })();
    </script>
  `;
}

/**
 * Generate global variable assignments for dependencies
 */
export function generateDependencyGlobals(dependencies: DependencyInfo[]): string {
  const globals: string[] = [];
  
  for (const dep of dependencies) {
    if (dep.globalVar) {
      // Handle special cases
      if (dep.packageName === 'styled-components') {
        globals.push('const styled = window.styled;');
      } else if (dep.packageName === 'react-day-picker') {
        globals.push('const { DayPicker } = window.ReactDayPicker || {};');
        // Provide a stub if DayPicker is not available
        globals.push(`if (!DayPicker) {
          window.DayPicker = { DayPicker: () => React.createElement('div', null, 'DayPicker not available') };
        }`);
      } else if (dep.packageName === 'lucide-react') {
        globals.push('const lucide = window.lucide || {};');
      } else if (dep.globalVar && dep.globalVar !== 'React' && dep.globalVar !== 'ReactDOM') {
        globals.push(`const ${dep.globalVar} = window.${dep.globalVar} || {};`);
      }
    }
  }
  
  return globals.join('\n            ');
}

/**
 * Handle lucide-react icon imports
 * Converts: import { ChevronLeft, ChevronRight } from "lucide-react"
 * To: const ChevronLeft = lucide.ChevronLeft || (() => React.createElement('svg', ...));
 */
export function processLucideIcons(code: string): string {
  // Find lucide-react imports
  const lucideImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/;
  const match = code.match(lucideImportRegex);
  
  if (match) {
    const iconNames = match[1]
      .split(',')
      .map(s => {
        const trimmed = s.trim();
        // Handle "name as alias" syntax
        const parts = trimmed.split(/\s+as\s+/);
        return parts.length > 1 ? parts[1] : parts[0];
      })
      .filter(Boolean);
    
    // Generate icon stubs - simple SVG icons
    const iconStubs = iconNames.map(name => {
      return `const ${name} = (window.lucide && window.lucide.${name}) || (({ className = '', ...props }) => 
        React.createElement('svg', { 
          className: 'lucide lucide-${name.toLowerCase()} ' + className, 
          ...props, 
          width: 24,
          height: 24,
          viewBox: '0 0 24 24', 
          fill: 'none', 
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }, React.createElement('path', { d: 'M5 12h14' }))
      );`;
    }).join('\n            ');
    
    return iconStubs;
  }
  
  return '';
}
