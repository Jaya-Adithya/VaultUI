import { useEffect, useCallback } from "react";

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Ctrl+S and Escape even in inputs
        if (!(e.key === "s" && (e.ctrlKey || e.metaKey)) && e.key !== "Escape") {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
        const hasModifier = ctrlOrMeta
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey;
        const hasShift = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          hasModifier &&
          hasShift
        ) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts({
  onSearch,
  onAddComponent,
}: {
  onSearch?: () => void;
  onAddComponent?: () => void;
}) {
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      handler: () => onSearch?.(),
    },
    {
      key: "n",
      ctrl: true,
      handler: () => onAddComponent?.(),
    },
  ]);
}
