"use client";

import { HoverableCard } from "./hoverable-card";
import { HoverPreviewProvider } from "@/components/preview/hover-preview-manager";
import { cn } from "@/lib/utils";

interface FileData {
  filename: string;
  language: string;
  code: string;
}

interface Component {
  id: string;
  title: string;
  framework: string;
  updatedAt: Date;
  status: string;
  coverImage?: string | null;
  versions: {
    files: FileData[];
  }[];
}

interface ComponentGridProps {
  components: Component[];
  viewMode: "grid" | "list";
  isLoading?: boolean;
  selectedCollection?: string | null;
}

export function ComponentGrid({
  components,
  viewMode,
  isLoading,
  selectedCollection,
}: ComponentGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-4 gap-6"
            : "flex flex-col gap-3"
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted/50 rounded-lg animate-pulse"
            style={{ aspectRatio: viewMode === "grid" ? "3/2.8" : "auto" }}
          >
            {viewMode === "grid" ? (
              <div className="w-full aspect-[3/2] bg-muted/30 rounded-t-lg" />
            ) : null}
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted/30 rounded w-3/4" />
              <div className="h-3 bg-muted/30 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-3xl">📦</span>
        </div>
        <h3 className="text-lg font-medium mb-1">No components yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add your first component to get started. Components are automatically
          versioned and can be previewed live.
        </p>
      </div>
    );
  }

  return (
    <HoverPreviewProvider>
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-4 gap-6"
            : "flex flex-col gap-3"
        )}
      >
        {components.map((component) => (
          <HoverableCard
            key={component.id}
            id={component.id}
            title={component.title}
            framework={component.framework}
            updatedAt={component.updatedAt}
            files={component.versions[0]?.files ?? []}
            status={component.status}
            coverImage={component.coverImage}
            selectedCollection={selectedCollection}
          />
        ))}
      </div>
    </HoverPreviewProvider>
  );
}
