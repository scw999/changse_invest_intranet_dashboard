"use client";

import { useState } from "react";

import { PageIntro } from "@/components/layout/page-intro";
import { ThemeCard } from "@/components/research/theme-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { SectionCard } from "@/components/ui/section-card";
import { getDisplayTheme } from "@/lib/content-kr";
import { priorityLabels, themeCategoryLabels } from "@/lib/localize";
import { getThemeCoverage } from "@/lib/selectors";
import { useResearchStore } from "@/lib/store/research-store";
import { THEME_CATEGORIES } from "@/types/research";

export function ThemesPage() {
  const newsItems = useResearchStore((state) => state.newsItems);
  const allThemes = useResearchStore((state) => state.themes);
  const tickers = useResearchStore((state) => state.tickers);
  const followUps = useResearchStore((state) => state.followUps);
  const portfolioItems = useResearchStore((state) => state.portfolioItems);
  const preferences = useResearchStore((state) => state.preferences);
  const dataset = { newsItems, themes: allThemes, tickers, followUps, portfolioItems, preferences };
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | (typeof THEME_CATEGORIES)[number]>("all");
  const [priority, setPriority] = useState<"all" | "Critical" | "High" | "Medium" | "Low">(
    "all",
  );

  const themes = allThemes.filter((theme) => {
    if (category !== "all" && theme.category !== category) {
      return false;
    }

    if (priority !== "all" && theme.priority !== priority) {
      return false;
    }

    if (search) {
      const query = search.toLowerCase();
      const displayTheme = getDisplayTheme(theme);
      const haystack = `${displayTheme.name} ${displayTheme.description}`.toLowerCase();
      return haystack.includes(query);
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="테마"
        title="테마 맵"
        description="정책, 매크로, 섹터, 크로스에셋 리스크를 테마 단위로 묶어두면 흩어진 뉴스가 장기적인 리서치 기억으로 남습니다."
        meta={`총 ${allThemes.length}개 테마`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">테마 상세 페이지</Badge>
          <Badge variant="outline">대기 중인 결과 수</Badge>
          <Badge variant="outline">뉴스·팔로업 연결</Badge>
        </div>
      </PageIntro>

      <FilterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch("");
          setCategory("all");
          setPriority("all");
        }}
        filters={[
          {
            label: "카테고리",
            value: category,
            onChange: (value) => setCategory(value as typeof category),
            options: [
              { label: "전체 카테고리", value: "all" },
              ...THEME_CATEGORIES.map((entry) => ({
                label: themeCategoryLabels[entry],
                value: entry,
              })),
            ],
          },
          {
            label: "우선순위",
            value: priority,
            onChange: (value) => setPriority(value as typeof priority),
            options: [
              { label: "전체 우선순위", value: "all" },
              { label: priorityLabels.Critical, value: "Critical" },
              { label: priorityLabels.High, value: "High" },
              { label: priorityLabels.Medium, value: "Medium" },
              { label: priorityLabels.Low, value: "Low" },
            ],
          },
        ]}
      />

      <SectionCard
        title="테마 디렉터리"
        description="각 테마 페이지에서 연결된 뉴스와 팔로업 이력을 한 번에 볼 수 있습니다."
      >
        {themes.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {themes.map((theme) => {
              const coverage = getThemeCoverage(dataset, theme);

              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  newsCount={coverage.newsCount}
                  pendingCount={coverage.pendingCount}
                  followUpCount={coverage.followUpCount}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="조건에 맞는 테마가 없습니다"
            description="카테고리 필터를 넓히거나 검색어를 지우고 다시 확인해보세요."
          />
        )}
      </SectionCard>
    </div>
  );
}
