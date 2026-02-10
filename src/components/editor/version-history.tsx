"use client";

import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Version {
  id: string;
  version: number;
  createdAt: Date;
}

interface VersionHistoryProps {
  versions: Version[];
  currentVersionId: string;
  onVersionChange: (versionId: string) => void;
  componentId: string;
}

export function VersionHistory({
  versions,
  currentVersionId,
  onVersionChange,
  componentId,
}: VersionHistoryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.version.delete.useMutation({
    onSuccess: async (data, deletedVersionId) => {
      console.log("[Version Delete UI] onSuccess callback triggered");
      console.log("[Version Delete UI] Response data:", data);
      console.log("[Version Delete UI] Deleted version ID (from mutation):", deletedVersionId);
      console.log("[Version Delete UI] versionToDelete state:", versionToDelete);
      
      // Capture the deleted version ID before resetting state
      const deletedId = versionToDelete;
      console.log("[Version Delete UI] Captured deletedId:", deletedId);
      console.log("[Version Delete UI] Current version ID:", currentVersionId);
      
      console.log("[Version Delete UI] Invalidating component cache for componentId:", componentId);
      // Invalidate queries to refresh the component data (this will get renumbered versions)
      await utils.component.getById.invalidate(componentId);
      
      console.log("[Version Delete UI] Fetching updated component...");
      // Refetch the component to get updated versions with new numbers
      const updatedComponent = await utils.component.getById.fetch(componentId);
      
      console.log("[Version Delete UI] Updated component received:", updatedComponent);
      console.log("[Version Delete UI] Updated versions:", updatedComponent?.versions);
      console.log("[Version Delete UI] Updated versions count:", updatedComponent?.versions.length);

      // Close dialog and reset state
      console.log("[Version Delete UI] Closing dialog and resetting state");
      setDeleteDialogOpen(false);
      setVersionToDelete(null);

      // If we deleted the current version, switch to the latest (which will now be renumbered)
      if (deletedId === currentVersionId && updatedComponent && updatedComponent.versions.length > 0) {
        // Versions are ordered by version desc, so first one is latest
        console.log("[Version Delete UI] Deleted version was current version, switching to latest:", updatedComponent.versions[0]!.id);
        onVersionChange(updatedComponent.versions[0]!.id);
      } else if (updatedComponent && updatedComponent.versions.length > 0) {
        // If we didn't delete the current version, make sure we're still on a valid version
        const stillExists = updatedComponent.versions.find(v => v.id === currentVersionId);
        console.log("[Version Delete UI] Checking if current version still exists:", stillExists);
        if (!stillExists && updatedComponent.versions.length > 0) {
          // Current version was deleted, switch to latest
          console.log("[Version Delete UI] Current version was deleted, switching to latest");
          onVersionChange(updatedComponent.versions[0]!.id);
        }
      } else {
        console.log("[Version Delete UI] No version switching needed");
      }
      
      console.log("[Version Delete UI] onSuccess callback completed");
    },
    onError: (error) => {
      console.error("[Version Delete UI] onError callback triggered");
      console.error("[Version Delete UI] Error object:", error);
      console.error("[Version Delete UI] Error message:", error.message);
      console.error("[Version Delete UI] Error data:", error.data);
      console.error("[Version Delete UI] Error shape:", error.shape);
      console.error("[Version Delete UI] Full error:", JSON.stringify(error, null, 2));
      alert(`Failed to delete version: ${error.message || "Unknown error"}`);
    },
  });

  const currentVersion = versions.find((v) => v.id === currentVersionId);
  const isLatest = currentVersion?.version === versions[0]?.version;
  const canDelete = versions.length > 1; // Can't delete if it's the only version

  const handleDeleteClick = (e: React.MouseEvent | React.PointerEvent | MouseEvent, versionId: string) => {
    console.log("[Version Delete UI] ========== handleDeleteClick CALLED ==========");
    console.log("[Version Delete UI] versionId:", versionId);
    console.log("[Version Delete UI] Event type:", e.type);
    console.log("[Version Delete UI] Event target:", e.target);
    
    if ('stopPropagation' in e) {
      e.stopPropagation();
    }
    if ('preventDefault' in e) {
      e.preventDefault();
    }
    
    console.log("[Version Delete UI] Setting versionToDelete to:", versionId);
    setVersionToDelete(versionId);
    
    console.log("[Version Delete UI] Opening delete dialog");
    setDeleteDialogOpen(true);
    
    console.log("[Version Delete UI] ========== handleDeleteClick COMPLETED ==========");
  };

  const handleDeleteConfirm = () => {
    console.log("[Version Delete UI] handleDeleteConfirm called");
    console.log("[Version Delete UI] versionToDelete state:", versionToDelete);
    
    if (!versionToDelete) {
      console.error("[Version Delete UI] No version to delete!");
      return;
    }
    
    console.log("[Version Delete UI] Calling deleteMutation.mutate with:", versionToDelete);
    console.log("[Version Delete UI] deleteMutation state:", {
      isPending: deleteMutation.isPending,
      isError: deleteMutation.isError,
      isSuccess: deleteMutation.isSuccess,
    });
    
    deleteMutation.mutate(versionToDelete, {
      onError: (error) => {
        console.error("[Version Delete UI] Delete mutation error:", error);
        console.error("[Version Delete UI] Error details:", {
          message: error.message,
          data: error.data,
          shape: error.shape,
        });
        alert(`Failed to delete version: ${error.message || "Unknown error"}`);
      },
      onSuccess: (data, variables) => {
        console.log("[Version Delete UI] Delete mutation onSuccess callback (inline):", { data, variables });
      },
    });
    
    console.log("[Version Delete UI] Mutation call completed");
  };

  const versionToDeleteData = versionToDelete
    ? versions.find(v => v.id === versionToDelete)
    : null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={currentVersionId} onValueChange={onVersionChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select version" />
          </SelectTrigger>
          <SelectContent className="w-[220px]">
            {versions.map((version, index) => (
              <SelectItem 
                key={version.id} 
                value={version.id} 
                className="py-2 px-2 cursor-pointer group"
                onSelect={(e) => {
                  console.log("[Version Delete UI] SelectItem onSelect triggered for version:", version.id);
                  console.log("[Version Delete UI] Event target:", e.target);
                  // Prevent selection when clicking delete button
                  const target = e.target as HTMLElement;
                  const isDeleteButton = target.closest('button[title="Delete version"]') || 
                                        target.closest('button')?.querySelector('svg');
                  if (isDeleteButton) {
                    console.log("[Version Delete UI] Preventing SelectItem selection (delete button clicked)");
                    e.preventDefault();
                    return;
                  }
                }}
                onPointerDown={(e) => {
                  // Prevent SelectItem from handling pointer events on delete button
                  const target = e.target as HTMLElement;
                  if (target.closest('button[title="Delete version"]')) {
                    console.log("[Version Delete UI] SelectItem onPointerDown - delete button detected, stopping propagation");
                    e.stopPropagation();
                  }
                }}
              >
                <div className="flex items-center w-full gap-2">
                  <span className="font-semibold text-sm shrink-0">v{version.version}</span>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-[10px] shrink-0 px-1 py-0 leading-none h-4">
                      Latest
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground truncate opacity-70">
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-6 w-6 p-0 shrink-0 ml-auto hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => {
                        console.log("[Version Delete UI] Delete button onMouseDown triggered for version:", version.id);
                        e.stopPropagation();
                        e.preventDefault();
                        // Directly set state to avoid event propagation issues
                        console.log("[Version Delete UI] Setting versionToDelete directly to:", version.id);
                        setVersionToDelete(version.id);
                        console.log("[Version Delete UI] Opening delete dialog directly");
                        setDeleteDialogOpen(true);
                      }}
                      onClick={(e) => {
                        console.log("[Version Delete UI] Delete button onClick triggered for version:", version.id);
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteClick(e, version.id);
                      }}
                      title="Delete version"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLatest && (
          <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/20">
            Viewing old version
          </Badge>
        )}
      </div>

      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          console.log("[Version Delete UI] AlertDialog onOpenChange:", open);
          setDeleteDialogOpen(open);
          if (!open) {
            console.log("[Version Delete UI] Dialog closed, resetting versionToDelete");
            setVersionToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete version {versionToDeleteData?.version}? This action cannot be undone.
              {versionToDelete === currentVersionId && (
                <span className="block mt-2 text-yellow-500">
                  You are currently viewing this version. You will be switched to the latest version after deletion.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                console.log("[Version Delete UI] Cancel button clicked");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log("[Version Delete UI] Delete button in dialog clicked");
                handleDeleteConfirm();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
