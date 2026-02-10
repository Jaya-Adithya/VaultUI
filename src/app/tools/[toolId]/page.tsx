"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CssGridGenerator } from "@/components/tools/css-grid-generator";
import { GradientGenerator } from "@/components/tools/gradient-generator";
import { ImageClipper } from "@/components/tools/image-clipper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ toolId: string }>;
}

const TOOLS: Record<string, { component: React.ComponentType; title: string }> = {
  "css-grid-generator": {
    component: CssGridGenerator,
    title: "CSS Grid Generator",
  },
  "gradient-generator": {
    component: GradientGenerator,
    title: "CSS Gradient Generator",
  },
  "image-clipper": {
    component: ImageClipper,
    title: "CSS Clip-Path Generator",
  },
};

export default function ToolPage({ params }: PageProps) {
  const { toolId } = use(params);
  const router = useRouter();

  const tool = TOOLS[toolId];

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <span className="text-lg text-muted-foreground">
          Tool not found
        </span>
        <Button variant="outline" onClick={() => router.push("/")}>
          Go back
        </Button>
      </div>
    );
  }

  const ToolComponent = tool.component;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border/40 bg-background shrink-0 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          title="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{tool.title}</h1>
      </header>
      <div className="flex-1">
        <ToolComponent />
      </div>
    </div>
  );
}
