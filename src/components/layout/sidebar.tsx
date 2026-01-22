"use client";

import { useState, useCallback } from "react";
import { FolderOpen, ChevronDown, Plus, Filter, Sparkles, Sun, Moon, Grid3x3 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateCollectionDialog } from "@/components/collections/create-collection-dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

interface SidebarProps {
  selectedCollection: string | null;
  onCollectionSelect: (collectionId: string | null) => void;
  frameworkFilter: string | null;
  onFrameworkFilterChange: (framework: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  onPlaygroundClick?: () => void;
}

const frameworks = [
  { value: "all", label: "All Frameworks" },
  { value: "react", label: "React" },
  { value: "next", label: "Next.js" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "js", label: "JavaScript" },
  { value: "other", label: "Other" },
];

const statuses = [
  { value: "all", label: "All Statuses" },
  { value: "experiment", label: "Experiment" },
  { value: "ready", label: "Ready" },
];

interface CollectionWithChildren {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count: { components: number };
  children?: CollectionWithChildren[];
}

function CollectionTreeItem({
  collection,
  selectedCollection,
  onCollectionSelect,
  isCollapsed,
  level = 0,
}: {
  collection: CollectionWithChildren;
  selectedCollection: string | null;
  onCollectionSelect: (collectionId: string | null) => void;
  isCollapsed: boolean;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = collection.children && collection.children.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1">
        {hasChildren && !isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                !isExpanded && "-rotate-90"
              )}
            />
          </button>
        )}
        {!hasChildren && !isCollapsed && <div className="w-4" />}
        <Button
          variant={selectedCollection === collection.id ? "secondary" : "ghost"}
          className={cn(
            "flex-1 justify-start",
            isCollapsed && "justify-center",
            level > 0 && !isCollapsed && "pl-4"
          )}
          onClick={() => onCollectionSelect(collection.id)}
        >
          {isCollapsed ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <>
              <span className="truncate">{collection.name}</span>
              <Badge variant="secondary" className="ml-auto">
                {collection._count.components}
              </Badge>
            </>
          )}
        </Button>
      </div>
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="ml-4 space-y-1 mt-1">
          {collection.children!.map((child) => (
            <CollectionTreeItem
              key={child.id}
              collection={child}
              selectedCollection={selectedCollection}
              onCollectionSelect={onCollectionSelect}
              isCollapsed={isCollapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  selectedCollection,
  onCollectionSelect,
  frameworkFilter,
  onFrameworkFilterChange,
  statusFilter,
  onStatusFilterChange,
  onPlaygroundClick,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();
  const { data: collections, isLoading } = trpc.collection.list.useQuery();
  const { data: allComponents } = trpc.component.list.useQuery({});

  // Generate next unique "Untitled" name
  const getNextUntitledName = useCallback(() => {
    if (!allComponents) return "Untitled 1";

    // Find all existing "Untitled" or "Untitled X" titles
    const untitledPattern = /^Untitled(?: (\d+))?$/;
    const existingNumbers = allComponents
      .map((c) => {
        const match = c.title.match(untitledPattern);
        if (match) {
          // "Untitled" without number = 0, "Untitled 5" = 5
          return match[1] ? parseInt(match[1], 10) : 0;
        }
        return null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a); // Sort descending

    // Find the next available number
    let nextNumber = 1;
    if (existingNumbers.length > 0) {
      // Find the first gap, or use max + 1
      const maxNumber = existingNumbers[0];
      for (let i = 1; i <= maxNumber + 1; i++) {
        if (!existingNumbers.includes(i)) {
          nextNumber = i;
          break;
        }
      }
    }

    return nextNumber === 1 ? "Untitled 1" : `Untitled ${nextNumber}`;
  }, [allComponents]);

  const createScratchpadMutation = trpc.component.create.useMutation({
    onSuccess: (component) => {
      // Navigate directly to the new scratchpad component
      router.push(`/component/${component.id}`);
    },
  });

  // Build tree structure from flat collections array
  const buildTree = (collections: CollectionWithChildren[]): CollectionWithChildren[] => {
    const map = new Map<string, CollectionWithChildren>();
    const roots: CollectionWithChildren[] = [];

    // First pass: create map of all collections
    collections.forEach((col) => {
      map.set(col.id, { ...col, children: [] });
    });

    // Second pass: build tree
    collections.forEach((col) => {
      const node = map.get(col.id)!;
      if (col.parentId) {
        const parent = map.get(col.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const collectionTree = collections ? buildTree(collections as CollectionWithChildren[]) : [];

  return (
    <aside
      className={cn(
        "border-r border-border/40 bg-muted/30 transition-all duration-300 flex flex-col h-[calc(100vh-3.5rem)]",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Scrollable content area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Filters Section */}
          {!isCollapsed && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>
                <Select
                  value={frameworkFilter ?? "all"}
                  onValueChange={(v) =>
                    onFrameworkFilterChange(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Framework" />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter ?? "all"}
                  onValueChange={(v) =>
                    onStatusFilterChange(v === "all" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />
            </>
          )}

          {/* Collections Section */}
          <div className="space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  Collections
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <Button
                variant={selectedCollection === null ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isCollapsed && "justify-center"
                )}
                onClick={() => onCollectionSelect(null)}
              >
                {isCollapsed ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <>
                    <span>All Components</span>
                  </>
                )}
              </Button>

              {isLoading ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                collectionTree.map((collection) => (
                  <CollectionTreeItem
                    key={collection.id}
                    collection={collection}
                    selectedCollection={selectedCollection}
                    onCollectionSelect={onCollectionSelect}
                    isCollapsed={isCollapsed}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Fixed bottom section for Tools and Playground */}
      <div className="border-t border-border/40 bg-muted/50 shrink-0">
        {/* Tools Section */}
        <div className="p-4 border-b border-border/40">
          <div className="space-y-2">
            {!isCollapsed && (
              <div className="text-xs font-medium text-muted-foreground px-2">
                Tools
              </div>
            )}
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-2 cursor-pointer",
                isCollapsed ? "px-0 justify-center" : "justify-start"
              )}
              onClick={() => router.push("/tools/css-grid-generator")}
            >
              <Grid3x3 className="h-4 w-4" />
              {!isCollapsed && <span>CSS Grid Generator</span>}
            </Button>
          </div>
        </div>

        {/* Scratchpad Section */}
        <div className="p-4">
          <Button
            variant="default"
            className={cn(
              "w-full gap-2",
              isCollapsed ? "px-0 justify-center" : "justify-start"
            )}
            onClick={() => {
              // Create a scratchpad component with default empty file
              // This directly opens the playground without showing the modal
              const untitledName = getNextUntitledName();
              createScratchpadMutation.mutate({
                title: untitledName,
                framework: "react",
                language: "tsx",
                isRenderable: true,
                files: [
                  {
                    filename: "App.tsx",
                    language: "tsx",
                    code: "",
                    order: 0,
                  },
                ],
              });
            }}
            disabled={createScratchpadMutation.isPending}
          >
            <Sparkles className="h-4 w-4" />
            {!isCollapsed && <span>Scratchpad</span>}
          </Button>
        </div>
      </div>

      <CreateCollectionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        collections={collections?.map((c) => ({ id: c.id, name: c.name })) ?? []}
      />
    </aside>
  );
}
