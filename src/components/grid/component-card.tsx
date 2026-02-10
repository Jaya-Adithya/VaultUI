"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaticThumbnail } from "@/components/preview/static-thumbnail";
import {
  getFrameworkLabel,
  getFrameworkColor,
  type Framework,
} from "@/lib/detect-framework";
import { cn } from "@/lib/utils";

interface FileData {
  filename: string;
  language: string;
  code: string;
}

interface ComponentCardProps {
  id: string;
  title: string;
  framework: string;
  updatedAt: Date;
  files: FileData[];
  status: string;
  coverImage?: string | null;
}

export function ComponentCard({
  id,
  title,
  framework,
  updatedAt,
  files,
  status,
  coverImage,
}: ComponentCardProps) {
  const frameworkType = framework as Framework;

  return (
    <Link href={`/component/${id}`}>
      <Card className="group overflow-hidden hover:border-primary/50 transition-all duration-200 cursor-pointer">
        <StaticThumbnail files={files} framework={frameworkType} coverImage={coverImage} />

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {title}
            </h3>
            {status === "ready" && (
              <Badge
                variant="outline"
                className="text-xs bg-green-500/10 text-green-500 border-green-500/20"
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
