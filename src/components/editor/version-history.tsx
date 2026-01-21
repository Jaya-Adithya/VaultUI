"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Version {
  id: string;
  version: number;
  createdAt: Date;
}

interface VersionHistoryProps {
  versions: Version[];
  currentVersionId: string;
  onVersionChange: (versionId: string) => void;
}

export function VersionHistory({
  versions,
  currentVersionId,
  onVersionChange,
}: VersionHistoryProps) {
  const currentVersion = versions.find((v) => v.id === currentVersionId);
  const isLatest = currentVersion?.version === versions[0]?.version;

  return (
    <div className="flex items-center gap-2">
      <Select value={currentVersionId} onValueChange={onVersionChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          {versions.map((version, index) => (
            <SelectItem key={version.id} value={version.id}>
              <div className="flex items-center gap-2">
                <span>v{version.version}</span>
                {index === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Latest
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(version.createdAt), {
                    addSuffix: true,
                  })}
                </span>
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
  );
}
