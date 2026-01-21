"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}

const HOVER_DELAY = 200; // ms

export function HoverableCard({
  id,
  title,
  framework,
  updatedAt,
  files,
  status,
}: HoverableCardProps) {
  const { setActivePreview, isPreviewActive } = useHoverPreview();
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const frameworkType = framework as Framework;
  const canRender = isRenderable(frameworkType);
  const isActive = isPreviewActive(id);

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
    <Link href={`/component/${id}`}>
      <Card
        ref={cardRef}
        className={cn(
          "group overflow-hidden transition-all duration-200 cursor-pointer",
          isHovering && "border-primary/50 shadow-lg shadow-primary/5"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative aspect-video bg-muted/50 rounded-t-lg overflow-hidden">
          <StaticThumbnail files={files} framework={frameworkType} />

          {canRender && (
            <HoverPreview
              files={files}
              framework={frameworkType}
              isActive={isActive}
            />
          )}
        </div>

        <div className="p-3 space-y-2">
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
  );
}
