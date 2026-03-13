"use client";

import { useEffect, useRef } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useResearchStore } from "@/lib/store/research-store";
import type { ResearchDataset } from "@/types/research";

type ResearchBootstrapProps = {
  initialDataset?: ResearchDataset | null;
};

export function ResearchBootstrap({ initialDataset }: ResearchBootstrapProps) {
  const hydrateDataset = useResearchStore((state) => state.hydrateDataset);
  const setSyncState = useResearchStore((state) => state.setSyncState);
  const bootstrappedRef = useRef(false);

  if (initialDataset && !bootstrappedRef.current) {
    useResearchStore.setState({
      ...initialDataset,
      dataSource: "supabase",
      syncStatus: "success",
      syncMessage: "서버에서 최신 리서치 데이터를 미리 불러왔습니다.",
      lastSyncedAt: new Date().toISOString(),
    });
    bootstrappedRef.current = true;
  }

  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!isSupabaseConfigured()) {
        setSyncState({
          dataSource: "mock",
          syncStatus: "idle",
          syncMessage: "Supabase 설정이 없어 시드 데이터로 실행 중입니다.",
        });
        return;
      }

      if (!initialDataset) {
        setSyncState({
          syncStatus: "loading",
          syncMessage: "Supabase에서 최신 데이터를 확인하는 중입니다.",
        });
      }

      try {
        const response = await fetch("/api/private/research", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Private research API request failed.");
        }

        const dataset = (await response.json()) as ResearchDataset;

        if (!active) {
          return;
        }

        hydrateDataset(dataset, {
          source: "supabase",
          message: "Supabase에서 최신 데이터를 불러왔습니다.",
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Supabase 조회에 실패해 시드 데이터로 전환했습니다.";

        setSyncState({
          dataSource: initialDataset ? "supabase" : "mock",
          syncStatus: "error",
          syncMessage: message,
        });
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, [hydrateDataset, initialDataset, setSyncState]);

  return null;
}
