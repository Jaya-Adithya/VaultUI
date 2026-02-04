"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { ComponentGrid } from "@/components/grid/component-grid";
import { AddComponentForm } from "@/components/editor/add-component-form";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/lib/use-debounce";
import { useGlobalShortcuts } from "@/lib/use-keyboard-shortcuts";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [frameworkFilter, setFrameworkFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Load collections to find "Animations" as default
  const { data: collections } = trpc.collection.list.useQuery();
  const hasSetDefault = useRef(false);
  
  // Set "Animations" as default collection on initial load (only once)
  useEffect(() => {
    if (collections && !hasSetDefault.current && selectedCollection === null) {
      const animationsCollection = collections.find(
        (c) => c.name.toLowerCase() === "animations"
      );
      if (animationsCollection) {
        setSelectedCollection(animationsCollection.id);
        hasSetDefault.current = true;
      }
    }
  }, [collections, selectedCollection]);

  const { data: components, isLoading } = trpc.component.list.useQuery({
    search: debouncedSearch || undefined,
    framework: frameworkFilter || undefined,
    status: statusFilter || undefined,
    collectionId: selectedCollection || undefined,
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onSearch: () => {
      // Focus search input - will be connected via TopBar
      const searchInput = document.querySelector(
        'input[type="search"]'
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    onAddComponent: () => setIsAddModalOpen(true),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        onSearch={handleSearch}
        onAddComponent={() => setIsAddModalOpen(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1 relative">
        <Sidebar
          selectedCollection={selectedCollection}
          onCollectionSelect={setSelectedCollection}
          frameworkFilter={frameworkFilter}
          onFrameworkFilterChange={setFrameworkFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main 
          className="flex-1 p-6 overflow-auto transition-all duration-300"
          style={{
            marginLeft: 'var(--sidebar-width, 0)',
          }}
        >
          <ComponentGrid
            components={components ?? []}
            viewMode={viewMode}
            isLoading={isLoading}
            selectedCollection={selectedCollection}
          />
        </main>
      </div>

      <AddComponentForm
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
