"use client";

import { startTransition, useState } from "react";
import { Bot, Lock, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

import { useViewer } from "@/components/auth/viewer-context";
import { PageIntro } from "@/components/layout/page-intro";
import { PortfolioCard } from "@/components/research/portfolio-card";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDisplayTheme } from "@/lib/content-kr";
import {
  newsSortLabels,
  portfolioAssetTypeLabels,
  priorityLabels,
  regionLabels,
} from "@/lib/localize";
import { useResearchStore } from "@/lib/store/research-store";
import type { ResearchDataset } from "@/types/research";
import {
  NEWS_SORT_OPTIONS,
  PORTFOLIO_ASSET_TYPES,
  PRIORITY_LEVELS,
  REGIONS,
  SCAN_SLOTS,
} from "@/types/research";

const emptyForm = {
  symbol: "",
  assetName: "",
  assetType: "Stock" as const,
  region: "KR" as const,
  isHolding: true,
  isWatchlist: false,
  weight: "",
  averageCost: "",
  memo: "",
  priority: "Medium" as const,
};

async function readDatasetResponse(response: Response): Promise<ResearchDataset> {
  const body = (await response.json().catch(() => null)) as
    | ResearchDataset
    | { error?: string }
    | null;

  const isDataset =
    body &&
    "themes" in body &&
    "tickers" in body &&
    "newsItems" in body &&
    "followUps" in body &&
    "portfolioItems" in body &&
    "preferences" in body;

  if (!response.ok || !isDataset) {
    const message =
      body && "error" in body
        ? body.error || "포트폴리오 작업에 실패했습니다."
        : "포트폴리오 작업에 실패했습니다.";
    throw new Error(message);
  }

  return body;
}

