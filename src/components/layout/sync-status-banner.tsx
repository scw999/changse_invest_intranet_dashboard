"use client";

import { AlertTriangle, DatabaseZap, RefreshCw } from "lucide-react";

import { useResearchStore } from "@/lib/store/research-store";

export function SyncStatusBanner() {
  const dataSource = useResearchStore((state) => state.dataSource);
  const syncStatus = useResearchStore((state) => state.syncStatus);
  const syncMessage = useResearchStore((state) => state.syncMessage);
  const lastSyncedAt = useResearchStore((state) => state.lastSyncedAt);

  const isVisible = syncStatus === "loading" || syncStatus === "error" || dataSource === "supabase";

  if (!isVisible) {
    return null;
  }

  const tone =
    syncStatus === "error"
      ? "border-[rgba(140,45,45,0.18)] bg-[rgba(140,45,45,0.06)] text-[#7a2f2f]"
      : "border-[rgba(23,42,70,0.12)] bg-[rgba(255,255,255,0.7)] text-[var(--text-muted)]";

  return (
    <div
      className={`rounded-[18px] border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(16,29,46,0.04)] ${tone}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {syncStatus === "loading" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : syncStatus === "error" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <DatabaseZap className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="font-semibold">
            {dataSource === "supabase" && syncStatus !== "error"
              ? "Supabase 실데이터 연결됨"
              : syncStatus === "loading"
                ? "Supabase 연결 확인 중"
                : "시드 데이터로 실행 중"}
          </p>
          {syncMessage ? <p className="mt-1 leading-6">{syncMessage}</p> : null}
          {lastSyncedAt ? (
            <p className="mt-1 text-xs opacity-80">
              마지막 동기화 {new Date(lastSyncedAt).toLocaleString("ko-KR")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
