"use client";

import { createContext, useContext } from "react";

import type { AppViewer } from "@/lib/auth/session";

const ViewerContext = createContext<AppViewer | null>(null);

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: AppViewer;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const viewer = useContext(ViewerContext);

  if (!viewer) {
    throw new Error("Viewer context is missing.");
  }

  return viewer;
}
