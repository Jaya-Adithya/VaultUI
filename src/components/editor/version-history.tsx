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
    onSuccess: async () => {
      // Invalidate queries to refresh the component data (this will get renumbered versions)
      await utils.component.getById.invalidate(componentId);
      setDeleteDialogOpen(false);
      setVersionToDelete(null);

      // Refetch the component to get updated versions with new numbers
      const updatedComponent = await utils.component.getById.fetch(componentId);

      // If we deleted the current version, switch to the latest (which will now be renumbered)
      if (versionToDelete === currentVersionId && updatedComponent && updatedComponent.versions.length > 0) {
        // Versions are ordered by version desc, so first one is latest
        onVersionChange(updatedComponent.versions[0]!.id);
      } else if (updatedComponent && updatedComponent.versions.length > 0) {
        // If we didn't delete the current version, make sure we're still on a valid version
        const stillExists = updatedComponent.versions.find(v => v.id === currentVersionId);
        if (!stillExists && updatedComponent.versions.length > 0) {
          // Current version was deleted, switch to latest
          onVersionChange(updatedComponent.versions[0]!.id);
        }
      }
    },
  });

  const currentVersion = versions.find((v) => v.id === currentVersionId);
  const isLatest = currentVersion?.version === versions[0]?.version;
  const canDelete = versions.length > 1; // Can't delete if it's the only version

  const handleDeleteClick = (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    setVersionToDelete(versionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (versionToDelete) {
      deleteMutation.mutate(versionToDelete);
    }
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
              <SelectItem key={version.id} value={version.id} className="py-2 px-2 cursor-pointer group">
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
                      className="h-6 w-6 p-0 shrink-0 ml-auto hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteClick(e, version.id)}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
