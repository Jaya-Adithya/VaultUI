"use client";

import { useState, useMemo, useEffect } from "react";
import { Copy, Check, Edit2, Save, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "./code-editor";
import { extractComponentName } from "@/lib/parse-imports";
import type { Language } from "@/lib/detect-framework";

interface ComponentDocumentationProps {
  files: Array<{
    filename: string;
    language: Language;
    code: string;
  }>;
  usageExample?: string; // Optional usage example code
  componentName?: string;
}

export function ComponentDocumentation({
  files,
  usageExample,
  componentName,
}: ComponentDocumentationProps) {
  const [activeTab, setActiveTab] = useState<"usage" | "code">("usage");
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingUsage, setIsEditingUsage] = useState(false);
  const [editedUsageExample, setEditedUsageExample] = useState<string>("");

  // Extract props with types from component code
  interface PropInfo {
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
  }

  const extractProps = (code: string): PropInfo[] => {
    const props: PropInfo[] = [];
    
    // Try to find props interface/type (handle multiline with nested braces)
    // Match interface ComponentNameProps { ... } or type ComponentNameProps = { ... }
    const interfacePattern = /interface\s+(\w+Props)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
    const typePattern = /type\s+(\w+Props)\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/s;
    
    const interfaceMatch = code.match(interfacePattern);
    const typeMatch = code.match(typePattern);
    
    if (interfaceMatch || typeMatch) {
      const propsContent = (interfaceMatch?.[2] || typeMatch?.[2] || "").trim();
      
      // Split by lines and process each line
      const lines = propsContent.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('//') || cleanLine.startsWith('*')) {
          continue;
        }
        
        // Match prop definitions: propName?: Type or propName: Type
        // Handle cases like: color?: string; or containerRef?: RefObject<HTMLElement>;
        const propMatch = cleanLine.match(/^(\w+)(\??)\s*:\s*(.+?)(?:;|,|$)/);
        
        if (propMatch) {
          const name = propMatch[1];
          const optional = propMatch[2] === '?';
          let type = propMatch[3].trim();
          
          // Remove trailing semicolon or comma
          type = type.replace(/[;,]$/, '').trim();
          
          // Skip if it's already added
          if (name && !props.find(p => p.name === name)) {
            props.push({
              name,
              type,
              optional,
            });
          }
        }
      }
    }
    
    // Fallback: Try to find function component with props destructuring
    if (props.length === 0) {
      const functionPropsMatch = code.match(/(?:function|const)\s+\w+\s*[=:]\s*\([^)]*\{([^}]+)\}/);
      if (functionPropsMatch) {
        const destructured = functionPropsMatch[1].split(',').map(p => {
          const trimmed = p.trim();
          // Handle default values: prop = defaultValue
          const name = trimmed.split(':')[0].split('=')[0].trim();
          return name;
        });
        
        destructured.forEach(prop => {
          if (prop && !props.find(p => p.name === prop)) {
            props.push({
              name: prop,
              type: 'any',
              optional: true,
            });
          }
        });
      }
    }
    
    return props;
  };

  // Generate appropriate default value based on prop type
  const getDefaultValue = (prop: PropInfo): string => {
    const type = prop.type.toLowerCase();
    const name = prop.name.toLowerCase();
    
    // Handle specific prop names
    if (name.includes('color')) {
      return '"#00ff4c"';
    }
    if (name.includes('ref') || name.includes('container')) {
      return '{containerRef}';
    }
    if (name.includes('targeted') || name.includes('active') || name.includes('disabled')) {
      return ''; // Boolean prop without value
    }
    if (name.includes('size')) {
      return '"md"';
    }
    if (name.includes('width') || name.includes('height')) {
      return '{300}';
    }
    
    // Handle types
    if (type.includes('string')) {
      return '""';
    }
    if (type.includes('number')) {
      return '{0}';
    }
    if (type.includes('boolean')) {
      return ''; // Boolean without value means true
    }
    if (type.includes('refobject') || type.includes('ref')) {
      return '{containerRef}';
    }
    if (type.includes('array') || type.includes('[]')) {
      return '{[]}';
    }
    if (type.includes('object') || type.includes('{}')) {
      return '{{}}';
    }
    
    // Default for optional props
    if (prop.optional) {
      return ''; // Omit optional props by default
    }
    
    return '{true}';
  };

  // Initialize edited usage example when component mounts or files change
  useEffect(() => {
    if (!isEditingUsage && editedUsageExample === "") {
      // Will be set by defaultUsageExample
    }
  }, [files, componentName, usageExample]);

  // Generate default usage example if not provided
  const defaultUsageExample = useMemo(() => {
    if (usageExample) return usageExample;
    
    // Try to extract component name from files
    const mainFile = files.find(
      (f) => f.language === "tsx" || f.language === "jsx" || f.language === "vue"
    ) || files[0];
    
    if (!mainFile) return "";

    const name = componentName || extractComponentName(mainFile.code) || "Component";
    const props = extractProps(mainFile.code);
    
    // Generate usage example based on framework
    if (mainFile.language === "vue") {
      return `<template>
  <div>
    <${name} />
  </div>
</template>

<script setup>
import ${name} from './${name}.vue'
</script>`;
    } else {
      // Extract imports from the component code to match them in usage
      const imports = mainFile.code.match(/import\s+([^]+?)\s+from\s+['"]([^'"]+)['"]/g) || [];
      const reactImports = new Set<string>();
      const otherImports: string[] = [];
      
      imports.forEach(imp => {
        if (imp.includes("from 'react'") || imp.includes('from "react"')) {
          // Extract named imports from react
          const namedMatch = imp.match(/\{([^}]+)\}/);
          if (namedMatch) {
            namedMatch[1].split(',').forEach(i => {
              const trimmed = i.trim().split(' as ')[0].trim();
              if (trimmed) reactImports.add(trimmed);
            });
          }
        } else {
          // Track other imports for reference
          const fromMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
          if (fromMatch && !fromMatch[1].startsWith('.')) {
            otherImports.push(fromMatch[1]);
          }
        }
      });
      
      // Always include useRef if containerRef is needed
      const props = extractProps(mainFile.code);
      const needsContainerRef = props.some(p => 
        p.name.toLowerCase().includes('ref') || 
        p.name.toLowerCase().includes('container') ||
        p.type.toLowerCase().includes('ref')
      );
      
      if (needsContainerRef) {
        reactImports.add('useRef');
      }
      
      // Generate props string based on actual props
      let propsString = "";
      if (props.length > 0) {
        const propsArray: string[] = [];
        
        props.forEach(prop => {
          const defaultValue = getDefaultValue(prop);
          if (defaultValue) {
            propsArray.push(`${prop.name}={${defaultValue}}`);
          } else if (!prop.optional) {
            // Required props without default value
            propsArray.push(prop.name);
          }
        });
        
        // Limit to 4 props for cleaner example, but include all important ones
        const importantProps = props.filter(p => 
          !p.optional || 
          p.name.toLowerCase().includes('color') ||
          p.name.toLowerCase().includes('ref') ||
          p.name.toLowerCase().includes('container')
        );
        
        const propsToShow = importantProps.slice(0, 4);
        const propsArrayFiltered = propsToShow
          .map(prop => {
            const defaultValue = getDefaultValue(prop);
            return defaultValue ? `${prop.name}={${defaultValue}}` : prop.name;
          })
          .filter(Boolean);
        
        if (propsArrayFiltered.length > 0) {
          propsString = "\n        " + propsArrayFiltered.join("\n        ");
        }
      }
      
      // Build import statement
      const reactImportsArray = Array.from(reactImports);
      const reactImportStr = reactImportsArray.length > 0
        ? `import { ${reactImportsArray.join(', ')} } from 'react';`
        : '';
      
      // Determine import path - use filename without extension
      const filename = mainFile.filename.replace(/\.(tsx|jsx|ts|js)$/, '');
      const importPath = `'./${filename}'`;
      
      // Build the usage example
      const usageLines = [];
      if (reactImportStr) {
        usageLines.push(reactImportStr);
      }
      usageLines.push(`import ${name} from ${importPath};`);
      usageLines.push('');
      usageLines.push('const Component = () => {');
      
      if (needsContainerRef) {
        usageLines.push('  const containerRef = useRef(null);');
        usageLines.push('');
      }
      
      usageLines.push('  return (');
      if (needsContainerRef) {
        usageLines.push('    <div ref={containerRef} style={{ height: \'300px\', overflow: \'hidden\' }}>');
      } else {
        usageLines.push('    <div>');
      }
      
      if (propsString) {
        usageLines.push(`      <${name}${propsString}`);
        usageLines.push('      />');
      } else {
        usageLines.push(`      <${name} />`);
      }
      
      usageLines.push('    </div>');
      usageLines.push('  );');
      usageLines.push('};');
      
      return usageLines.join('\n');
    }
  }, [files, usageExample, componentName]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Combine all files for Code tab
  const allCode = useMemo(() => {
    return files
      .map((f) => `// ${f.filename}\n${f.code}`)
      .join("\n\n");
  }, [files]);

  // Determine language for usage example
  const usageLanguage: Language = useMemo(() => {
    const mainFile = files.find(
      (f) => f.language === "tsx" || f.language === "jsx" || f.language === "vue"
    );
    return mainFile?.language || "tsx";
  }, [files]);

  // Get the current usage example (edited or default)
  const currentUsageExample = isEditingUsage && editedUsageExample 
    ? editedUsageExample 
    : (usageExample || defaultUsageExample);

  // Get the code to copy based on active tab
  const codeToCopy = activeTab === "usage" ? currentUsageExample : allCode;

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (!isEditingUsage) {
      // Entering edit mode - initialize with current example
      setEditedUsageExample(currentUsageExample);
    } else {
      // Exiting edit mode - reset to default
      setEditedUsageExample("");
    }
    setIsEditingUsage(!isEditingUsage);
  };

  // Handle save (for now, just exit edit mode - could be extended to save to backend)
  const handleSaveUsage = () => {
    setIsEditingUsage(false);
    // TODO: Save editedUsageExample to backend/component metadata
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedUsageExample("");
    setIsEditingUsage(false);
  };

  return (
    <div className="flex flex-col h-full border-t border-border bg-background">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "usage" | "code")} className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-muted/30">
          <TabsList>
            <TabsTrigger value="usage">
              Usage {usageExample && "(with your settings)"}
            </TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-1">
            {activeTab === "usage" && (
              <>
                {!isEditingUsage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleEditToggle}
                    title="Edit usage example"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleSaveUsage}
                      title="Save changes"
                    >
                      <Save className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCancelEdit}
                      title="Cancel editing"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleCopy(codeToCopy)}
              title="Copy code"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="usage" className="flex-1 m-0 mt-0 overflow-hidden">
          <div className="h-full">
            <CodeEditor
              value={currentUsageExample}
              onChange={isEditingUsage ? setEditedUsageExample : undefined}
              language={usageLanguage}
              readOnly={!isEditingUsage}
            />
          </div>
        </TabsContent>

        <TabsContent value="code" className="flex-1 m-0 mt-0 overflow-hidden">
          <div className="h-full">
            <CodeEditor
              value={allCode}
              onChange={() => {}} // Read-only
              language={files[0]?.language || "tsx"}
              readOnly={true}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