export function PortfolioPage() {
  const viewer = useViewer();
  const isReadOnly = viewer.isGuest || !viewer.isAdmin;

  const themes = useResearchStore((state) => state.themes);
  const portfolioItems = useResearchStore((state) => state.portfolioItems);
  const preferences = useResearchStore((state) => state.preferences);
  const hydrateDataset = useResearchStore((state) => state.hydrateDataset);
  const setSyncState = useResearchStore((state) => state.setSyncState);

  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const holdings = portfolioItems.filter((item) => item.isHolding);
  const watchlist = portfolioItems.filter((item) => item.isWatchlist);

  const applyDataset = (nextDataset: ResearchDataset, message: string) => {
    startTransition(() => {
      hydrateDataset(nextDataset, {
        source: "supabase",
        message,
      });
    });
  };

  const runMutation = async (url: string, options: RequestInit, successMessage: string) => {
    if (isReadOnly) {
      setErrorMessage("게스트 뷰어는 읽기 전용입니다. 관리자 로그인 후 수정할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setSyncState({
      syncStatus: "loading",
      syncMessage: "서버에 포트폴리오 변경사항을 저장하는 중입니다.",
    });

    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
      });
      const nextDataset = await readDatasetResponse(response);
      applyDataset(nextDataset, successMessage);
      setStatusMessage(successMessage);
      setSyncState({
        dataSource: "supabase",
        syncStatus: "success",
        syncMessage: successMessage,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "포트폴리오 작업에 실패했습니다.";
      setErrorMessage(message);
      setSyncState({
        syncStatus: "error",
        syncMessage: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshDataset = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/private/research", {
        credentials: "include",
        cache: "no-store",
      });
      const nextDataset = await readDatasetResponse(response);
      applyDataset(nextDataset, "Supabase 기준 최신 포트폴리오 상태를 불러왔습니다.");
      setStatusMessage("Supabase 기준 최신 포트폴리오 상태를 불러왔습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "데이터를 다시 불러오지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePreferences = async (patch: Partial<ResearchDataset["preferences"]>) => {
    await runMutation(
      "/api/private/portfolio/preferences",
      {
        method: "PATCH",
        body: JSON.stringify({
          timezone: preferences.timezone,
          preferredSort: patch.preferredSort ?? preferences.preferredSort,
          favoriteSlots: patch.favoriteSlots ?? preferences.favoriteSlots,
          defaultRegions: patch.defaultRegions ?? preferences.defaultRegions,
          interestThemeIds: patch.interestThemeIds ?? preferences.interestThemeIds,
          compactMode: patch.compactMode ?? preferences.compactMode,
        }),
      },
      "포트폴리오 기본 설정을 저장했습니다.",
    );
  };

  const toggleThemeInterest = async (themeId: string) => {
    const exists = preferences.interestThemeIds.includes(themeId);
    await updatePreferences({
      interestThemeIds: exists
        ? preferences.interestThemeIds.filter((entry) => entry !== themeId)
        : [...preferences.interestThemeIds, themeId],
    });
  };

  const toggleFavoriteSlot = async (slot: (typeof SCAN_SLOTS)[number]) => {
    const exists = preferences.favoriteSlots.includes(slot);
    await updatePreferences({
      favoriteSlots: exists
        ? preferences.favoriteSlots.filter((entry) => entry !== slot)
        : [...preferences.favoriteSlots, slot],
    });
  };

  const toggleDefaultRegion = async (region: (typeof REGIONS)[number]) => {
    const exists = preferences.defaultRegions.includes(region);
    await updatePreferences({
      defaultRegions: exists
        ? preferences.defaultRegions.filter((entry) => entry !== region)
        : [...preferences.defaultRegions, region],
    });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="포트폴리오 / 관심종목"
        title="보유 자산과 관심 범위"
        description={
          isReadOnly
            ? "게스트는 읽기 전용으로 데이터만 볼 수 있습니다. 수정은 관리자 로그인 후 가능하며, 실제 운영 입력은 창세봇과 internal API 중심으로 처리됩니다."
            : "관리자만 private API를 통해 수정할 수 있습니다. 실제 운영에서는 텔레그램의 창세봇이 같은 내부 경로를 호출해 데이터를 채우는 흐름을 기본으로 둡니다."
        }
        meta={`총 ${portfolioItems.length}개 자산 추적 중`}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshDataset()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
            서버 기준 새로고침
          </button>
          {isReadOnly ? (
            <Badge variant="outline">게스트 읽기 전용</Badge>
          ) : (
            <Badge variant="outline">관리자 쓰기 가능</Badge>
          )}
          <Badge variant="outline">창세봇 연동 준비</Badge>
          <Badge variant="outline">공개 쓰기 차단</Badge>
        </div>
      </PageIntro>

      {statusMessage ? (
        <div className="rounded-[22px] border border-[rgba(29,123,96,0.18)] bg-[rgba(29,123,96,0.06)] px-4 py-3 text-sm text-[#1d604f]">
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[22px] border border-[rgba(140,45,45,0.18)] bg-[rgba(140,45,45,0.06)] px-4 py-3 text-sm text-[#7a2f2f]">
          {errorMessage}
        </div>
      ) : null}

      {isReadOnly ? (
        <div className="rounded-[26px] border border-[rgba(53,92,125,0.14)] bg-[rgba(53,92,125,0.06)] p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-[var(--text-strong)]" />
            <div>
              <p className="font-semibold text-[var(--text-strong)]">게스트 뷰어 안내</p>
              <p className="mt-1 text-sm leading-7 text-[var(--text-muted)]">
                포트폴리오, 관심종목, 선호 설정은 모두 읽기 전용으로 표시됩니다. 변경이 필요하면
                관리자 로그인 또는 창세봇 경로를 사용하세요.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[26px] border border-[rgba(35,60,95,0.12)] bg-[rgba(255,255,255,0.78)] p-5">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 text-[var(--text-strong)]" />
          <div>
            <p className="font-semibold text-[var(--text-strong)]">권장 운영 방식</p>
              <p className="mt-1 text-sm leading-7 text-[var(--text-muted)]">
              텔레그램에서 창세봇에게 &quot;NVDA를 관심종목에 추가&quot;,
              &quot;효성중공업 메모 수정&quot;, &quot;방산 테마 관심 등록&quot;처럼 요청하면,
              봇이 내부 authenticated ingest API를 통해 안전하게 데이터를 저장하는 구조로
              설계되어 있습니다.
              </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="보유"
          value={String(holdings.length)}
          description="현재 실제 보유 중으로 표시된 자산 수입니다."
          accent="linear-gradient(90deg, #1d7b60, #82b69f)"
        />
        <StatCard
          label="관심"
          value={String(watchlist.length)}
          description="향후 진입 후보로 모니터링 중인 자산 수입니다."
          accent="linear-gradient(90deg, #9f6b2c, #ddb27a)"
        />
        <StatCard
          label="관심 테마"
          value={String(preferences.interestThemeIds.length)}
          description="개인 relevance 계산에 반영될 관심 테마 수입니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
        />
        <StatCard
          label="기본 지역"
          value={
            preferences.defaultRegions.length > 0
              ? preferences.defaultRegions.map((entry) => regionLabels[entry]).join(" / ")
              : "미설정"
          }
          description="대시보드에서 기본 강조하는 지역 범위입니다."
          accent="linear-gradient(90deg, #5a4f83, #9a8ebb)"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard
          title="현재 자산 현황"
          description="실제 저장은 private API를 거치며, 게스트는 현재 상태만 조회할 수 있습니다."
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(29,123,96,0.18)] bg-[rgba(29,123,96,0.06)] px-4 py-2 text-sm text-[#1d604f]">
            <ShieldCheck className="h-4 w-4" />
            {isReadOnly ? "게스트는 읽기 전용" : "관리자와 보조 시스템만 쓰기 가능"}
          </div>
          <div className="space-y-5">
            {portfolioItems.map((item) => (
              <div key={item.id} className="space-y-3">
                <PortfolioCard item={item} />
                {!isReadOnly ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      void runMutation(
                        "/api/private/portfolio/items",
                        {
                          method: "DELETE",
                          body: JSON.stringify({ id: item.id }),
                        },
                        "자산 항목을 삭제했습니다.",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)] disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    자산 삭제
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={isReadOnly ? "추가 요청 안내" : "자산 추가"}
          description={
            isReadOnly
              ? "게스트는 직접 저장할 수 없습니다. 창세봇 또는 관리자 계정으로 입력하세요."
              : "관리자는 이 폼으로 수기 입력할 수 있고, 실제 운영에서는 창세봇이 같은 필드를 internal API로 채우게 됩니다."
          }
        >
          {isReadOnly ? (
            <div className="space-y-3 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[rgba(243,239,231,0.46)] p-5 text-sm leading-7 text-[var(--text-muted)]">
              <p>게스트 뷰어는 포트폴리오와 관심종목을 직접 수정할 수 없습니다.</p>
              <p>
                추가나 수정이 필요하면 텔레그램에서 창세봇에게 요청하거나 관리자 계정으로 로그인해
                주세요.
              </p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void runMutation(
                  "/api/private/portfolio/items",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      symbol: form.symbol.trim().toUpperCase(),
                      assetName: form.assetName.trim(),
                      assetType: form.assetType,
                      region: form.region,
                      isHolding: form.isHolding,
                      isWatchlist: form.isWatchlist,
                      weight: form.weight ? Number(form.weight) : undefined,
                      averageCost: form.averageCost ? Number(form.averageCost) : undefined,
                      memo: form.memo.trim() || undefined,
                      priority: form.priority,
                    }),
                  },
                  "자산 항목을 저장했습니다.",
                ).then(() => {
                  setForm(emptyForm);
                });
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="심볼">
                  <input
                    required
                    value={form.symbol}
                    onChange={(event) => setForm({ ...form, symbol: event.target.value })}
                    className="field"
                    placeholder="000660.KS"
                  />
                </Field>
                <Field label="자산명">
                  <input
                    required
                    value={form.assetName}
                    onChange={(event) => setForm({ ...form, assetName: event.target.value })}
                    className="field"
                    placeholder="SK Hynix"
                  />
                </Field>
                <Field label="자산 유형">
                  <select
                    value={form.assetType}
                    onChange={(event) =>
                      setForm({ ...form, assetType: event.target.value as typeof form.assetType })
                    }
                    className="field"
                  >
                    {PORTFOLIO_ASSET_TYPES.map((entry) => (
                      <option key={entry} value={entry}>
                        {portfolioAssetTypeLabels[entry]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="지역">
                  <select
                    value={form.region}
                    onChange={(event) =>
                      setForm({ ...form, region: event.target.value as typeof form.region })
                    }
                    className="field"
                  >
                    {REGIONS.map((entry) => (
                      <option key={entry} value={entry}>
                        {regionLabels[entry]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="비중 (%)">
                  <input
                    value={form.weight}
                    onChange={(event) => setForm({ ...form, weight: event.target.value })}
                    className="field"
                    placeholder="10"
                  />
                </Field>
                <Field label="평균단가">
                  <input
                    value={form.averageCost}
                    onChange={(event) => setForm({ ...form, averageCost: event.target.value })}
                    className="field"
                    placeholder="173000"
                  />
                </Field>
                <Field label="우선순위">
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({ ...form, priority: event.target.value as typeof form.priority })
                    }
                    className="field"
                  >
                    {PRIORITY_LEVELS.map((entry) => (
                      <option key={entry} value={entry}>
                        {priorityLabels[entry]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="메모">
                <textarea
                  value={form.memo}
                  onChange={(event) => setForm({ ...form, memo: event.target.value })}
                  className="field min-h-[120px]"
                  placeholder="창세봇이 대신 입력해도 같은 필드 구조로 저장됩니다."
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={form.isHolding}
                    onChange={(event) => setForm({ ...form, isHolding: event.target.checked })}
                  />
                  보유
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={form.isWatchlist}
                    onChange={(event) =>
                      setForm({ ...form, isWatchlist: event.target.checked })
                    }
                  />
                  관심종목
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                자산 저장
              </button>
            </form>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="관심 테마"
          description="개인 relevance 계산과 우선순위 반영에 쓰이는 관심 테마입니다."
        >
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => {
              const active = preferences.interestThemeIds.includes(theme.id);

              return (
                <button
                  key={theme.id}
                  type="button"
                  disabled={isSubmitting || isReadOnly}
                  onClick={() => void toggleThemeInterest(theme.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-transparent bg-[var(--text-strong)] text-white"
                      : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {getDisplayTheme(theme).name}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="기본 설정"
          description="정렬, 선호 슬롯, 지역, compact mode도 관리자만 저장할 수 있습니다."
        >
          <div className="space-y-6">
            <Field label="기본 정렬">
              <select
                value={preferences.preferredSort}
                disabled={isSubmitting || isReadOnly}
                onChange={(event) =>
                  void updatePreferences({
                    preferredSort: event.target.value as (typeof NEWS_SORT_OPTIONS)[number],
                  })
                }
                className="field"
              >
                {NEWS_SORT_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {newsSortLabels[entry]}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
                선호 슬롯
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SCAN_SLOTS.map((slot) => {
                  const active = preferences.favoriteSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isSubmitting || isReadOnly}
                      onClick={() => void toggleFavoriteSlot(slot)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-transparent bg-[var(--text-strong)] text-white"
                          : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {slot}:00
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
                기본 지역
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REGIONS.map((entry) => {
                  const active = preferences.defaultRegions.includes(entry);

                  return (
                    <button
                      key={entry}
                      type="button"
                      disabled={isSubmitting || isReadOnly}
                      onClick={() => void toggleDefaultRegion(entry)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-transparent bg-[var(--text-strong)] text-white"
                          : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {regionLabels[entry]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="inline-flex items-center gap-3 rounded-[22px] border border-[var(--border-strong)] px-4 py-3 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={preferences.compactMode}
                disabled={isSubmitting || isReadOnly}
                onChange={(event) => void updatePreferences({ compactMode: event.target.checked })}
              />
              모바일 compact mode
            </label>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
