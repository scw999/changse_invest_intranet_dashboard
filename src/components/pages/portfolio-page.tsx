"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

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

export function PortfolioPage() {
  const dataset = useResearchStore((state) => state);
  const addPortfolioItem = useResearchStore((state) => state.addPortfolioItem);
  const deletePortfolioItem = useResearchStore((state) => state.deletePortfolioItem);
  const updatePreferences = useResearchStore((state) => state.updatePreferences);
  const [form, setForm] = useState(emptyForm);

  const holdings = dataset.portfolioItems.filter((item) => item.isHolding);
  const watchlist = dataset.portfolioItems.filter((item) => item.isWatchlist);

  const toggleThemeInterest = (themeId: string) => {
    const exists = dataset.preferences.interestThemeIds.includes(themeId);
    updatePreferences({
      interestThemeIds: exists
        ? dataset.preferences.interestThemeIds.filter((entry) => entry !== themeId)
        : [...dataset.preferences.interestThemeIds, themeId],
    });
  };

  const toggleFavoriteSlot = (slot: (typeof SCAN_SLOTS)[number]) => {
    const exists = dataset.preferences.favoriteSlots.includes(slot);
    updatePreferences({
      favoriteSlots: exists
        ? dataset.preferences.favoriteSlots.filter((entry) => entry !== slot)
        : [...dataset.preferences.favoriteSlots, slot],
    });
  };

  const toggleDefaultRegion = (region: (typeof REGIONS)[number]) => {
    const exists = dataset.preferences.defaultRegions.includes(region);
    updatePreferences({
      defaultRegions: exists
        ? dataset.preferences.defaultRegions.filter((entry) => entry !== region)
        : [...dataset.preferences.defaultRegions, region],
    });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="포트폴리오 / 관심종목"
        title="보유 현황과 관심 지도"
        description="현재 보유 자산, 관심 종목, 관심 테마를 저장해 두면 이후 뉴스 우선순위와 개인화가 훨씬 정교해집니다."
        meta={`총 ${dataset.portfolioItems.length}개 자산 추적 중`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">보유 자산</Badge>
          <Badge variant="outline">관심 종목</Badge>
          <Badge variant="outline">관심 테마</Badge>
        </div>
      </PageIntro>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="보유"
          value={String(holdings.length)}
          description="현재 포트폴리오에서 실제 보유 중으로 표시된 자산 수입니다."
          accent="linear-gradient(90deg, #1d7b60, #82b69f)"
        />
        <StatCard
          label="관심"
          value={String(watchlist.length)}
          description="향후 편입 후보로 모니터링 중인 자산 수입니다."
          accent="linear-gradient(90deg, #9f6b2c, #ddb27a)"
        />
        <StatCard
          label="관심 테마"
          value={String(dataset.preferences.interestThemeIds.length)}
          description="현재 개인화 우선순위 계산에 반영되는 테마 수입니다."
          accent="linear-gradient(90deg, #355c7d, #6d8fa3)"
        />
        <StatCard
          label="기본 지역"
          value={dataset.preferences.defaultRegions.map((entry) => regionLabels[entry]).join(" / ")}
          description="피드에서 기본적으로 강조할 지역 범위입니다."
          accent="linear-gradient(90deg, #5a4f83, #9a8ebb)"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard
          title="현재 자산 현황"
          description="MVP 단계에서는 보유 자산과 관심 종목이 브라우저 저장소에 바로 반영됩니다."
        >
          <div className="space-y-5">
            {dataset.portfolioItems.map((item) => (
              <div key={item.id} className="space-y-3">
                <PortfolioCard item={item} />
                <button
                  type="button"
                  onClick={() => deletePortfolioItem(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)]"
                >
                  <Trash2 className="h-4 w-4" />
                  자산 삭제
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="자산 추가"
          description="보유 자산 또는 관심 종목을 바로 입력할 수 있는 간단한 MVP 폼입니다."
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              addPortfolioItem({
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
              });
              setForm(emptyForm);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="티커">
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
                placeholder="왜 보유하거나 관심종목으로 관리하는지 적어두세요."
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
                  onChange={(event) => setForm({ ...form, isWatchlist: event.target.checked })}
                />
                관심종목
              </label>
            </div>

            <button
              type="submit"
              className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              자산 추가
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="관심 테마"
          description="여기서 체크한 테마는 대시보드의 가벼운 개인화 로직에 바로 반영됩니다."
        >
          <div className="flex flex-wrap gap-2">
            {dataset.themes.map((theme) => {
              const active = dataset.preferences.interestThemeIds.includes(theme.id);

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => toggleThemeInterest(theme.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-transparent bg-[var(--text-strong)] text-white"
                      : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                  }`}
                >
                  {getDisplayTheme(theme).name}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="사용자 기본 설정"
          description="기본 정렬, 지역 집중도, 선호 스캔 슬롯을 간단히 조정할 수 있습니다."
        >
          <div className="space-y-6">
            <Field label="기본 정렬">
              <select
                value={dataset.preferences.preferredSort}
                onChange={(event) =>
                  updatePreferences({
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
                  const active = dataset.preferences.favoriteSlots.includes(slot);

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleFavoriteSlot(slot)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-transparent bg-[var(--text-strong)] text-white"
                          : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                      }`}
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
                  const active = dataset.preferences.defaultRegions.includes(entry);

                  return (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => toggleDefaultRegion(entry)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "border-transparent bg-[var(--text-strong)] text-white"
                          : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
                      }`}
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
                checked={dataset.preferences.compactMode}
                onChange={(event) => updatePreferences({ compactMode: event.target.checked })}
              />
              모바일 컴팩트 모드
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
