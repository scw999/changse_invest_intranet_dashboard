"use client";

import { useEffect, useRef } from "react";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useResearchStore } from "@/lib/store/research-store";
import type { ResearchDataset } from "@/types/research";

type ResearchBootstrapProps = {
  initialDataset?: ResearchDataset | null;
};

export function ResearchBootstrap({ initialDataset }: ResearchBootstrapProps) {
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
        syncStatus: "error",
        syncMessage: "서버에서 데이터를 불러오지 못했습니다.",
      });
    }
  }, [initialDataset, setSyncState]);

  return null;
}
