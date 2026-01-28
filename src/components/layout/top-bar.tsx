"use client";

import { useState } from "react";
import { Search, Plus, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface TopBarProps {
  onSearch: (query: string) => void;
  onAddComponent: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onMenuClick?: () => void;
}

export function TopBar({
  onSearch,
  onAddComponent,
  viewMode,
  onViewModeChange,
  onMenuClick,
}: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-14 items-center gap-3 px-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">V</span>
          </div>
          <span className="font-semibold text-lg">Vault</span>
        </div>

        {/* Search Section */}
        <div className="flex flex-1 items-center justify-center px-4 min-w-0">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search components..."
              className="pl-9 h-9 bg-muted/50 border-border/50 focus-visible:ring-2 w-full text-sm"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onAddComponent} 
                  size="sm" 
                  className="h-9 px-3"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Add Component</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add new component (Ctrl+N)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 rounded-none border-0"
                    onClick={() => onViewModeChange("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="h-4 w-px bg-border/50" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 rounded-none border-0"
                    onClick={() => onViewModeChange("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List view</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </header>
  );
}
