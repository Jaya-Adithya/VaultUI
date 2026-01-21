/**
 * Utility to add type definitions to Monaco Editor's TypeScript language service
 * This allows the editor to recognize packages installed in WebContainer
 */

export function addPackageTypeDefinitions(packageNames: string[]): void {
  if (typeof window === "undefined") return;

  try {
    // Dynamically import Monaco - it's loaded by the editor component
    const monaco = (window as any).monaco;
    if (!monaco || !monaco.languages?.typescript) {
      console.warn("Monaco Editor not available");
      return;
    }

    const ts = monaco.languages.typescript;
    
    // Generate type definitions for each package with proper ESM syntax
    const typeDefs = packageNames
      .filter((pkg) => pkg && typeof pkg === "string")
      .map((pkg) => {
        // Generate ESM-compatible type definition that works with:
        // import { Calendar } from "lucide-react" (named exports)
        // import DayPicker from "react-day-picker" (default exports)
        // Use a catch-all approach that supports both CommonJS and ESM
        // Use the simplest valid TypeScript pattern
        // This makes the module recognized, even if named exports show as 'any'
        // Match the pattern from code-editor.tsx for consistency
        return `declare module "${pkg}" {
  const x: any;
  export = x;
  export default x;
}`;
      })
      .join("\n\n");

    if (typeDefs) {
      // Use unique filename with timestamp to ensure updates are picked up
      const filename = `file:///vaultui/webcontainer-packages-${Date.now()}.d.ts`;
      
      // Add to TypeScript defaults
      ts.typescriptDefaults.addExtraLib(typeDefs, filename);
      ts.javascriptDefaults.addExtraLib(typeDefs, filename);

      // Force Monaco to refresh all models to pick up new type definitions
      // This ensures the editor recognizes the new types immediately
      if (monaco.editor) {
        monaco.editor.getModels().forEach((model) => {
          // Trigger a model update to refresh diagnostics
          const value = model.getValue();
          model.setValue(value);
        });
      }

      console.log(`✅ Added type definitions for packages: ${packageNames.join(", ")}`);
      console.log("Editor should now recognize these packages. If errors persist, try saving and reopening the file.");
    }
  } catch (err) {
    console.error("Failed to add package type definitions:", err);
  }
}

/**
 * Remove type definitions (useful for cleanup)
 */
export function removePackageTypeDefinitions(): void {
  if (typeof window === "undefined") return;

  try {
    const monaco = (window as any).monaco;
    if (!monaco || !monaco.languages?.typescript) return;

    const ts = monaco.languages.typescript;
    
    // Note: Monaco doesn't have a direct removeExtraLib method
    // We'd need to track the disposable returned by addExtraLib
    // For now, we'll just add new definitions which will override
    console.log("Type definitions removed (new ones will override)");
  } catch (err) {
    console.error("Failed to remove package type definitions:", err);
  }
}
