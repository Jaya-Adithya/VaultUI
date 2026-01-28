"use client";

import { useState, useCallback, useEffect } from "react";
import { FolderOpen, ChevronDown, ChevronUp, Plus, Filter, Sparkles, Sun, Moon, Grid3x3, Palette, Scissors, X } from "lucide-react";
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
import { useRouter, usePathname } from "next/navigation";

interface SidebarProps {
  selectedCollection: string | null;
  onCollectionSelect: (collectionId: string | null) => void;
  frameworkFilter: string | null;
  onFrameworkFilterChange: (framework: string | null) => void;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  onPlaygroundClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
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

interface Component {
  id: string;
  title: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  versions?: unknown[];
  collections?: unknown[];
}

// Helper function to determine if component is "Updated"
function getComponentBadge(component: Component): "updated" | null {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAt = new Date(component.createdAt);
  const updatedAt = new Date(component.updatedAt);
  
  // If updated within last 7 days (and not just created), it's "Updated"
  // Allow small time difference (1 second) to account for timing differences
  const timeDiff = Math.abs(updatedAt.getTime() - createdAt.getTime());
  if (updatedAt >= sevenDaysAgo && timeDiff > 1000) {
    return "updated";
  }

  return null;
}

// Component list item for displaying components in the tree
function ComponentListItem({
  component,
  isActive,
  isCollapsed,
}: {
  component: Component;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const router = useRouter();
  const badge = getComponentBadge(component);

  if (isCollapsed) return null;

  return (
    <div className="relative flex items-center group pl-4">
      {/* Vertical line indicator for active component */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[2px] bg-primary transition-all duration-200 rounded-full",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-30"
        )}
      />
      
      <button
        onClick={() => router.push(`/component/${component.id}`)}
        className={cn(
          "flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md transition-all duration-150 text-left w-full min-w-0",
          isActive
            ? "text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="truncate min-w-0 flex-1">{component.title}</span>
        {badge && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium rounded-full border bg-muted/80 text-muted-foreground border-border/60"
          >
            Updated
          </Badge>
        )}
      </button>
    </div>
  );
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
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const hasChildren = collection.children && collection.children.length > 0;
  const hasComponents = collection._count.components > 0;
  
  // Fetch components when expanded
  const { data: components } = trpc.component.list.useQuery(
    { collectionId: collection.id },
    { enabled: isExpanded && !isCollapsed && hasComponents }
  );

  // Get active component ID from pathname
  const activeComponentId = pathname && pathname.startsWith("/component/")
    ? pathname.split("/component/")[1]?.split("/")[0] ?? null
    : null;

  return (
    <div>
      <div className="flex items-center gap-1">
        {(hasChildren || hasComponents) && !isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-all duration-150 flex-shrink-0"
            aria-label={isExpanded ? "Collapse collection" : "Expand collection"}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                !isExpanded && "-rotate-90"
              )}
            />
          </button>
        )}
        {!hasChildren && !hasComponents && !isCollapsed && <div className="w-4" />}
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-start h-8 rounded-md transition-all",
            isCollapsed && "justify-center",
            level > 0 && !isCollapsed && "pl-4",
            selectedCollection === collection.id && "font-medium",
            selectedCollection === collection.id 
              ? "bg-background/50 backdrop-blur-sm border border-border/50" 
              : "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
          )}
          onClick={() => onCollectionSelect(collection.id)}
        >
          {isCollapsed ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <>
              <span className="truncate">{collection.name}</span>
              {collection._count.components > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-auto h-5 min-w-[20px] px-1.5 text-xs font-normal"
                >
                  {collection._count.components}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>
      {isExpanded && !isCollapsed && (
        <div className={cn("mt-1", level > 0 ? "ml-4" : "ml-4")}>
          {/* Render nested collections */}
          {hasChildren && (
            <div className="space-y-1 mb-1">
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
          
          {/* Render components */}
          {hasComponents && components && components.length > 0 && (
            <div className="space-y-0.5 py-1">
              {components.map((component) => (
                <ComponentListItem
                  key={component.id}
                  component={component as Component}
                  isActive={activeComponentId === component.id}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          )}
          {hasComponents && components && components.length === 0 && (
            <div className="px-2 py-1 text-xs text-muted-foreground/60">
              No components
            </div>
          )}
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
  isOpen = true,
  onClose,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: collections, isLoading } = trpc.collection.list.useQuery();
  const { data: allComponents } = trpc.component.list.useQuery({});
  
  // Get active tool ID from pathname
  const activeToolId = pathname && pathname.startsWith("/tools/")
    ? pathname.split("/tools/")[1] ?? null
    : null;

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

  // Set CSS variable on document root for main content margin
  useEffect(() => {
    const width = isCollapsed ? '4rem' : '16rem';
    document.documentElement.style.setProperty('--sidebar-width', width);
  }, [isCollapsed]);

  return (
    <>
      <aside
        className={cn(
          "fixed top-14 left-0 border-r border-border/40 bg-muted/30 backdrop-blur-xl transition-all duration-300 flex flex-col h-[calc(100vh-3.5rem)] shrink-0 overflow-hidden z-50",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
      {/* Scrollable content area */}
      <ScrollArea className="flex-1 min-h-0">
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
                variant="ghost"
                className={cn(
                  "w-full justify-start h-8 rounded-md transition-all",
                  isCollapsed && "justify-center",
                  selectedCollection === null && "font-medium",
                  selectedCollection === null 
                    ? "bg-background/50 backdrop-blur-sm border border-border/50" 
                    : "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
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
      <div className="border-t border-border/40 bg-muted/50 shrink-0 mt-auto">
        {/* Tools Section Toggle */}
        <div className="p-4 border-b border-border/40">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between h-8 rounded-md transition-all",
              isCollapsed && "justify-center",
              "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
            )}
            onClick={() => setIsToolsExpanded(!isToolsExpanded)}
          >
            {!isCollapsed && (
              <span className="text-xs font-medium text-muted-foreground">
                Tools
              </span>
            )}
            <ChevronUp
              className={cn(
                "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                !isToolsExpanded && "rotate-180",
                isCollapsed && "mx-auto"
              )}
            />
          </Button>
        </div>

        {/* Tools Section - Animated */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isToolsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="p-4 pt-0 space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-8 rounded-md transition-all gap-2",
                isCollapsed && "justify-center",
                activeToolId === "css-grid-generator" && "font-medium",
                activeToolId === "css-grid-generator"
                  ? "bg-background/50 backdrop-blur-sm border border-border/50"
                  : "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
              )}
              onClick={() => router.push("/tools/css-grid-generator")}
            >
              <Grid3x3 className="h-4 w-4" />
              {!isCollapsed && <span>CSS Grid Generator</span>}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-8 rounded-md transition-all gap-2",
                isCollapsed && "justify-center",
                activeToolId === "gradient-generator" && "font-medium",
                activeToolId === "gradient-generator"
                  ? "bg-background/50 backdrop-blur-sm border border-border/50"
                  : "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
              )}
              onClick={() => router.push("/tools/gradient-generator")}
            >
              <Palette className="h-4 w-4" />
              {!isCollapsed && <span>Gradient Generator</span>}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-8 rounded-md transition-all gap-2",
                isCollapsed && "justify-center",
                activeToolId === "image-clipper" && "font-medium",
                activeToolId === "image-clipper"
                  ? "bg-background/50 backdrop-blur-sm border border-border/50"
                  : "hover:bg-background/40 hover:backdrop-blur-sm hover:border hover:border-border/40"
              )}
              onClick={() => router.push("/tools/image-clipper")}
            >
              <Scissors className="h-4 w-4" />
              {!isCollapsed && <span>Image Clipper</span>}
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
    </>
  );
}
