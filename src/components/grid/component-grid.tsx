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
  versions: {
    files: FileData[];
  }[];
}

interface ComponentGridProps {
  components: Component[];
  viewMode: "grid" | "list";
  isLoading?: boolean;
}

export function ComponentGrid({
  components,
  viewMode,
  isLoading,
}: ComponentGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "flex flex-col gap-2"
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted/50 rounded-lg animate-pulse"
            style={{ aspectRatio: viewMode === "grid" ? "16/12" : "auto" }}
          >
            {viewMode === "grid" ? (
              <div className="w-full aspect-video bg-muted/30 rounded-t-lg" />
            ) : null}
            <div className="p-3 space-y-2">
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
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "flex flex-col gap-2"
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
          />
        ))}
      </div>
    </HoverPreviewProvider>
  );
}
