"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  Terminal,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Info,
  AlertTriangle,
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
import { useWebContainer } from "@/lib/use-webcontainer";
import { addPackageTypeDefinitions } from "@/lib/monaco-types";

interface TerminalLine {
  type: "stdout" | "stderr" | "info" | "command";
  text: string;
  timestamp: number;
}

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
  const [isVersionSaveDialogOpen, setIsVersionSaveDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [editorWidth, setEditorWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const resizeContainerRef = useRef<HTMLDivElement>(null);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeContainerRef.current) return;

      const containerRect = resizeContainerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newWidth));
      setEditorWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState<"terminal" | "console">("terminal");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: "log" | "error" | "warn" | "info"; message: string; timestamp: number }>>([]);
  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const spinnerLineIndexRef = useRef<number>(-1); // Track which line index is the spinner line

  // WebContainer hook for real terminal execution
  const {
    isBooting: isWebContainerBooting,
    isReady: isWebContainerReady,
    error: webContainerError,
    boot: bootWebContainer,
    runCommand: runWebContainerCommand,
    mountFiles: mountWebContainerFiles,
    readPackageJson: readWebContainerPackageJson,
  } = useWebContainer({
    onOutput: (output) => {
      // Strip ANSI escape codes
      let cleanText = output.text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");

      setTerminalOutput((prev) => {
        const newOutput = [...prev];

        // Check if this chunk contains \r (carriage return)
        if (cleanText.includes("\r")) {
          // Split by \r to get all parts
          const parts = cleanText.split(/\r/);

          // Process each part after a \r
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (i === 0 && part) {
              // First part (before any \r) - add as new line if it has content
              if (part.trim()) {
                newOutput.push({ ...output, text: part });
                spinnerLineIndexRef.current = -1; // Not a spinner line
              }
            } else if (i > 0) {
              // Parts after \r - these should overwrite the last line (spinner effect)
              const content = part.trim();

              // Check if this looks like a spinner character (single char: /, \, |, -)
              const isSpinnerChar = content.length === 1 && /^[\/\\|\-]$/.test(content);

              if (isSpinnerChar) {
                // This is a spinner character - update the spinner line
                if (spinnerLineIndexRef.current >= 0 && spinnerLineIndexRef.current < newOutput.length) {
                  // Update existing spinner line
                  newOutput[spinnerLineIndexRef.current] = {
                    ...output,
                    text: content,
                    timestamp: Date.now(),
                  };
                } else {
                  // Create new spinner line
                  newOutput.push({
                    ...output,
                    text: content,
                    timestamp: Date.now(),
                  });
                  spinnerLineIndexRef.current = newOutput.length - 1;
                }
              } else if (content) {
                // Not a spinner, but has content - update last line or add new
                if (newOutput.length > 0) {
                  newOutput[newOutput.length - 1] = {
                    ...output,
                    text: content,
                    timestamp: Date.now(),
                  };
                  spinnerLineIndexRef.current = -1; // Not a spinner line
                } else {
                  newOutput.push({ ...output, text: content });
                  spinnerLineIndexRef.current = -1;
                }
              }
              // If content is empty after \r, it means clear the line - we keep the line but empty
            }
          }

          return newOutput.slice(-200);
        } else {
          // No \r in this chunk - normal line output
          if (cleanText.trim() || output.text.trim().length > 0) {
            spinnerLineIndexRef.current = -1; // Reset spinner tracking for new content
            newOutput.push({ ...output, text: cleanText });
          }

          return newOutput.slice(-200);
        }
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        terminalOutputRef.current?.scrollTo({
          top: terminalOutputRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 10);
    },
  });

  // Auto-boot WebContainer when terminal is opened
  useEffect(() => {
    if (isTerminalOpen && terminalTab === "terminal" && !isWebContainerReady && !isWebContainerBooting) {
      bootWebContainer().catch((err) => {
        console.error("Failed to boot WebContainer:", err);
      });
    }
  }, [isTerminalOpen, terminalTab, isWebContainerReady, isWebContainerBooting, bootWebContainer]);

  // Mount files to WebContainer when they change (debounced)
  useEffect(() => {
    if (!isWebContainerReady || files.length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        const fileMap: Record<string, string> = {};

        // Try to read existing package.json to preserve dependencies
        let packageJson: any = {
          name: "playground",
          type: "module",
          dependencies: {},
        };

        try {
          const existing = await readWebContainerPackageJson();
          if (existing) {
            // Merge with existing, preserving installed dependencies
            packageJson = {
              ...packageJson,
              ...existing,
              dependencies: {
                ...packageJson.dependencies,
                ...(existing.dependencies || {}),
              },
            };
          }
        } catch (err) {
          // If reading fails, use default
          console.log("Using default package.json");
        }

        fileMap["package.json"] = JSON.stringify(packageJson, null, 2);

        // Add all user files
        for (const file of files) {
          if (file.code.trim()) {
            fileMap[file.filename] = file.code;
          }
        }

        await mountWebContainerFiles(fileMap);
      } catch (err) {
        console.error("Failed to mount files:", err);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [files, isWebContainerReady, mountWebContainerFiles, readWebContainerPackageJson]);

  // Sync package.json after npm install commands complete and update editor types
  useEffect(() => {
    if (!isWebContainerReady || terminalOutput.length === 0) return;

    // Check if last output indicates a completed npm install
    const lastOutput = terminalOutput[terminalOutput.length - 1];
    if (
      lastOutput.type === "stdout" &&
      (lastOutput.text.includes("added") ||
        lastOutput.text.includes("up to date") ||
        lastOutput.text.includes("removed") ||
        lastOutput.text.includes("packages"))
    ) {
      // Small delay to ensure package.json is written
      const timeoutId = setTimeout(async () => {
        try {
          const pkgJson = await readWebContainerPackageJson();
          if (pkgJson?.dependencies) {
            const installedPackages = Object.keys(pkgJson.dependencies);
            console.log("Installed packages:", installedPackages);

            // Add type definitions to Monaco editor
            if (installedPackages.length > 0) {
              addPackageTypeDefinitions(installedPackages);
            }
          }
        } catch (err) {
          console.error("Failed to sync package.json:", err);
        }
      }, 1000); // Increased delay to ensure npm has finished writing

      return () => clearTimeout(timeoutId);
    }
  }, [terminalOutput, isWebContainerReady, readWebContainerPackageJson]);

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

  // Create a stable dependency string for file changes
  const filesDependency = useMemo(() => {
    return files.map(f => `${f.filename}:${f.language}:${f.code.length}`).join("|");
  }, [files]);

  // Auto-detect framework and update filename/extension
  useEffect(() => {
    const allCode = files.map((f) => f.code).join("\n");
    if (!allCode.trim()) return;

    // Detect framework per-file (not combined) to avoid CSS being detected as HTML
    // For each file, detect based on its own code and filename
    console.log("[Playground] Auto-detecting framework for files:", files.map(f => ({ filename: f.filename, language: f.language })));

    setFiles(prev => {
      const updated = prev.map(f => {
        if (!f.code.trim()) return f;

        // Detect framework for THIS file specifically (not all files combined)
        const fileDetected = detectFramework(f.code, f.filename);
        const fileDetectedLanguage = detectLanguage(f.code, fileDetected);

        console.log("[Playground] File detection:", {
          filename: f.filename,
          currentLanguage: f.language,
          detectedFramework: fileDetected,
          detectedLanguage: fileDetectedLanguage
        });

        let newLanguage = f.language;
        let newFilename = f.filename;
        let shouldUpdate = false;

        const currentExt = f.filename.split('.').pop()?.toLowerCase();
        const isDefaultFilename = f.filename === "index.html" ||
          f.filename === "App.tsx" ||
          f.filename === "App.jsx" ||
          f.filename === "App.vue" ||
          !f.filename.match(/\.(tsx|jsx|vue|html|css|js|ts)$/);

        // Use file-specific detection instead of global detection
        if (fileDetected === "react" || fileDetected === "next") {
          const expectedLanguage = fileDetectedLanguage === "tsx" ? "tsx" : "jsx";
          const expectedExt = expectedLanguage;

          if (f.language !== expectedLanguage || currentExt !== expectedExt || isDefaultFilename) {
            newLanguage = expectedLanguage;
            const componentName = extractComponentName(f.code);
            if (componentName) {
              newFilename = suggestFilename(componentName, expectedLanguage);
            } else if (isDefaultFilename || currentExt !== expectedExt) {
              newFilename = `Component.${expectedLanguage}`;
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "vue") {
          if (f.language !== "vue" || currentExt !== "vue" || isDefaultFilename) {
            newLanguage = "vue";
            if (isDefaultFilename || currentExt !== "vue") {
              newFilename = "App.vue";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "html") {
          if (f.language !== "html" || currentExt !== "html" || isDefaultFilename) {
            newLanguage = "html";
            if (isDefaultFilename || currentExt !== "html") {
              newFilename = "index.html";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "css") {
          // FIX: Handle CSS detection
          if (f.language !== "css" || currentExt !== "css" || isDefaultFilename) {
            newLanguage = "css";
            if (isDefaultFilename || currentExt !== "css") {
              newFilename = "styles.css";
            }
            shouldUpdate = true;
          }
        } else if (fileDetected === "js") {
          if (f.language !== "js" || currentExt !== "js" || isDefaultFilename) {
            newLanguage = "js";
            if (isDefaultFilename || currentExt !== "js") {
              newFilename = "script.js";
            }
            shouldUpdate = true;
          }
        }

        if (shouldUpdate && (f.filename !== newFilename || f.language !== newLanguage)) {
          console.log("[Playground] Updating file:", {
            from: { filename: f.filename, language: f.language },
            to: { filename: newFilename, language: newLanguage }
          });
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
  }, [filesDependency]); // Use stable dependency string

  // Check for unsaved changes - only when there's actual content difference
  useEffect(() => {
    // If no original files exist (new playground), only mark as changed if there's actual content
    if (originalFiles.length === 0) {
      const hasActualContent = files.some((file) => file.code.trim().length > 0);
      setHasUnsavedChanges(hasActualContent);
      return;
    }

    // Compare files by ID to handle reordering
    if (files.length !== originalFiles.length) {
      // Check if the difference is meaningful (not just empty files)
      const currentHasContent = files.some((f) => f.code.trim().length > 0);
      const originalHasContent = originalFiles.some((f) => f.code.trim().length > 0);

      // Only mark as changed if there's actual content difference
      setHasUnsavedChanges(currentHasContent || originalHasContent);
      return;
    }

    const originalMap = new Map(originalFiles.map(f => [f.id, f]));
    const hasChanges = files.some((file) => {
      const original = originalMap.get(file.id);

      if (!original) {
        // New file - only count as change if it has content
        return file.code.trim().length > 0;
      }

      // Compare trimmed content to ignore whitespace-only changes
      const currentCode = file.code.trim();
      const originalCode = original.code.trim();

      // Check if there's actual content difference
      if (currentCode !== originalCode) {
        // Only count as change if both aren't empty or one has content
        return currentCode.length > 0 || originalCode.length > 0;
      }

      // Filename change is also a change
      if (file.filename !== original.filename) {
        return true;
      }

      return false;
    });

    setHasUnsavedChanges(hasChanges);
  }, [files, originalFiles]);

  // Auto-run preview when files change (debounced)
  useEffect(() => {
    if (files.length === 0) return;

    // Don't clear console logs - let users see previous logs
    // Only clear if explicitly requested by user

    const timeoutId = setTimeout(() => {
      setPreviewKey((prev) => prev + 1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [files]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin (iframe sandbox)
      if (event.data && event.data.type === "console") {
        setConsoleLogs((prev) => [
          ...prev.slice(-199), // Keep last 200 logs (increased from 100)
          {
            type: event.data.level || "log",
            message: event.data.message || String(event.data),
            timestamp: Date.now(),
          },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  // Check if current version is the latest
  const isLatestVersion = useMemo(() => {
    if (!component || !currentVersionId) return false;
    return component.versions.length > 0 && component.versions[0]!.id === currentVersionId;
  }, [component, currentVersionId]);

  // Handle save (regular save button)
  const handleSave = useCallback(() => {
    if (!hasUnsavedChanges) return;

    // If modifying the latest version, show dialog to choose replace or create new
    if (isLatestVersion) {
      setIsVersionSaveDialogOpen(true);
      return;
    }

    // For older versions, always create new version
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
  }, [componentId, files, hasUnsavedChanges, saveMutation, isLatestVersion]);

  const deleteVersionMutation = trpc.version.delete.useMutation({
    onSuccess: async () => {
      // Invalidate to refresh component data after deletion
      await utils.component.getById.invalidate(componentId);
    },
  });

  // Handle version save choice
  const handleVersionSaveChoice = useCallback((replace: boolean) => {
    setIsVersionSaveDialogOpen(false);

    if (replace && currentVersionId) {
      // Replace current version - delete old version first, then create new
      // This keeps the version number the same (after renumbering)
      deleteVersionMutation.mutate(currentVersionId, {
        onSuccess: () => {
          // After deletion, create new version
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
        },
        onError: (error) => {
          console.error('Failed to delete old version:', error);
          // Continue anyway - create new version
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
        },
      });
    } else {
      // Create new version
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
    }
  }, [componentId, files, saveMutation, currentVersionId, deleteVersionMutation]);

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
            componentId={componentId}
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
      <div ref={resizeContainerRef} className="flex flex-1 overflow-hidden relative">
        {/* Resize Overlay - captures mouse events when resizing to prevent iframe from swallowing them */}
        {isResizing && (
          <div className="absolute inset-0 z-50 cursor-col-resize select-none" />
        )}

        {/* Editor Panel */}
        <div
          className="border-r border-border/40 flex flex-col"
          style={{ width: `${editorWidth}%`, minWidth: 0 }}
        >
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

        {/* Resizer */}
        <div
          data-resizer
          className="w-1.5 bg-border/40 hover:bg-border cursor-col-resize transition-colors group relative z-20 flex-shrink-0 select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
          }}
          style={{ cursor: 'col-resize' }}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-transparent group-hover:bg-primary/20 transition-colors" />
        </div>

        {/* Preview Panel */}
        <div
          className="flex flex-col"
          style={{ width: `${100 - editorWidth}%`, minWidth: 0 }}
        >
          {/* Install Command - Always visible at top when present */}
          {installCommand && (
            <div className="border-b border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Install Dependencies
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-zinc-500 hover:text-zinc-300"
                  onClick={handleCopyDeps}
                  title="Copy install command"
                >
                  {isDepsCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <code className="block font-mono text-xs text-emerald-400 bg-zinc-900 rounded px-2 py-1.5 overflow-x-auto">
                <span className="text-zinc-600 select-none">$ </span>
                {installCommand}
              </code>
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

          {/* Terminal/Console Panel */}
          <div className="border-t border-zinc-800 bg-zinc-950">
            {/* Tab Header */}
            <div className="flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center">
                {/* Terminal Tab */}
                <button
                  onClick={() => { setIsTerminalOpen(true); setTerminalTab("terminal"); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                    terminalTab === "terminal" && isTerminalOpen
                      ? "text-zinc-200 border-zinc-200"
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  )}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Terminal</span>
                </button>

                {/* Console Tab */}
                <button
                  onClick={() => { setIsTerminalOpen(true); setTerminalTab("console"); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                    terminalTab === "console" && isTerminalOpen
                      ? "text-zinc-200 border-zinc-200"
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Console</span>
                  {consoleLogs.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-300">
                      {consoleLogs.length}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Collapse/Expand */}
              <button
                onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                className="px-3 py-2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {isTerminalOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Panel Content */}
            {isTerminalOpen && (
              <div className="max-h-64 flex flex-col">
                {/* Terminal Content */}
                {terminalTab === "terminal" && (
                  <div className="flex flex-col h-full">
                    {/* Terminal Output */}
                    <div
                      ref={terminalOutputRef}
                      className="flex-1 min-h-[100px] max-h-[180px] overflow-y-auto px-3 py-2 font-mono text-xs bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
                    >
                      {terminalOutput.length === 0 && !isWebContainerBooting && (
                        <div className="text-zinc-500 italic">
                          {webContainerError ? (
                            <div className="flex items-center gap-2 text-red-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Error: {webContainerError}</span>
                            </div>
                          ) : !isWebContainerReady ? (
                            <span>Initializing terminal...</span>
                          ) : (
                            <span>Type a command and press Enter to run it (e.g., npm install lodash)</span>
                          )}
                        </div>
                      )}
                      {isWebContainerBooting && terminalOutput.length === 0 && (
                        <div className="flex items-center gap-2 text-amber-400">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                          <span>Booting WebContainer...</span>
                        </div>
                      )}
                      {terminalOutput.map((line, i) => (
                        <div
                          key={`${line.timestamp}-${i}`}
                          className={cn(
                            "whitespace-pre-wrap break-words leading-relaxed py-0.5",
                            line.type === "command" && "text-cyan-300 font-semibold",
                            line.type === "stdout" && "text-zinc-200",
                            line.type === "stderr" && "text-red-300 bg-red-950/20 px-1 rounded",
                            line.type === "info" && "text-amber-300"
                          )}
                        >
                          {line.text}
                        </div>
                      ))}
                      {isRunningCommand && (
                        <div className="flex items-center gap-2 text-zinc-400">
                          <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" />
                          <span className="italic">Running command...</span>
                        </div>
                      )}
                    </div>

                    {/* Command Input */}
                    <div className="border-t border-zinc-800 px-3 py-2 bg-zinc-950">
                      <div className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1.5 border border-zinc-800 focus-within:border-zinc-700 transition-colors">
                        <span className="text-emerald-400 font-mono text-xs select-none font-semibold">$</span>
                        <input
                          type="text"
                          value={terminalCommand}
                          onChange={(e) => setTerminalCommand(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && terminalCommand.trim() && !isRunningCommand && isWebContainerReady) {
                              const cmd = terminalCommand.trim();
                              setTerminalCommand("");
                              setIsRunningCommand(true);
                              try {
                                await runWebContainerCommand(cmd);
                              } catch (err) {
                                console.error("Command execution error:", err);
                              } finally {
                                setIsRunningCommand(false);
                              }
                            }
                          }}
                          placeholder={
                            !isWebContainerReady
                              ? "Initializing..."
                              : isRunningCommand
                                ? "Running..."
                                : "Type command and press Enter..."
                          }
                          disabled={isRunningCommand || !isWebContainerReady}
                          className="flex-1 bg-transparent border-0 outline-none font-mono text-xs text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {isWebContainerReady && (
                          <div className="flex items-center gap-1">
                            {terminalOutput.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                onClick={() => setTerminalOutput([])}
                                title="Clear terminal"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="WebContainer ready" />
                          </div>
                        )}
                        {isWebContainerBooting && (
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Booting..." />
                        )}
                        {webContainerError && !isWebContainerBooting && (
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Error" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Console Content */}
                {terminalTab === "console" && (
                  <div className="px-3 py-2">
                    {consoleLogs.length > 0 ? (
                      <>
                        <div className="flex items-center justify-end mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-300"
                            onClick={() => setConsoleLogs([])}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {consoleLogs.map((log, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start gap-2 font-mono text-xs px-2 py-1 rounded",
                                log.type === "error" && "bg-red-950/50 text-red-400",
                                log.type === "warn" && "bg-yellow-950/50 text-yellow-400",
                                log.type === "info" && "bg-blue-950/50 text-blue-400",
                                log.type === "log" && "bg-zinc-900 text-zinc-300"
                              )}
                            >
                              {log.type === "error" && <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />}
                              {log.type === "warn" && <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />}
                              {log.type === "info" && <Info className="h-3 w-3 mt-0.5 shrink-0" />}
                              {log.type === "log" && <span className="text-zinc-500 shrink-0">&gt;</span>}
                              <span className="break-all">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-zinc-600 text-xs">
                        No console output yet. Use console.log() in your code.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

      {/* Version Save Dialog */}
      <Dialog open={isVersionSaveDialogOpen} onOpenChange={setIsVersionSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Changes to Version {component?.versions[0]?.version}</DialogTitle>
            <DialogDescription>
              You are modifying the latest version (v{component?.versions[0]?.version}). How would you like to save your changes?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleVersionSaveChoice(false)}
              disabled={saveMutation.isPending}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">Create New Version</span>
                <span className="text-xs text-muted-foreground">
                  Save as v{(component?.versions[0]?.version ?? 0) + 1}. The current version will remain unchanged.
                </span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleVersionSaveChoice(true)}
              disabled={saveMutation.isPending}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">Replace Current Version</span>
                <span className="text-xs text-muted-foreground">
                  Update v{component?.versions[0]?.version} with your changes. The old version will be removed.
                </span>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsVersionSaveDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
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
