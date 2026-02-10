"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, FileCode, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  detectFramework,
  detectLanguage,
  isRenderable,
  getFrameworkLabel,
  getFrameworkColor,
  type Framework,
  type Language,
} from "@/lib/detect-framework";
import { extractComponentName, suggestFilename } from "@/lib/parse-imports";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface FileTab {
  id: string;
  filename: string;
  language: Language;
  code: string;
}

interface AddComponentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const FILE_TEMPLATES: { label: string; filename: string; language: Language; icon: React.ReactNode }[] = [
  { label: "HTML", filename: "index.html", language: "html", icon: <FileCode className="h-4 w-4" /> },
  { label: "CSS", filename: "styles.css", language: "css", icon: <FileText className="h-4 w-4" /> },
  { label: "JavaScript", filename: "script.js", language: "js", icon: <FileCode className="h-4 w-4" /> },
  { label: "React (TSX)", filename: "App.tsx", language: "tsx", icon: <FileCode className="h-4 w-4" /> },
  { label: "React (JSX)", filename: "App.jsx", language: "jsx", icon: <FileCode className="h-4 w-4" /> },
  { label: "Vue (SFC)", filename: "App.vue", language: "vue", icon: <FileCode className="h-4 w-4" /> },
  { label: "Angular (TS)", filename: "app.component.ts", language: "ts", icon: <FileCode className="h-4 w-4" /> },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function AddComponentForm({
  open,
  onOpenChange,
  onSuccess,
}: AddComponentFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileTab[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [framework, setFramework] = useState<Framework>("html");
  const [status, setStatus] = useState<"experiment" | "ready">("experiment");
  const [pasteAreaCode, setPasteAreaCode] = useState("");
  const [packageInstallCommand, setPackageInstallCommand] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const utils = trpc.useUtils();
  const createMutation = trpc.component.create.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const activeFile = files.find((f) => f.id === activeFileId);

  // Handle paste area - create file when code is pasted
  useEffect(() => {
    if (pasteAreaCode.trim() && files.length === 0) {
      console.log("[AddComponentForm] Paste area code detected, length:", pasteAreaCode.length);
      console.log("[AddComponentForm] Code preview:", pasteAreaCode.substring(0, 100));

      // Auto-detect framework from pasted code (without filename initially)
      const detected = detectFramework(pasteAreaCode);
      console.log("[AddComponentForm] Detected framework from paste:", detected);

      const detectedLanguage = detectLanguage(pasteAreaCode, detected);
      console.log("[AddComponentForm] Detected language:", detectedLanguage);

      const componentName = detected === "react" || detected === "next"
        ? extractComponentName(pasteAreaCode)
        : null;

      // Determine filename and language
      let filename: string;
      let language: Language;

      if (detected === "react" || detected === "next") {
        language = detectedLanguage === "tsx" ? "tsx" : "jsx";
        filename = componentName
          ? suggestFilename(componentName, language)
          : `Component.${language}`;
      } else if (detected === "vue") {
        language = "vue";
        filename = componentName
          ? suggestFilename(componentName, "vue")
          : "App.vue";
      } else if (detected === "html") {
        language = "html";
        const titleMatch = pasteAreaCode.match(/<title[^>]*>([^<]+)<\/title>/i) ||
          pasteAreaCode.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        filename = titleMatch
          ? `${titleMatch[1].trim().replace(/\s+/g, '-').toLowerCase()}.html`
          : "index.html";
      } else if (detected === "css") {
        language = "css";
        filename = "styles.css";
        console.log("[AddComponentForm] ✅ CSS detected correctly from paste");
      } else if (detected === "js") {
        language = "js";
        filename = "script.js";
      } else {
        language = "html";
        filename = "index.html";
        console.log("[AddComponentForm] ⚠️ Could not detect type, defaulting to HTML");
      }

      console.log("[AddComponentForm] Creating file:", { filename, language, detected });

      // Create the file
      const newFile: FileTab = {
        id: generateId(),
        filename,
        language,
        code: pasteAreaCode,
      };

      setFiles([newFile]);
      setActiveFileId(newFile.id);
      setFramework(detected);
      setPasteAreaCode(""); // Clear paste area

      // Auto-update title if empty
      if (componentName && !title.trim()) {
        setTitle(componentName);
      }
    }
  }, [pasteAreaCode, files.length, title]);

  // Auto-detect framework and component name when files change
  // IMPORTANT: Detect per-file, not by combining all files (prevents CSS from being detected as HTML)
  useEffect(() => {
    if (files.length === 0) return;

    console.log("[AddComponentForm] Auto-detecting languages for files:", files.map(f => ({
      filename: f.filename,
      currentLanguage: f.language,
      codeLength: f.code.length
    })));

    // Detect framework per-file to avoid CSS being detected as HTML
    setFiles(prev => {
      const updated = prev.map(f => {
        // Only detect if file has code
        if (!f.code.trim()) {
          console.log(`[AddComponentForm] Skipping detection for empty file: ${f.filename}`);
          return f;
        }

        // Detect framework for THIS file specifically (not all files combined)
        const fileDetected = detectFramework(f.code, f.filename);
        const fileDetectedLanguage = detectLanguage(f.code, fileDetected);

        console.log(`[AddComponentForm] File detection for ${f.filename}:`, {
          currentLanguage: f.language,
          detectedFramework: fileDetected,
          detectedLanguage: fileDetectedLanguage,
          codePreview: f.code.substring(0, 50)
        });

        let newLanguage = f.language;
        let newFilename = f.filename;
        let shouldUpdate = false;

        const currentExt = f.filename.split('.').pop()?.toLowerCase();
        const isDefaultFilename = f.filename === "index.html" ||
          f.filename === "App.tsx" ||
          f.filename === "App.jsx" ||
          f.filename === "App.vue" ||
          f.filename === "styles.css" ||
          f.filename === "script.js" ||
          !f.filename.match(/\.(tsx|jsx|vue|html|css|js|ts)$/);

        // Use file-specific detection instead of global detection
        if (fileDetected === "react" || fileDetected === "next") {
          const expectedLanguage = fileDetectedLanguage === "tsx" ? "tsx" : "jsx";
          if (f.language !== expectedLanguage || currentExt !== expectedLanguage || isDefaultFilename) {
            newLanguage = expectedLanguage;
            const componentName = extractComponentName(f.code);
            if (componentName) {
              newFilename = suggestFilename(componentName, expectedLanguage);
            } else if (isDefaultFilename || currentExt !== expectedLanguage) {
              newFilename = `Component.${expectedLanguage}`;
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "vue") {
          if (f.language !== "vue" || currentExt !== "vue" || isDefaultFilename) {
            newLanguage = "vue";
            const nameMatch = f.code.match(/<script[^>]*>[\s\S]*?name\s*[:=]\s*['"]([^'"]+)['"]/i) ||
              f.code.match(/export\s+default\s+{\s*name\s*:\s*['"]([^'"]+)['"]/i);
            if (nameMatch) {
              newFilename = suggestFilename(nameMatch[1], "vue");
            } else if (isDefaultFilename || currentExt !== "vue") {
              newFilename = "App.vue";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "html") {
          if (f.language !== "html" || currentExt !== "html" || isDefaultFilename) {
            newLanguage = "html";
            const titleMatch = f.code.match(/<title[^>]*>([^<]+)<\/title>/i) ||
              f.code.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (titleMatch) {
              newFilename = `${titleMatch[1].trim().replace(/\s+/g, '-').toLowerCase()}.html`;
            } else if (isDefaultFilename || currentExt !== "html") {
              newFilename = "index.html";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "css") {
          // Check if any React/TSX file imports this CSS file as a module
          let suggestedCssFilename = null;
          for (const otherFile of prev) {
            if (otherFile.language === "tsx" || otherFile.language === "jsx") {
              // Look for CSS module imports like: import styles from './page.module.css'
              const cssModuleImportMatch = otherFile.code.match(/import\s+\w+\s+from\s+['"]\.\/([^'"]+\.(?:module\.)?css)['"]/);
              if (cssModuleImportMatch) {
                const importedCssName = cssModuleImportMatch[1];
                // If this CSS file matches the import (or is the only CSS file), use the imported name
                if (f.filename === importedCssName || (prev.filter(f => f.language === "css").length === 1 && !f.filename.match(/\.(module\.)?css$/))) {
                  suggestedCssFilename = importedCssName;
                  break;
                }
              }
            }
          }

          // CRITICAL: Ensure CSS files are detected as CSS
          if (f.language !== "css" || currentExt !== "css" || suggestedCssFilename) {
            console.log(`[AddComponentForm] Updating ${f.filename} to CSS (detected: ${fileDetected})`);
            newLanguage = "css";
            if (suggestedCssFilename) {
              newFilename = suggestedCssFilename;
            } else if (isDefaultFilename || currentExt !== "css") {
              newFilename = "styles.css";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "js") {
          if (f.language !== "js" || currentExt !== "js") {
            newLanguage = "js";
            if (isDefaultFilename || currentExt !== "js") {
              newFilename = "script.js";
            }
            shouldUpdate = true;
          }
        }

        if (shouldUpdate) {
          console.log(`[AddComponentForm] Updating ${f.filename}: ${f.language} -> ${newLanguage}, ${f.filename} -> ${newFilename}`);
          return { ...f, filename: newFilename, language: newLanguage as Language };
        }

        return f;
      });

      // Only return new array if something actually changed
      const hasChanges = updated.some((f, i) =>
        f.filename !== prev[i]?.filename || f.language !== prev[i]?.language
      );

      return hasChanges ? updated : prev;
    });

    // Determine overall framework from all files (for display purposes)
    const allCode = files.map((f) => f.code).join("\n");
    if (allCode.trim()) {
      const uniqueLanguages = new Set(files.filter(f => f.code.trim()).map((f) => f.language));

      // If we have multiple file types, determine the primary framework
      if (uniqueLanguages.size > 1) {
        if (uniqueLanguages.has("html") || uniqueLanguages.has("css") || uniqueLanguages.has("js")) {
          setFramework("html"); // HTML+CSS+JS combo is treated as HTML
        } else if (uniqueLanguages.has("tsx") || uniqueLanguages.has("jsx")) {
          const reactCode = files.find(f => f.language === "tsx" || f.language === "jsx")?.code || "";
          const detected = detectFramework(reactCode);
          setFramework(detected);
        } else {
          // Use the first file's detected framework
          const firstFile = files.find(f => f.code.trim());
          if (firstFile) {
            const detected = detectFramework(firstFile.code, firstFile.filename);
            setFramework(detected);
          }
        }
      } else {
        // Single file type - detect from that file
        const fileWithCode = files.find(f => f.code.trim());
        if (fileWithCode) {
          const detected = detectFramework(fileWithCode.code, fileWithCode.filename);
          setFramework(detected);
        }
      }

      // Auto-detect component name from React/Vue files
      let componentName: string | null = null;
      const reactFile = files.find(f => f.language === "tsx" || f.language === "jsx");
      const vueFile = files.find(f => f.language === "vue");
      const htmlFile = files.find(f => f.language === "html");

      if (reactFile) {
        componentName = extractComponentName(reactFile.code);
      } else if (vueFile) {
        const nameMatch = vueFile.code.match(/<script[^>]*>[\s\S]*?name\s*[:=]\s*['"]([^'"]+)['"]/i) ||
          vueFile.code.match(/export\s+default\s+{\s*name\s*:\s*['"]([^'"]+)['"]/i);
        if (nameMatch) {
          componentName = nameMatch[1];
        }
      } else if (htmlFile) {
        const titleMatch = htmlFile.code.match(/<title[^>]*>([^<]+)<\/title>/i) ||
          htmlFile.code.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        componentName = titleMatch ? titleMatch[1].trim() : null;
      }

      // Auto-update title if empty and we have a component name
      if (componentName && !title.trim()) {
        setTitle(componentName);
      }
    }
  }, [files.map(f => `${f.id}:${f.filename}:${f.code.length}`).join("|"), title]);

  const resetForm = () => {
    setPackageInstallCommand("");
    setCoverImage("");
    setTitle("");
    setDescription("");
    setFiles([]);
    setActiveFileId("");
    setFramework("html");
    setStatus("experiment");
    setPasteAreaCode("");
  };

  const handleAddFile = useCallback((template: typeof FILE_TEMPLATES[0]) => {
    // Check if file with same name exists
    const existingFile = files.find((f) => f.filename === template.filename);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    const newFile: FileTab = {
      id: generateId(),
      filename: template.filename,
      language: template.language,
      code: "",
    };
    setFiles((prev) => {
      const updated = [...prev, newFile];
      // Set active file if this is the first file
      if (prev.length === 0) {
        setActiveFileId(newFile.id);
      }
      return updated;
    });
    // Clear paste area if it exists
    setPasteAreaCode("");
  }, [files]);

  const handleRemoveFile = useCallback((fileId: string) => {
    if (files.length <= 1) return; // Keep at least one file

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find((f) => f.id !== fileId)?.id ?? "");
    }
  }, [files, activeFileId]);

  const handleCodeChange = useCallback((code: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, code } : f))
    );
  }, [activeFileId]);

  const handleFilenameChange = useCallback((filename: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, filename } : f))
    );
  }, [activeFileId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If there's code in paste area but no files, create a file from it first
    let filesToSubmit = [...files];
    if (pasteAreaCode.trim() && files.length === 0) {
      const detected = detectFramework(pasteAreaCode);
      const detectedLanguage = detectLanguage(pasteAreaCode, detected);
      const componentName = detected === "react" || detected === "next"
        ? extractComponentName(pasteAreaCode)
        : null;

      let filename: string;
      let language: Language;

      if (detected === "react" || detected === "next") {
        language = detectedLanguage === "tsx" ? "tsx" : "jsx";
        filename = componentName
          ? suggestFilename(componentName, language)
          : `Component.${language}`;
      } else if (detected === "vue") {
        language = "vue";
        filename = componentName
          ? suggestFilename(componentName, "vue")
          : "App.vue";
      } else if (detected === "html") {
        language = "html";
        filename = "index.html";
      } else if (detected === "css") {
        language = "css";
        filename = "styles.css";
      } else if (detected === "js") {
        language = "js";
        filename = "script.js";
      } else {
        language = "html";
        filename = "index.html";
      }

      filesToSubmit = [{
        id: generateId(),
        filename,
        language,
        code: pasteAreaCode,
      }];
    }

    if (!title.trim() || filesToSubmit.every((f) => !f.code.trim())) return;

    // Determine overall framework and language
    const allCode = filesToSubmit.map((f) => f.code).join("\n");
    const detectedFramework = detectFramework(allCode);
    const uniqueLanguages = new Set(filesToSubmit.filter((f) => f.code.trim()).map((f) => f.language));
    const language = uniqueLanguages.size > 1 ? "multi" : (uniqueLanguages.values().next().value ?? "html");

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      framework: detectedFramework,
      language,
      files: filesToSubmit
        .filter((f) => f.code.trim()) // Only include files with code
        .map((f, index) => ({
          filename: f.filename,
          language: f.language,
          code: f.code,
          order: index,
        })),
      isRenderable: isRenderable(detectedFramework) || uniqueLanguages.has("html"),
      packageInstallCommand: packageInstallCommand.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
    });
  };

  const canRender = isRenderable(framework) || files.some((f) => f.language === "html");
  const hasCode = files.some((f) => f.code.trim());
  const hasPasteCode = !!pasteAreaCode.trim();
  const hasTitle = !!title.trim();
  const hasAnyCode = hasCode || hasPasteCode;
  
  // Compute button disabled state explicitly
  const isButtonDisabled = !hasTitle || !hasAnyCode || createMutation.isPending;
  
  // Debug: Log validation state
  useEffect(() => {
    if (open) {
      console.log("[AddComponentForm] Validation state:", {
        hasTitle,
        title: title.trim(),
        filesCount: files.length,
        hasCode,
        pasteAreaCodeLength: pasteAreaCode.trim().length,
        hasPasteCode,
        hasAnyCode,
        isPending: createMutation.isPending,
        isButtonDisabled,
        files: files.map(f => ({ 
          filename: f.filename, 
          codeLength: f.code.length, 
          hasCode: !!f.code.trim() 
        }))
      });
    }
  }, [open, hasTitle, title, hasCode, hasPasteCode, hasAnyCode, pasteAreaCode, createMutation.isPending, isButtonDisabled, files]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
          <DialogDescription>
            Add multiple files (HTML, CSS, JS) using the tabs below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Animated Button"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Brief description of the component"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
            <div className="relative">
              <Input
                id="coverImage"
                placeholder="https://..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="pr-8"
              />
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageInstall">Package Installation Command (optional)</Label>
            <Input
              id="packageInstall"
              placeholder='e.g., npx shadcn-vue@latest add "https://registry.inspira-ui.com/animate-grid.json"'
              value={packageInstallCommand}
              onChange={(e) => setPackageInstallCommand(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Command to install required packages for this component (e.g., shadcn-vue, npm, pnpm install commands)
            </p>
          </div>

          {/* File Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Files</Label>
              {hasCode && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getFrameworkColor(framework))}
                  >
                    {getFrameworkLabel(framework)}
                  </Badge>
                  {canRender ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      Renderable
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    >
                      Code Only
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Tab Bar - Only show if files exist */}
            {files.length > 0 && (
              <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "group flex items-center gap-1 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors text-sm",
                      activeFileId === file.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setActiveFileId(file.id)}
                  >
                    <span className="truncate max-w-[120px]">{file.filename}</span>
                    {files.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add File Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {FILE_TEMPLATES.map((template) => (
                      <DropdownMenuItem
                        key={template.filename}
                        onClick={() => handleAddFile(template)}
                        className="flex items-center gap-2"
                      >
                        {template.icon}
                        <span>{template.label}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {template.filename}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Paste Area (when no files) or Active File Editor */}
            {files.length === 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Paste your code below to auto-detect the format, or use the + button to add a file template.
                </div>
                <Textarea
                  placeholder="Paste your code here... (React, Vue, HTML, CSS, JavaScript, etc.)"
                  className="font-mono text-sm min-h-[200px] resize-y"
                  value={pasteAreaCode}
                  onChange={(e) => setPasteAreaCode(e.target.value)}
                />
              </div>
            ) : activeFile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={activeFile.filename}
                    onChange={(e) => handleFilenameChange(e.target.value)}
                    className="h-8 w-[200px] font-mono text-sm"
                    placeholder="filename.ext"
                  />
                  <Badge variant="outline" className="text-xs">
                    {activeFile.language.toUpperCase()}
                  </Badge>
                </div>
                <Textarea
                  placeholder={`Paste your ${activeFile.language.toUpperCase()} code here...`}
                  className="font-mono text-sm min-h-[200px] resize-y"
                  value={activeFile.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="framework">Framework</Label>
              <Select
                value={framework}
                onValueChange={(v) => setFramework(v as Framework)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="next">Next.js</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="angular">Angular</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="css">CSS</SelectItem>
                  <SelectItem value="js">JavaScript</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "experiment" | "ready")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="experiment">Experiment</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isButtonDisabled}
              title={
                !hasTitle 
                  ? "Please enter a title" 
                  : !hasAnyCode
                    ? "Please add code to at least one file or paste code in the paste area"
                    : createMutation.isPending
                      ? "Creating component..."
                      : "Create Component"
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Component"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
