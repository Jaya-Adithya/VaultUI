"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface GridItem {
  id: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  content: string;
}

export function CssGridGenerator() {
  const [columns, setColumns] = useState(5);
  const [rows, setRows] = useState(5);
  const [gap, setGap] = useState(4);
  const [format, setFormat] = useState<"jsx" | "html">("jsx");
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; colStart: number; rowStart: number } | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<"right" | "left" | "down" | "up" | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; colStart: number; colEnd: number; rowStart: number; rowEnd: number; mergedCells: GridItem[] } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mergedDuringResizeRef = useRef<GridItem[]>([]);
  const resizeSessionIdRef = useRef<string>("");
  const dragThreshold = 5; // Pixels before drag is considered

  // Clamp values to 1-12
  const clampValue = (value: number) => Math.max(1, Math.min(12, value));

  // Clear grid when columns/rows change
  useEffect(() => {
    setGridItems([]);
    setSelectedItemId(null);
  }, [columns, rows]);

  const handleColumnsChange = (value: string) => {
    const num = parseInt(value) || 1;
    setColumns(clampValue(num));
  };

  const handleRowsChange = (value: string) => {
    const num = parseInt(value) || 1;
    setRows(clampValue(num));
  };

  const handleGapChange = (value: string) => {
    const num = parseInt(value) || 1;
    setGap(clampValue(num));
  };

  // Get next available number (fills gaps)
  const getNextAvailableNumber = useCallback((items: GridItem[]): number => {
    const numbers = items.map(item => parseInt(item.content) || 0).filter(n => n > 0);
    if (numbers.length === 0) return 1;

    const sorted = [...new Set(numbers)].sort((a, b) => a - b);
    for (let i = 1; i <= sorted.length; i++) {
      if (!sorted.includes(i)) {
        return i;
      }
    }
    return Math.max(...sorted) + 1;
  }, []);

  // Find if a cell is occupied by any grid item
  const isCellOccupied = useCallback(
    (col: number, row: number, excludeId?: string) => {
      return gridItems.some(
        (item) =>
          item.id !== excludeId &&
          col >= item.colStart &&
          col < item.colEnd &&
          row >= item.rowStart &&
          row < item.rowEnd
      );
    },
    [gridItems]
  );

  // Check if entire area is free
  const isAreaFree = useCallback(
    (colStart: number, colEnd: number, rowStart: number, rowEnd: number, excludeId?: string) => {
      for (let col = colStart; col < colEnd; col++) {
        for (let row = rowStart; row < rowEnd; row++) {
          if (isCellOccupied(col, row, excludeId)) {
            return false;
          }
        }
      }
      return true;
    },
    [isCellOccupied]
  );

  // Handle adding item on empty cell click
  const handleAddItem = useCallback((col: number, row: number) => {
    if (isCellOccupied(col, row)) return;

    setGridItems((items) => {
      const nextNum = getNextAvailableNumber(items);
      const newItem: GridItem = {
        id: `item-${row}-${col}-${Date.now()}`,
        colStart: col,
        colEnd: col + 1,
        rowStart: row,
        rowEnd: row + 1,
        content: String(nextNum),
      };
      return [...items, newItem];
    });
  }, [isCellOccupied, getNextAvailableNumber]);

  // Delete grid item on double-click (split back into individual cells)
  const handleDoubleClick = useCallback(
    (itemId: string) => {
      const item = gridItems.find((i) => i.id === itemId);
      if (!item) return;

      setGridItems((items) => {
        const newItems: GridItem[] = items.filter(i => i.id !== itemId);
        const nextNum = getNextAvailableNumber(newItems);
        let counter = nextNum;

        // Split this item into individual cells
        for (let row = item.rowStart; row < item.rowEnd; row++) {
          for (let col = item.colStart; col < item.colEnd; col++) {
            newItems.push({
              id: `item-${row}-${col}-${Date.now()}-${counter}`,
              colStart: col,
              colEnd: col + 1,
              rowStart: row,
              rowEnd: row + 1,
              content: String(counter++),
            });
          }
        }

        return newItems;
      });

      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }
    },
    [gridItems, selectedItemId, getNextAvailableNumber]
  );

  // Reset all items
  const handleReset = () => {
    // Full reset (layout + state)
    setColumns(5);
    setRows(5);
    setGap(4);
    setFormat("jsx");
    setGridItems([]);
    setSelectedItemId(null);
    setIsCopied(false);
    setDraggedItemId(null);
    setDragStart(null);
    setResizingItemId(null);
    setResizeDirection(null);
    setResizeStart(null);
    mergedDuringResizeRef.current = [];
  };

  // Get cell position from mouse coordinates
  const getCellFromPosition = useCallback(
    (x: number, y: number): { col: number; row: number } | null => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const cellWidth = (rect.width - gap * (columns - 1) * 0.25) / columns;
      const cellHeight = (rect.height - gap * (rows - 1) * 0.25) / rows;

      const relativeX = x - rect.left;
      const relativeY = y - rect.top;

      const col = Math.floor(relativeX / (cellWidth + gap * 0.25));
      const row = Math.floor(relativeY / (cellHeight + gap * 0.25));

      if (col >= 0 && col < columns && row >= 0 && row < rows) {
        return { col: col + 1, row: row + 1 }; // CSS grid is 1-indexed
      }

      return null;
    },
    [columns, rows, gap]
  );

  // Handle drag start - for moving items (four arrows)
  const handleDragStart = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const item = gridItems.find((i) => i.id === itemId);
    if (item) {
      setDraggedItemId(itemId);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        colStart: item.colStart,
        rowStart: item.rowStart,
      });
      setSelectedItemId(itemId);
    }
  };

  // Handle drag to move items (four arrows - move entire item)
  useEffect(() => {
    if (!draggedItemId || !dragStart || !gridRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - dragStart.x);
      const deltaY = Math.abs(e.clientY - dragStart.y);

      if (deltaX < dragThreshold && deltaY < dragThreshold) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const rect = gridRef.current!.getBoundingClientRect();
        const cellWidth = (rect.width - gap * (columns - 1) * 0.25) / columns;
        const cellHeight = (rect.height - gap * (rows - 1) * 0.25) / rows;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const colDelta = Math.round(deltaX / (cellWidth + gap * 0.25));
        const rowDelta = Math.round(deltaY / (cellHeight + gap * 0.25));

        setGridItems((items) => {
          const draggedItem = items.find((i) => i.id === draggedItemId);
          if (!draggedItem) return items;

          const colSpan = draggedItem.colEnd - draggedItem.colStart;
          const rowSpan = draggedItem.rowEnd - draggedItem.rowStart;

          const newColStart = Math.max(1, Math.min(dragStart.colStart + colDelta, columns + 1 - colSpan));
          const newRowStart = Math.max(1, Math.min(dragStart.rowStart + rowDelta, rows + 1 - rowSpan));
          const newColEnd = newColStart + colSpan;
          const newRowEnd = newRowStart + rowSpan;

          if (newColEnd > columns + 1 || newRowEnd > rows + 1) {
            return items;
          }

          // During drag: just move the item visually, don't swap yet
          const updatedItem: GridItem = {
            id: draggedItem.id,
            content: draggedItem.content,
            colStart: newColStart,
            colEnd: newColEnd,
            rowStart: newRowStart,
            rowEnd: newRowEnd,
          };

          // Keep all other items as-is during drag
          const otherItems = items.filter(item => item.id !== draggedItemId);
          return [...otherItems, updatedItem];
        });
      });
    };

    const handleMouseUp = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (draggedItemId && dragStart) {
        setGridItems((items) => {
          const draggedItem = items.find((i) => i.id === draggedItemId);
          if (!draggedItem) {
            setDraggedItemId(null);
            setDragStart(null);
            return items;
          }

          const oldColStart = dragStart.colStart;
          const oldColEnd = draggedItem.colEnd - draggedItem.colStart + oldColStart;
          const oldRowStart = dragStart.rowStart;
          const oldRowEnd = draggedItem.rowEnd - draggedItem.rowStart + oldRowStart;

          // Only process if item actually moved
          if (draggedItem.colStart !== oldColStart || draggedItem.rowStart !== oldRowStart) {
            const newColStart = draggedItem.colStart;
            const newColEnd = draggedItem.colEnd;
            const newRowStart = draggedItem.rowStart;
            const newRowEnd = draggedItem.rowEnd;

            // Find items that overlap with the new position (these will swap)
            const itemsInNewPosition = items.filter((item) => {
              if (item.id === draggedItemId) return false;
              return !(
                item.colEnd <= newColStart ||
                item.colStart >= newColEnd ||
                item.rowEnd <= newRowStart ||
                item.rowStart >= newRowEnd
              );
            });

            if (itemsInNewPosition.length > 0) {
              // SWAP: Move items from new position to old position
              const swappedItems = itemsInNewPosition.map(item => {
                const colSpan = item.colEnd - item.colStart;
                const rowSpan = item.rowEnd - item.rowStart;

                // Calculate offset to move from new position to old position
                const offsetCol = oldColStart - newColStart;
                const offsetRow = oldRowStart - newRowStart;

                const newItemColStart = item.colStart + offsetCol;
                const newItemRowStart = item.rowStart + offsetRow;

                // Clamp to bounds
                const clampedColStart = Math.max(1, Math.min(newItemColStart, columns + 1 - colSpan));
                const clampedRowStart = Math.max(1, Math.min(newItemRowStart, rows + 1 - rowSpan));

                return {
                  ...item,
                  colStart: clampedColStart,
                  colEnd: clampedColStart + colSpan,
                  rowStart: clampedRowStart,
                  rowEnd: clampedRowStart + rowSpan,
                };
              });

              // Keep all other items (excluding dragged item and swapped items)
              const itemsToKeep = items.filter(item =>
                item.id !== draggedItemId &&
                !itemsInNewPosition.some(s => s.id === item.id)
              );

              return [...itemsToKeep, ...swappedItems, draggedItem];
            }
            // If no items in new position (empty), just keep the move (old position stays empty)
          }

          return items;
        });
      }

      setDraggedItemId(null);
      setDragStart(null);
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draggedItemId, dragStart, columns, rows, gap, isAreaFree, dragThreshold, getNextAvailableNumber]);

  // Handle resize start - for expanding/minimizing (two arrows)
  const handleResizeStart = (e: React.MouseEvent, itemId: string, direction: "right" | "left" | "down" | "up") => {
    e.preventDefault();
    e.stopPropagation();
    const item = gridItems.find((i) => i.id === itemId);
    if (item) {
      setResizingItemId(itemId);
      setResizeDirection(direction);
      resizeSessionIdRef.current = `rs-${Date.now().toString(36)}`;

      const mergedCells: GridItem[] = [];
      gridItems.forEach((otherItem) => {
        if (otherItem.id !== itemId) {
          if (
            otherItem.colStart >= item.colStart &&
            otherItem.colEnd <= item.colEnd &&
            otherItem.rowStart >= item.rowStart &&
            otherItem.rowEnd <= item.rowEnd
          ) {
            mergedCells.push(otherItem);
          }
        }
      });

      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        colStart: item.colStart,
        colEnd: item.colEnd,
        rowStart: item.rowStart,
        rowEnd: item.rowEnd,
        mergedCells,
      });
      // Track everything that gets merged during this resize session so we can restore on shrink.
      mergedDuringResizeRef.current = mergedCells.map((c) => ({ ...c }));
      setSelectedItemId(itemId);
    }
  };

  // Handle resize with directional expansion/contraction (two arrows)
  useEffect(() => {
    if (!resizingItemId || !resizeStart || !resizeDirection || !gridRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - resizeStart.x);
      const deltaY = Math.abs(e.clientY - resizeStart.y);

      if (deltaX < dragThreshold && deltaY < dragThreshold) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const rect = gridRef.current!.getBoundingClientRect();
        const cellWidth = (rect.width - gap * (columns - 1) * 0.25) / columns;
        const cellHeight = (rect.height - gap * (rows - 1) * 0.25) / rows;

        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const colDelta = Math.round(deltaX / (cellWidth + gap * 0.25));
        const rowDelta = Math.round(deltaY / (cellHeight + gap * 0.25));

        setGridItems((items) => {
          const resizingItem = items.find((i) => i.id === resizingItemId);
          if (!resizingItem) return items;

          let newColStart = resizeStart.colStart;
          let newColEnd = resizeStart.colEnd;
          let newRowStart = resizeStart.rowStart;
          let newRowEnd = resizeStart.rowEnd;

          if (resizeDirection === "right") {
            newColEnd = Math.max(resizeStart.colStart + 1, Math.min(resizeStart.colEnd + colDelta, columns + 1));
          } else if (resizeDirection === "left") {
            newColStart = Math.max(1, Math.min(resizeStart.colStart + colDelta, resizeStart.colEnd - 1));
          } else if (resizeDirection === "down") {
            newRowEnd = Math.max(resizeStart.rowStart + 1, Math.min(resizeStart.rowEnd + rowDelta, rows + 1));
          } else if (resizeDirection === "up") {
            newRowStart = Math.max(1, Math.min(resizeStart.rowStart + rowDelta, resizeStart.rowEnd - 1));
          }

          // Find items that will be merged (overlap with new position)
          const itemsToMerge = items.filter((item) => {
            if (item.id === resizingItemId) return false;
            return !(
              item.colEnd <= newColStart ||
              item.colStart >= newColEnd ||
              item.rowEnd <= newRowStart ||
              item.rowStart >= newRowEnd
            );
          });

          // IMPORTANT: Keep resize bookkeeping transactional.
          // We compute the next tracked set + toRestore, but we only commit them to the ref
          // if this resize step is accepted (no conflicts). Otherwise we must not mutate the ref,
          // or shrink can incorrectly "lose" cells and show empty space.
          const trackedSnapshot = mergedDuringResizeRef.current;

          // Track newly merged items so we can restore them if user shrinks back.
          const newlyMerged = itemsToMerge.filter((m) => !trackedSnapshot.some((t) => t.id === m.id));

          // If the resized area expands into empty space, create 1x1 cells there and treat them as merged.
          // This makes "minimize" split back into cells instead of turning that space into empty.
          const usedNumbers = new Set<number>();
          const collectUsed = (arr: GridItem[]) => {
            for (const it of arr) {
              const n = parseInt(it.content, 10);
              if (Number.isFinite(n) && n > 0) usedNumbers.add(n);
            }
          };
          collectUsed(items);
          collectUsed(trackedSnapshot);
          collectUsed(newlyMerged);

          const nextAvailable = () => {
            let n = 1;
            while (usedNumbers.has(n)) n++;
            usedNumbers.add(n);
            return n;
          };

          const sessionId = resizeSessionIdRef.current || "rs";
          const autoMerged: GridItem[] = [];
          for (let row = newRowStart; row < newRowEnd; row++) {
            for (let col = newColStart; col < newColEnd; col++) {
              // Don't create auto-cells under the original area; those already "exist" via the resizing item.
              if (
                col >= resizeStart.colStart &&
                col < resizeStart.colEnd &&
                row >= resizeStart.rowStart &&
                row < resizeStart.rowEnd
              ) {
                continue;
              }

              // Skip any cell already covered by an existing (non-resizing) item — it'll be merged as an item.
              const occupied = items.some(
                (i) =>
                  i.id !== resizingItemId &&
                  col >= i.colStart &&
                  col < i.colEnd &&
                  row >= i.rowStart &&
                  row < i.rowEnd
              );
              if (occupied) continue;

              const autoId = `auto-${sessionId}-r${row}-c${col}`;
              const alreadyHave =
                trackedSnapshot.some((m) => m.id === autoId) ||
                newlyMerged.some((m) => m.id === autoId) ||
                autoMerged.some((m) => m.id === autoId);
              if (alreadyHave) continue;

              autoMerged.push({
                id: autoId,
                colStart: col,
                colEnd: col + 1,
                rowStart: row,
                rowEnd: row + 1,
                content: String(nextAvailable()),
              });
            }
          }

          const nextTracked = [
            ...trackedSnapshot,
            ...newlyMerged.map((c) => ({ ...c })),
            ...autoMerged,
          ];

          // Restore any previously-merged items that are now outside the resized area.
          const toRestore = nextTracked.filter((cell) => {
            return (
              cell.colEnd <= newColStart ||
              cell.colStart >= newColEnd ||
              cell.rowEnd <= newRowStart ||
              cell.rowStart >= newRowEnd
            );
          });

          const remainingTracked = nextTracked.filter(
            (cell) => !toRestore.some((r) => r.id === cell.id)
          );

          const itemsToCheck = items.filter((item) =>
            item.id !== resizingItemId &&
            !itemsToMerge.some(m => m.id === item.id)
          );

          const hasConflict = itemsToCheck.some((item) => {
            return !(
              item.colEnd <= newColStart ||
              item.colStart >= newColEnd ||
              item.rowEnd <= newRowStart ||
              item.rowStart >= newRowEnd
            );
          });

          if (!hasConflict) {
            const itemsToKeep = items.filter((item) =>
              item.id !== resizingItemId &&
              !itemsToMerge.some(m => m.id === item.id)
            );

            const updatedItem = {
              ...resizingItem,
              colStart: newColStart,
              colEnd: newColEnd,
              rowStart: newRowStart,
              rowEnd: newRowEnd,
            };

            // NOTE: Lazy-init semantics: we only restore cells that actually existed and were merged.
            // We never auto-create new cells on expand or shrink.
            mergedDuringResizeRef.current = remainingTracked;
            return [...itemsToKeep, ...toRestore, updatedItem];
          }

          return items;
        });
      });
    };

    const handleMouseUp = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setResizingItemId(null);
      setResizeDirection(null);
      setResizeStart(null);
      mergedDuringResizeRef.current = [];
      resizeSessionIdRef.current = "";
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resizingItemId, resizeStart, resizeDirection, columns, rows, gap, isAreaFree, gridItems, dragThreshold, getNextAvailableNumber]);

  // Generate code
  const generateCode = useCallback(() => {
    if (format === "jsx") {
      const itemsCode = gridItems
        .map(
          (item) =>
            `  <div style={{ gridColumn: '${item.colStart} / ${item.colEnd}', gridRow: '${item.rowStart} / ${item.rowEnd}' }}>${item.content}</div>`
        )
        .join("\n");

      return `<div className="grid" style={{ gridTemplateColumns: 'repeat(${columns}, 1fr)', gridTemplateRows: 'repeat(${rows}, 1fr)', gap: '${gap * 0.25}rem' }}>
${itemsCode}
</div>`;
    } else {
      const itemsCode = gridItems
        .map(
          (item) =>
            `  <div style="grid-column: ${item.colStart} / ${item.colEnd}; grid-row: ${item.rowStart} / ${item.rowEnd};">${item.content}</div>`
        )
        .join("\n");

      return `<div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr); gap: ${gap * 0.25}rem;">
${itemsCode}
</div>`;
    }
  }, [format, columns, rows, gap, gridItems]);

  const code = generateCode();

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto p-4 gap-4">
      {/* Header - Compact */}
      <div className="shrink-0">
        <h1 className="text-xl font-bold mb-1">CSS Grid Generator</h1>

        <p className="text-sm text-muted-foreground">
          Create custom Tailwind grid layouts. Click empty cells to add items - drag to move, resize to merge/expand.
        </p>
      </div>

      {/* Controls - Compact */}
      <div className="flex items-end gap-3 flex-wrap shrink-0">
        <div className="space-y-1">
          <Label htmlFor="columns" className="text-xs">Columns</Label>
          <Input
            id="columns"
            type="number"
            min="1"
            max="12"
            value={columns}
            onChange={(e) => handleColumnsChange(e.target.value)}
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rows" className="text-xs">Rows</Label>
          <Input
            id="rows"
            type="number"
            min="1"
            max="12"
            value={rows}
            onChange={(e) => handleRowsChange(e.target.value)}
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gap" className="text-xs">Gap</Label>
          <Input
            id="gap"
            type="number"
            min="1"
            max="12"
            value={gap}
            onChange={(e) => handleGapChange(e.target.value)}
            className="w-20 h-8 text-sm"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Visual Grid - Maintains cell size */}
      <div className="flex flex-col w-full">
        {/* Prevent the 12th column from spilling outside; allow horizontal scroll instead */}
        <div className="w-full overflow-x-auto">
          <div
            ref={gridRef}
            className="border border-border rounded-lg p-3 bg-muted/30"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, minmax(60px, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(60px, 1fr))`,
              gap: `${gap * 0.25}rem`,
            }}
          >
            {/* Render all possible grid cells */}
            {Array.from({ length: rows * columns }, (_, index) => {
              const row = Math.floor(index / columns) + 1;
              const col = (index % columns) + 1;
              const item = gridItems.find(i =>
                col >= i.colStart && col < i.colEnd && row >= i.rowStart && row < i.rowEnd
              );

              if (item && item.colStart === col && item.rowStart === row) {
                // Render grid item
                const isSelected = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group bg-primary/80 text-primary-foreground rounded flex items-center justify-center font-semibold relative cursor-move select-none transition-all",
                      isSelected && "ring-2 ring-ring ring-offset-2 shadow-lg",
                      resizingItemId === item.id && "z-10"
                    )}
                    style={{
                      gridColumn: `${item.colStart} / ${item.colEnd}`,
                      gridRow: `${item.rowStart} / ${item.rowEnd}`,
                      cursor: draggedItemId === item.id ? "move" : "grab",
                    }}
                    onMouseDown={(e) => handleDragStart(e, item.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(item.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDoubleClick(item.id);
                    }}
                  >
                    <span>{item.content}</span>

                    {/* Resize handles */}
                    <div
                      className="absolute top-0 right-0 w-4 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20 flex items-center justify-end pr-1"
                      onMouseDown={(e) => handleResizeStart(e, item.id, "right")}
                    >
                      <div className="w-1 h-8 bg-primary-foreground/50 rounded" />
                    </div>
                    <div
                      className="absolute top-0 left-0 w-4 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20 flex items-center justify-start pl-1"
                      onMouseDown={(e) => handleResizeStart(e, item.id, "left")}
                    >
                      <div className="w-1 h-8 bg-primary-foreground/50 rounded" />
                    </div>
                    <div
                      className="absolute bottom-0 left-0 w-full h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20 flex items-end justify-center pb-1"
                      onMouseDown={(e) => handleResizeStart(e, item.id, "down")}
                    >
                      <div className="w-8 h-1 bg-primary-foreground/50 rounded" />
                    </div>
                    <div
                      className="absolute top-0 left-0 w-full h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20 flex items-start justify-center pt-1"
                      onMouseDown={(e) => handleResizeStart(e, item.id, "up")}
                    >
                      <div className="w-8 h-1 bg-primary-foreground/50 rounded" />
                    </div>
                  </div>
                );
              } else if (!item) {
                // Render empty cell with Plus icon
                return (
                  <div
                    key={`empty-${row}-${col}`}
                    className="border border-dashed border-border/50 rounded flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{
                      gridColumn: `${col} / ${col + 1}`,
                      gridRow: `${row} / ${row + 1}`,
                    }}
                    onClick={() => handleAddItem(col, row)}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Code Output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Generated Code</Label>
          <div className="flex items-center gap-2">
            <Tabs value={format} onValueChange={(v) => setFormat(v as "jsx" | "html")}>
              <TabsList className="h-8">
                <TabsTrigger value="jsx" className="text-xs px-3">JSX</TabsTrigger>
                <TabsTrigger value="html" className="text-xs px-3">HTML</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleCopy} variant="default" size="sm">
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-3 font-mono text-xs border border-border">
          <pre className="whitespace-pre-wrap text-foreground break-words overflow-wrap-anywhere">{code}</pre>
        </div>
      </div>
    </div>
  );
}
