"use client";

import { use } from "react";
import { Playground } from "@/components/editor/playground";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ComponentPage({ params }: PageProps) {
  const { id } = use(params);
  return <Playground componentId={id} />;
}
