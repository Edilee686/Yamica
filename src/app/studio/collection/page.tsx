"use client";
import { Suspense } from "react";
import { Workspace } from "@/components/workspace/Workspace";

export default function CollectionPage() {
  return (
    <Suspense fallback={null}>
      <Workspace />
    </Suspense>
  );
}
