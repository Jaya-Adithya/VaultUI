"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface HoverPreviewContextType {
  activePreviewId: string | null;
  setActivePreview: (id: string | null) => void;
  isPreviewActive: (id: string) => boolean;
}

const HoverPreviewContext = createContext<HoverPreviewContextType | null>(null);

export function HoverPreviewProvider({ children }: { children: ReactNode }) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const setActivePreview = useCallback((id: string | null) => {
    setActivePreviewId(id);
  }, []);

  const isPreviewActive = useCallback(
    (id: string) => activePreviewId === id,
    [activePreviewId]
  );

  return (
    <HoverPreviewContext.Provider
      value={{ activePreviewId, setActivePreview, isPreviewActive }}
    >
      {children}
    </HoverPreviewContext.Provider>
  );
}

export function useHoverPreview() {
  const context = useContext(HoverPreviewContext);
  if (!context) {
    throw new Error(
      "useHoverPreview must be used within a HoverPreviewProvider"
    );
  }
  return context;
}
