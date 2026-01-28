"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Copy,
  Edit,
  Trash2,
  FolderPlus,
  FileEdit,
  Image as ImageIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StaticThumbnail } from "@/components/preview/static-thumbnail";
import { HoverPreview } from "@/components/preview/hover-preview";
import { useHoverPreview } from "@/components/preview/hover-preview-manager";
import {
  getFrameworkLabel,
  getFrameworkColor,
  isRenderable,
  type Framework,
} from "@/lib/detect-framework";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface FileData {
  filename: string;
  language: string;
  code: string;
}

interface HoverableCardProps {
  id: string;
  title: string;
  framework: string;
  updatedAt: Date;
  files: FileData[];
  status: string;
  coverImage?: string | null;
}

const HOVER_DELAY = 200; // ms

export function HoverableCard({
  id,
  title,
  framework,
  updatedAt,
  files,
  status,
  coverImage,
}: HoverableCardProps) {
  const router = useRouter();
  const { setActivePreview, isPreviewActive } = useHoverPreview();
  const [isHovering, setIsHovering] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [renameInput, setRenameInput] = useState(title);
  const [coverImageInput, setCoverImageInput] = useState(coverImage || "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const frameworkType = framework as Framework;
  const canRender = isRenderable(frameworkType);
  const isActive = isPreviewActive(id);

  const utils = trpc.useUtils();
  const { data: collections = [] } = trpc.collection.list.useQuery();
  const { data: component } = trpc.component.getById.useQuery(id, {
    enabled: isMenuOpen, // Only fetch when menu is open (for duplication and collection check)
  });

  const deleteMutation = trpc.component.softDelete.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
      setIsDeleteDialogOpen(false);
    },
  });

  const duplicateMutation = trpc.component.create.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
    },
  });

  const addToCollectionMutation = trpc.collection.addComponent.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
      utils.collection.list.invalidate();
    },
  });

  const renameMutation = trpc.component.update.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
      setIsRenameDialogOpen(false);
    },
  });

  const updateCoverMutation = trpc.component.update.useMutation({
    onSuccess: () => {
      utils.component.list.invalidate();
      setIsCoverDialogOpen(false);
    },
  });

  const handleDuplicate = useCallback(() => {
    if (!component) return;

    const latestVersion = component.versions[0];
    if (!latestVersion) return;

    duplicateMutation.mutate({
      title: `${component.title} (Copy)`,
      description: component.description || undefined,
      framework: component.framework,
      language: component.language,
      isRenderable: component.isRenderable,
      files: latestVersion.files.map((file) => ({
        filename: file.filename,
        language: file.language,
        code: file.code,
        order: file.order,
      })),
      collectionIds: component.collections.map((c) => c.collectionId),
    });
  }, [component, duplicateMutation]);

  const handleAddToCollection = useCallback(
    (collectionId: string) => {
      addToCollectionMutation.mutate({
        componentId: id,
        collectionId,
      });
    },
    [id, addToCollectionMutation]
  );

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(id);
  }, [id, deleteMutation]);

  const handleModify = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/component/${id}`);
    },
    [id, router]
  );

  const handleRename = useCallback(() => {
    if (!renameInput.trim()) return;
    renameMutation.mutate({
      id,
      title: renameInput.trim(),
    });
  }, [id, renameInput, renameMutation]);

  const handleUpdateCover = useCallback(() => {
    updateCoverMutation.mutate({
      id,
      coverImage: coverImageInput.trim() || null,
    });
  }, [id, coverImageInput, updateCoverMutation]);

  // Update rename input when dialog opens
  useEffect(() => {
    if (isRenameDialogOpen) {
      setRenameInput(title);
    }
  }, [isRenameDialogOpen, title]);

  useEffect(() => {
    if (isCoverDialogOpen) {
      setCoverImageInput(coverImage || "");
    }
  }, [isCoverDialogOpen, coverImage]);

  const availableCollections = collections.filter(
    (collection) =>
      !component?.collections.some((c) => c.collectionId === collection.id)
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);

    if (!canRender) return;

    // Debounce hover activation
    hoverTimeoutRef.current = setTimeout(() => {
      setActivePreview(id);
    }, HOVER_DELAY);
  }, [id, canRender, setActivePreview]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);

    // Clear any pending hover activation
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Deactivate preview
    if (isActive) {
      setActivePreview(null);
    }
  }, [isActive, setActivePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // IntersectionObserver to pause preview when off-screen
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && isActive) {
            setActivePreview(null);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [isActive, setActivePreview]);

  return (
    <>
      <div className="relative group">
        <Link href={`/component/${id}`} className="block">
          <Card
            ref={cardRef}
            className={cn(
              "overflow-hidden transition-all duration-200 cursor-pointer",
              isHovering && "border-primary/50 shadow-lg shadow-primary/5"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative aspect-[3/2] bg-muted/50 rounded-t-lg overflow-hidden">
              <StaticThumbnail files={files} framework={frameworkType} coverImage={coverImage} />

              {canRender && (
                <HoverPreview
                  files={files}
                  framework={frameworkType}
                  isActive={isActive}
                />
              )}

              {/* Three-dots menu button - positioned absolutely */}
              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      ref={menuButtonRef}
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label="Component options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderPlus className="h-4 w-4" />
                        <span>Add to Collection</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {availableCollections.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No available collections
                          </div>
                        ) : (
                          availableCollections.map((collection) => {
                            const isAdding =
                              addToCollectionMutation.isPending &&
                              addToCollectionMutation.variables?.collectionId ===
                              collection.id;
                            return (
                              <DropdownMenuItem
                                key={collection.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAddToCollection(collection.id);
                                }}
                                disabled={isAdding}
                              >
                                {isAdding ? (
                                  <>
                                    <span className="h-4 w-4 animate-spin">⟳</span>
                                    <span>Adding...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="h-4 w-4" />
                                    <span>{collection.name}</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (component) {
                          handleDuplicate();
                        }
                      }}
                      disabled={duplicateMutation.isPending || !component}
                    >
                      {duplicateMutation.isPending ? (
                        <>
                          <span className="h-4 w-4 animate-spin">⟳</span>
                          <span>Duplicating...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Duplicate</span>
                        </>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleModify}
                      disabled={false}
                    >
                      <Edit className="h-4 w-4" />
                      <span>Modify</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsRenameDialogOpen(true);
                      }}
                      disabled={false}
                    >
                      <FileEdit className="h-4 w-4" />
                      <span>Rename</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCoverDialogOpen(true);
                      }}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>{coverImage ? "Change Cover" : "Add Cover"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {title}
                </h3>
                {status === "ready" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-500/10 text-green-500 border-green-500/20 shrink-0"
                  >
                    Ready
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getFrameworkColor(frameworkType))}
                >
                  {getFrameworkLabel(frameworkType)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action can be undone
              from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Component</DialogTitle>
            <DialogDescription>
              Enter a new name for this component.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">Name</Label>
              <Input
                id="rename-input"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameInput.trim()) {
                    handleRename();
                  }
                  if (e.key === "Escape") {
                    setIsRenameDialogOpen(false);
                  }
                }}
                placeholder="Component name"
                autoFocus
              />
            </div>
            {renameMutation.error && (
              <p className="text-sm text-destructive">
                {renameMutation.error.message || "Failed to rename component. Please try again."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renameMutation.isPending || !renameInput.trim() || renameInput.trim() === title}
            >
              {renameMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cover Image Dialog */}
      <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Cover Image</DialogTitle>
            <DialogDescription>
              Enter a URL for the cover image. Leave empty to use the auto-generated preview.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cover-input">Image URL</Label>
              <Input
                id="cover-input"
                value={coverImageInput}
                onChange={(e) => setCoverImageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateCover();
                  }
                  if (e.key === "Escape") {
                    setIsCoverDialogOpen(false);
                  }
                }}
                placeholder="https://example.com/image.png"
                autoFocus
              />
            </div>
            {updateCoverMutation.error && (
              <p className="text-sm text-destructive">
                {updateCoverMutation.error.message || "Failed to update cover image."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCoverDialogOpen(false)}
              disabled={updateCoverMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCover}
              disabled={updateCoverMutation.isPending}
            >
              {updateCoverMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
