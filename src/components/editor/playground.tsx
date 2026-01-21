"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Copy,
  Trash2,
  Check,
  MoreVertical,
  Edit2,
  Plus,
  X,
  FileCode,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CodeEditor } from "./code-editor";
import { LivePreview } from "@/components/preview/live-preview";
import { VersionHistory } from "./version-history";
import {
  detectFramework,
  detectLanguage,
  getFrameworkLabel,
  getFrameworkColor,
  type Framework,
  type Language,
} from "@/lib/detect-framework";
import { extractComponentName, suggestFilename } from "@/lib/parse-imports";
import { extractImports } from "@/lib/dependency-registry";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface PlaygroundProps {
  componentId: string;
}

interface FileTab {
  id: string;
  filename: string;
  language: Language;
  code: string;
}

const FILE_TEMPLATES: { label: string; filename: string; language: Language }[] = [
  { label: "HTML", filename: "index.html", language: "html" },
  { label: "CSS", filename: "styles.css", language: "css" },
  { label: "JavaScript", filename: "script.js", language: "js" },
  { label: "React (TSX)", filename: "App.tsx", language: "tsx" },
  { label: "React (JSX)", filename: "App.jsx", language: "jsx" },
  { label: "Vue (SFC)", filename: "App.vue", language: "vue" },
  { label: "Angular (TS)", filename: "app.component.ts", language: "ts" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function Playground({ componentId }: PlaygroundProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: component, isLoading } = trpc.component.getById.useQuery(
    componentId
  );

  const [files, setFiles] = useState<FileTab[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDepsCopied, setIsDepsCopied] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [originalFiles, setOriginalFiles] = useState<FileTab[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [saveNameInput, setSaveNameInput] = useState("");

  const installPackages = useMemo(() => {
    const pkgs = new Set<string>();
    for (const f of files) {
      const imps = extractImports(f.code || "");
      for (const imp of imps) {
        if (!imp) continue;
        if (imp.startsWith("./") || imp.startsWith("../")) continue;
        if (imp === "react" || imp === "react-dom") continue;
        // next/* imports usually exist in Next apps already; still show if user wants
        pkgs.add(imp);
      }
    }
    return Array.from(pkgs).sort();
  }, [files]);

  const installCommand = useMemo(() => {
    if (installPackages.length === 0) return null;
    return `npm i ${installPackages.join(" ")}`;
  }, [installPackages]);

  const saveMutation = trpc.version.add.useMutation({
    onSuccess: () => {
      utils.component.getById.invalidate(componentId);
      utils.component.list.invalidate();
      setHasUnsavedChanges(false);
      setOriginalFiles(files);
    },
  });

  const updateMutation = trpc.component.update.useMutation({
    onSuccess: () => {
      utils.component.getById.invalidate(componentId);
      utils.component.list.invalidate();
      setIsEditingTitle(false);
    },
  });

  const deleteMutation = trpc.component.softDelete.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  // Initialize state from component data
  useEffect(() => {
    if (component) {
      setTitle(component.title);
      if (component.versions.length > 0 && !currentVersionId) {
        const latestVersion = component.versions[0];
        setCurrentVersionId(latestVersion.id);

        // Convert version files to FileTab format
        const versionFiles: FileTab[] = latestVersion.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          language: f.language as Language,
          code: f.code,
        }));

        setFiles(versionFiles);
        setOriginalFiles(versionFiles);
        if (versionFiles.length > 0) {
          setActiveFileId(versionFiles[0].id);
        }
      }
    }
  }, [component, currentVersionId]);

  // Handle version change
  const handleVersionChange = useCallback(
    (versionId: string) => {
      const version = component?.versions.find((v) => v.id === versionId);
      if (version) {
        setCurrentVersionId(versionId);

        const versionFiles: FileTab[] = version.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          language: f.language as Language,
          code: f.code,
        }));

        setFiles(versionFiles);
        setOriginalFiles(versionFiles);
        if (versionFiles.length > 0) {
          setActiveFileId(versionFiles[0].id);
        }
        setHasUnsavedChanges(false);
      }
    },
    [component?.versions]
  );

  // Auto-detect framework and update filename/extension
  useEffect(() => {
    const allCode = files.map((f) => f.code).join("\n");
    if (!allCode.trim()) return;
    
    const detected = detectFramework(allCode);
    const detectedLanguage = detectLanguage(allCode, detected);
    
    // Extract component name
    let componentName: string | null = null;
    if (detected === "react" || detected === "next") {
      componentName = extractComponentName(allCode);
    }
    
    // Update filename and language for files with code
    // Only update if there's an actual change needed to prevent infinite loops
    setFiles(prev => {
      const updated = prev.map(f => {
        if (!f.code.trim()) return f;
        
        let newLanguage = f.language;
        let newFilename = f.filename;
        let shouldUpdate = false;
        
        const currentExt = f.filename.split('.').pop()?.toLowerCase();
        const isDefaultFilename = f.filename === "index.html" || 
                                 f.filename === "App.tsx" || 
                                 f.filename === "App.jsx" ||
                                 f.filename === "App.vue" ||
                                 !f.filename.match(/\.(tsx|jsx|vue|html|css|js|ts)$/);
        
        if (detected === "react" || detected === "next") {
          const expectedLanguage = detectedLanguage === "tsx" ? "tsx" : "jsx";
          const expectedExt = expectedLanguage;
          
          if (f.language !== expectedLanguage || currentExt !== expectedExt || isDefaultFilename) {
            newLanguage = expectedLanguage;
            if (componentName) {
              newFilename = suggestFilename(componentName, expectedLanguage);
            } else if (isDefaultFilename || currentExt !== expectedExt) {
              newFilename = `Component.${expectedLanguage}`;
            }
            shouldUpdate = true;
          }
        } else if (detected === "vue") {
          if (f.language !== "vue" || currentExt !== "vue" || isDefaultFilename) {
            newLanguage = "vue";
            if (isDefaultFilename || currentExt !== "vue") {
              newFilename = "App.vue";
            }
            shouldUpdate = true;
          }
        } else if (detected === "html") {
          if (f.language !== "html" || currentExt !== "html" || isDefaultFilename) {
            newLanguage = "html";
            if (isDefaultFilename || currentExt !== "html") {
              newFilename = "index.html";
            }
            shouldUpdate = true;
          }
        }
        
        if (shouldUpdate && (f.filename !== newFilename || f.language !== newLanguage)) {
          return { ...f, filename: newFilename, language: newLanguage as Language };
        }
        
        return f;
      });
      
      // Only return new array if something actually changed
      const hasChanges = updated.some((f, i) => 
        f.filename !== prev[i].filename || f.language !== prev[i].language
      );
      
      return hasChanges ? updated : prev;
    });
  }, [files.map(f => f.code).join("\n")]);

  // Check for unsaved changes
  useEffect(() => {
    // Compare files by ID to handle reordering
    if (files.length !== originalFiles.length) {
      setHasUnsavedChanges(true);
      return;
    }
    
    const originalMap = new Map(originalFiles.map(f => [f.id, f]));
    const hasChanges = files.some((file) => {
      const original = originalMap.get(file.id);
      return (
        !original ||
        file.code !== original.code ||
        file.filename !== original.filename
      );
    });
    
    setHasUnsavedChanges(hasChanges);
  }, [files, originalFiles]);

  // Auto-run preview when files change (debounced)
  useEffect(() => {
    if (files.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      setPreviewKey((prev) => prev + 1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [files]);

  // Handle code change for active file
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, code: newCode } : f))
      );
    },
    [activeFileId]
  );

  // Add new file
  const handleAddFile = useCallback((template: typeof FILE_TEMPLATES[0]) => {
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
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [files]);

  // Remove file
  const handleRemoveFile = useCallback((fileId: string) => {
    if (files.length <= 1) return;

    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(files.find((f) => f.id !== fileId)?.id ?? "");
    }
  }, [files, activeFileId]);

  // Check if component is untitled (matches "Untitled" or "Untitled X" pattern)
  const isUntitled = /^Untitled(?: \d+)?$/.test(title) || !title.trim();

  // Initialize save name input when dialog opens for untitled component
  useEffect(() => {
    if (isSaveDialogOpen && isUntitled) {
      setSaveNameInput(title || "");
    }
  }, [isSaveDialogOpen, isUntitled, title]);

  // Handle save from dialog
  const handleSaveFromDialog = useCallback(() => {
    if (isUntitled && !saveNameInput.trim()) {
      return; // Can't save without a name
    }

    // If untitled and we have a name input, update title first
    if (isUntitled && saveNameInput.trim()) {
      updateMutation.mutate(
        {
          id: componentId,
          title: saveNameInput.trim(),
        },
        {
          onSuccess: () => {
            // Update local title
            setTitle(saveNameInput.trim());
            // Then save the files
            saveMutation.mutate({
              componentId,
              files: files
                .filter((f) => f.code.trim())
                .map((f, index) => ({
                  filename: f.filename,
                  language: f.language,
                  code: f.code,
                  order: index,
                })),
            });
            setSaveNameInput("");
            setIsSaveDialogOpen(false);
            if (pendingNavigation) {
              pendingNavigation();
              setPendingNavigation(null);
            }
          },
        }
      );
    } else {
      // Regular save (not untitled)
      saveMutation.mutate({
        componentId,
        files: files
          .filter((f) => f.code.trim())
          .map((f, index) => ({
            filename: f.filename,
            language: f.language,
            code: f.code,
            order: index,
          })),
      });
      setIsSaveDialogOpen(false);
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
    }
  }, [componentId, files, saveMutation, updateMutation, isUntitled, saveNameInput, pendingNavigation]);

  // Handle save (regular save button)
  const handleSave = useCallback(() => {
    if (!hasUnsavedChanges) return;

    saveMutation.mutate({
      componentId,
      files: files
        .filter((f) => f.code.trim())
        .map((f, index) => ({
          filename: f.filename,
          language: f.language,
          code: f.code,
          order: index,
        })),
    });
  }, [componentId, files, hasUnsavedChanges, saveMutation]);

  // Handle navigation with unsaved changes check
  const handleNavigation = useCallback((navigateFn: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigateFn);
      setIsSaveDialogOpen(true);
    } else {
      navigateFn();
    }
  }, [hasUnsavedChanges]);

  // Handle discard (leave without saving)
  const handleDiscard = useCallback(() => {
    setIsSaveDialogOpen(false);
    setPendingNavigation(null);
    setSaveNameInput("");
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  // Handle copy (copy all files as formatted)
  const handleCopy = useCallback(async () => {
    const allCode = files
      .map((f) => `// ${f.filename}\n${f.code}`)
      .join("\n\n");
    await navigator.clipboard.writeText(allCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [files]);

  const handleCopyDeps = useCallback(async () => {
    if (!installCommand) return;
    await navigator.clipboard.writeText(installCommand);
    setIsDepsCopied(true);
    setTimeout(() => setIsDepsCopied(false), 2000);
  }, [installCommand]);

  // Handle title update
  const handleTitleUpdate = useCallback(() => {
    if (title.trim() && title !== component?.title) {
      updateMutation.mutate({
        id: componentId,
        title: title.trim(),
      });
    } else {
      setIsEditingTitle(false);
    }
  }, [componentId, title, component?.title, updateMutation]);

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteMutation.mutate(componentId);
  }, [componentId, deleteMutation]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Warn before leaving with unsaved changes (browser tab close/refresh)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Chrome requires returnValue to be set
      return ""; // For older browsers
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!component) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <span className="text-lg text-muted-foreground">
          Component not found
        </span>
        <Button variant="outline" onClick={() => router.push("/")}>
          Go back
        </Button>
      </div>
    );
  }

  const framework = component.framework as Framework;
  const activeFile = files.find((f) => f.id === activeFileId);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigation(() => router.push("/"))}
            title="Back to grid"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleUpdate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleUpdate();
                  if (e.key === "Escape") {
                    setTitle(component.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-8 w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1 text-lg font-semibold hover:text-primary transition-colors"
              >
                {component.title}
                <Edit2 className="h-3 w-3 opacity-50" />
              </button>
            )}

            <Badge
              variant="outline"
              className={cn("text-xs", getFrameworkColor(framework))}
            >
              {getFrameworkLabel(framework)}
            </Badge>

            <Badge variant="outline" className="text-xs">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </Badge>

            {hasUnsavedChanges && (
              <Badge
                variant="outline"
                className="text-xs text-yellow-500 border-yellow-500/20"
              >
                Unsaved
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VersionHistory
            versions={component.versions}
            currentVersionId={currentVersionId ?? ""}
            onVersionChange={handleVersionChange}
          />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              title="Copy all code"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    updateMutation.mutate({
                      id: componentId,
                      status:
                        component.status === "ready" ? "experiment" : "ready",
                    })
                  }
                >
                  Mark as {component.status === "ready" ? "Experiment" : "Ready"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Editor + Preview Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="w-1/2 border-r border-border/40 flex flex-col">
          {/* File Tabs */}
          <div className="flex items-center gap-1 px-2 py-1 border-b border-border/40 bg-muted/30 overflow-x-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "group flex items-center gap-1 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors text-sm shrink-0",
                  activeFileId === file.id
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
                onClick={() => setActiveFileId(file.id)}
              >
                {file.language === "html" && <FileCode className="h-3 w-3" />}
                {file.language === "css" && <FileText className="h-3 w-3" />}
                {file.language === "js" && <FileCode className="h-3 w-3" />}
                {(file.language === "tsx" || file.language === "jsx") && <FileCode className="h-3 w-3" />}
                <span className="truncate max-w-[100px]">{file.filename}</span>
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
                    <FileCode className="h-4 w-4" />
                    <span>{template.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {template.filename}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            {activeFile && (
              <CodeEditor
                value={activeFile.code}
                onChange={handleCodeChange}
                language={activeFile.language}
              />
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 flex flex-col gap-2">
          {installCommand && (
            <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Install dependencies for this component
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyDeps}
                  title="Copy install command"
                >
                  {isDepsCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-1 font-mono text-xs text-foreground/90 break-all">
                {installCommand}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <LivePreview
              key={previewKey}
              files={files.map((f) => ({
                filename: f.filename,
                language: f.language,
                code: f.code,
              }))}
              framework={framework}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isUntitled ? "Save Untitled Component?" : "Save Changes?"}
            </DialogTitle>
            <DialogDescription>
              {isUntitled
                ? "You have unsaved changes. Please provide a name for this component before saving."
                : `You have unsaved changes to "${component?.title}". Do you want to save before leaving?`}
            </DialogDescription>
          </DialogHeader>
          {isUntitled && (
            <div className="py-4">
              <Input
                placeholder="Component name"
                value={saveNameInput}
                onChange={(e) => setSaveNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveNameInput.trim()) {
                    handleSaveFromDialog();
                  }
                }}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              variant="default"
              onClick={handleSaveFromDialog}
              disabled={
                (isUntitled && !saveNameInput.trim()) ||
                saveMutation.isPending ||
                updateMutation.isPending
              }
            >
              {saveMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{component.title}"? This action
              can be undone from the trash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
