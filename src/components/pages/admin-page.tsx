"use client";

import { startTransition, useState } from "react";
import { PencilLine, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";

import { PageIntro } from "@/components/layout/page-intro";
import {
  getDisplayFollowUp,
  getDisplayNewsItem,
  getDisplayTheme,
} from "@/lib/content-kr";
import {
  ContentTypeBadge,
  DirectionBadge,
  FollowUpBadge,
  ImportanceBadge,
} from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  assetClassLabels,
  contentTypeLabels,
  directionalLabels,
  followUpLabels,
  importanceLabels,
  regionLabels,
  themeCategoryLabels,
} from "@/lib/localize";
import { useResearchStore } from "@/lib/store/research-store";
import {
  ASSET_CLASSES,
  CONTENT_TYPES,
  DIRECTIONAL_VIEWS,
  FOLLOW_UP_STATUSES,
  IMPORTANCE_LEVELS,
  REGIONS,
  SCAN_SLOTS,
  THEME_CATEGORIES,
  type ContentType,
  type FollowUpRecord,
  type NewsItem,
  type ResearchDataset,
  type Theme,
} from "@/types/research";

type NewsFormState = {
  contentType: ContentType;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scanSlot: (typeof SCAN_SLOTS)[number];
  region: (typeof REGIONS)[number];
  affectedAssetClasses: NewsItem["affectedAssetClasses"];
  relatedThemeIds: string[];
  relatedTickerIds: string[];
  marketInterpretation: string;
  directionalView: (typeof DIRECTIONAL_VIEWS)[number];
  actionIdea: string;
  followUpStatus: (typeof FOLLOW_UP_STATUSES)[number];
  followUpNote: string;
  importance: (typeof IMPORTANCE_LEVELS)[number];
  monitoringTargetTickers: string;
  monitoringNote: string;
  monitoringReferencePrice: string;
  monitoringCurrentSnapshot: string;
  monitoringTriggerCondition: string;
  monitoringNextCheckNote: string;
};

type ThemeFormState = {
  name: string;
  description: string;
  category: (typeof THEME_CATEGORIES)[number];
  priority: Theme["priority"];
  color: string;
};

const defaultThemeForm: ThemeFormState = {
  name: "",
  description: "",
  category: "Macro",
  priority: "Medium",
  color: "#355c7d",
};

function getDefaultNewsForm(): NewsFormState {
  return {
    contentType: "news",
    title: "",
    summary: "",
    sourceName: "",
    sourceUrl: "https://",
    publishedAt: "2026-03-11T09:00",
    scanSlot: "09",
    region: "KR",
    affectedAssetClasses: ["Equities"],
    relatedThemeIds: [],
    relatedTickerIds: [],
    marketInterpretation: "",
    directionalView: "Bullish",
    actionIdea: "",
    followUpStatus: "Pending",
    followUpNote: "",
    importance: "Medium",
    monitoringTargetTickers: "",
    monitoringNote: "",
    monitoringReferencePrice: "",
    monitoringCurrentSnapshot: "",
    monitoringTriggerCondition: "",
    monitoringNextCheckNote: "",
  };
}

function mapNewsItemToForm(item: NewsItem): NewsFormState {
  const displayItem = getDisplayNewsItem(item);

  return {
    contentType: item.contentType ?? "news",
    title: displayItem.title,
    summary: displayItem.summary,
    sourceName: displayItem.sourceName,
    sourceUrl: displayItem.sourceUrl,
    publishedAt: displayItem.publishedAt.slice(0, 16),
    scanSlot: displayItem.scanSlot,
    region: displayItem.region,
    affectedAssetClasses: displayItem.affectedAssetClasses,
    relatedThemeIds: displayItem.relatedThemeIds,
    relatedTickerIds: displayItem.relatedTickerIds,
    marketInterpretation: displayItem.marketInterpretation,
    directionalView: displayItem.directionalView,
    actionIdea: displayItem.actionIdea,
    followUpStatus: displayItem.followUpStatus,
    followUpNote: displayItem.followUpNote,
    importance: displayItem.importance,
    monitoringTargetTickers: item.monitoring?.targetTickers?.join(", ") ?? "",
    monitoringNote: item.monitoring?.note ?? "",
    monitoringReferencePrice: item.monitoring?.referencePrice ?? "",
    monitoringCurrentSnapshot: item.monitoring?.currentSnapshot ?? "",
    monitoringTriggerCondition: item.monitoring?.triggerCondition ?? "",
    monitoringNextCheckNote: item.monitoring?.nextCheckNote ?? "",
  };
}

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
      body && "error" in body ? body.error || "관리 작업에 실패했습니다." : "관리 작업에 실패했습니다.";
    throw new Error(message);
  }

  return body;
}

export function AdminPage() {
  const newsItems = useResearchStore((state) => state.newsItems);
  const themes = useResearchStore((state) => state.themes);
  const tickers = useResearchStore((state) => state.tickers);
  const followUps = useResearchStore((state) => state.followUps);
  const hydrateDataset = useResearchStore((state) => state.hydrateDataset);
  const setSyncState = useResearchStore((state) => state.setSyncState);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsForm, setNewsForm] = useState<NewsFormState>(getDefaultNewsForm());
  const [themeForm, setThemeForm] = useState<ThemeFormState>(defaultThemeForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsForm(getDefaultNewsForm());
  };

  const applyDataset = (nextDataset: ResearchDataset, message: string) => {
    startTransition(() => {
      hydrateDataset(nextDataset, {
        source: "supabase",
        message,
      });
    });
  };

  const runMutation = async (url: string, options: RequestInit, successMessage: string) => {
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setSyncState({
      syncStatus: "loading",
      syncMessage: "서버에 변경 사항을 저장하는 중입니다.",
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
      const message = error instanceof Error ? error.message : "관리 작업에 실패했습니다.";
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
      applyDataset(nextDataset, "Supabase 기준 최신 상태로 새로고침했습니다.");
      setStatusMessage("Supabase 기준 최신 상태로 새로고침했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "새로고침에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const monitoring = {
      targetTickers: newsForm.monitoringTargetTickers
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      note: newsForm.monitoringNote.trim(),
      referencePrice: newsForm.monitoringReferencePrice.trim(),
      currentSnapshot: newsForm.monitoringCurrentSnapshot.trim(),
      triggerCondition: newsForm.monitoringTriggerCondition.trim(),
      nextCheckNote: newsForm.monitoringNextCheckNote.trim(),
    };

    const hasMonitoring = Object.values(monitoring).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );

    const payload = {
      contentType: newsForm.contentType,
      title: newsForm.title.trim(),
      summary: newsForm.summary.trim(),
      sourceName: newsForm.sourceName.trim(),
      sourceUrl: newsForm.sourceUrl.trim(),
      publishedAt: new Date(newsForm.publishedAt).toISOString(),
      scanSlot: newsForm.scanSlot,
      region: newsForm.region,
      affectedAssetClasses: newsForm.affectedAssetClasses,
      relatedThemeIds: newsForm.relatedThemeIds,
      relatedTickerIds: newsForm.relatedTickerIds,
      marketInterpretation: newsForm.marketInterpretation.trim(),
      directionalView: newsForm.directionalView,
      actionIdea: newsForm.actionIdea.trim(),
      followUpStatus: newsForm.followUpStatus,
      followUpNote: newsForm.followUpNote.trim(),
      importance: newsForm.importance,
      monitoring: hasMonitoring ? monitoring : undefined,
    };

    await runMutation(
      "/api/private/admin/news",
      {
        method: editingNewsId ? "PATCH" : "POST",
        body: JSON.stringify(editingNewsId ? { id: editingNewsId, ...payload } : payload),
      },
      editingNewsId ? "뉴스를 수정했습니다." : "뉴스를 등록했습니다.",
    );

    resetNewsForm();
  };

  const handleThemeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await runMutation(
      "/api/private/admin/themes",
      {
        method: "POST",
        body: JSON.stringify(themeForm),
      },
      "테마를 저장했습니다.",
    );

    setThemeForm(defaultThemeForm);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="관리 / 뉴스 운영"
        title="리서치 운영"
        description="권한이 확인된 관리자만 뉴스, 테마, 팔로업을 서버에 저장할 수 있습니다. 현재 화면의 저장, 수정, 삭제는 모두 private API를 통해 처리됩니다."
        meta={`뉴스 ${newsItems.length}건 · 테마 ${themes.length}개`}
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
          <Badge variant="outline">관리자 전용</Badge>
          <Badge variant="outline">서버 저장</Badge>
          <Badge variant="outline">Public write 차단</Badge>
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title={editingNewsId ? "뉴스 수정" : "뉴스 등록"}
          description="저장 즉시 서버에 기록되고, 성공하면 최신 Supabase 데이터셋으로 화면이 다시 동기화됩니다."
        >
          <form className="space-y-4" onSubmit={(event) => void handleNewsSubmit(event)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="콘텐츠 타입">
                <select
                  value={newsForm.contentType}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      contentType: event.target.value as NewsFormState["contentType"],
                    })
                  }
                  className="field"
                >
                  {CONTENT_TYPES.map((entry) => (
                    <option key={entry} value={entry}>
                      {contentTypeLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="제목">
                <input
                  required
                  value={newsForm.title}
                  onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })}
                  className="field"
                />
              </Field>
              <Field label="출처">
                <input
                  required
                  value={newsForm.sourceName}
                  onChange={(event) => setNewsForm({ ...newsForm, sourceName: event.target.value })}
                  className="field"
                />
              </Field>
              <Field label="출처 URL">
                <input
                  required
                  value={newsForm.sourceUrl}
                  onChange={(event) => setNewsForm({ ...newsForm, sourceUrl: event.target.value })}
                  className="field"
                />
              </Field>
              <Field label="발행 시각">
                <input
                  required
                  type="datetime-local"
                  value={newsForm.publishedAt}
                  onChange={(event) => setNewsForm({ ...newsForm, publishedAt: event.target.value })}
                  className="field"
                />
              </Field>
              <Field label="스캔 슬롯">
                <select
                  value={newsForm.scanSlot}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      scanSlot: event.target.value as NewsFormState["scanSlot"],
                    })
                  }
                  className="field"
                >
                  {SCAN_SLOTS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}:00
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="지역">
                <select
                  value={newsForm.region}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      region: event.target.value as NewsFormState["region"],
                    })
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
              <Field label="방향성">
                <select
                  value={newsForm.directionalView}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      directionalView: event.target.value as NewsFormState["directionalView"],
                    })
                  }
                  className="field"
                >
                  {DIRECTIONAL_VIEWS.map((entry) => (
                    <option key={entry} value={entry}>
                      {directionalLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="중요도">
                <select
                  value={newsForm.importance}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      importance: event.target.value as NewsFormState["importance"],
                    })
                  }
                  className="field"
                >
                  {IMPORTANCE_LEVELS.map((entry) => (
                    <option key={entry} value={entry}>
                      {importanceLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="팔로업 상태">
                <select
                  value={newsForm.followUpStatus}
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      followUpStatus: event.target.value as NewsFormState["followUpStatus"],
                    })
                  }
                  className="field"
                >
                  {FOLLOW_UP_STATUSES.map((entry) => (
                    <option key={entry} value={entry}>
                      {followUpLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="요약">
              <textarea
                required
                value={newsForm.summary}
                onChange={(event) => setNewsForm({ ...newsForm, summary: event.target.value })}
                className="field min-h-[110px]"
              />
            </Field>
            <Field label="시장 해석">
              <textarea
                required
                value={newsForm.marketInterpretation}
                onChange={(event) =>
                  setNewsForm({ ...newsForm, marketInterpretation: event.target.value })
                }
                className="field min-h-[110px]"
              />
            </Field>
            <Field label="액션 아이디어">
              <textarea
                required
                value={newsForm.actionIdea}
                onChange={(event) => setNewsForm({ ...newsForm, actionIdea: event.target.value })}
                className="field min-h-[110px]"
              />
            </Field>
            <Field label="팔로업 메모">
              <textarea
                value={newsForm.followUpNote}
                onChange={(event) => setNewsForm({ ...newsForm, followUpNote: event.target.value })}
                className="field min-h-[100px]"
              />
            </Field>

            {newsForm.contentType === "monitoring" ? (
              <div className="grid gap-4 rounded-[24px] border border-[var(--border-soft)] bg-[rgba(229,239,236,0.45)] p-4 md:grid-cols-2">
                <Field label="대상 티커">
                  <input
                    value={newsForm.monitoringTargetTickers}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringTargetTickers: event.target.value })
                    }
                    placeholder="NVDA, JEPQ"
                    className="field"
                  />
                </Field>
                <Field label="기준 가격">
                  <input
                    value={newsForm.monitoringReferencePrice}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringReferencePrice: event.target.value })
                    }
                    className="field"
                  />
                </Field>
                <Field label="메모">
                  <textarea
                    value={newsForm.monitoringNote}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringNote: event.target.value })
                    }
                    className="field min-h-[100px]"
                  />
                </Field>
                <Field label="현재 스냅샷">
                  <textarea
                    value={newsForm.monitoringCurrentSnapshot}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringCurrentSnapshot: event.target.value })
                    }
                    className="field min-h-[100px]"
                  />
                </Field>
                <Field label="트리거 조건">
                  <textarea
                    value={newsForm.monitoringTriggerCondition}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringTriggerCondition: event.target.value })
                    }
                    className="field min-h-[100px]"
                  />
                </Field>
                <Field label="다음 체크 메모">
                  <textarea
                    value={newsForm.monitoringNextCheckNote}
                    onChange={(event) =>
                      setNewsForm({ ...newsForm, monitoringNextCheckNote: event.target.value })
                    }
                    className="field min-h-[100px]"
                  />
                </Field>
              </div>
            ) : null}

            <TagSelector
              label="영향 자산군"
              options={ASSET_CLASSES.map((entry) => ({
                label: assetClassLabels[entry],
                value: entry,
              }))}
              values={newsForm.affectedAssetClasses}
              onToggle={(value) =>
                setNewsForm({
                  ...newsForm,
                  affectedAssetClasses: newsForm.affectedAssetClasses.includes(value as NewsItem["affectedAssetClasses"][number])
                    ? newsForm.affectedAssetClasses.filter((entry) => entry !== value)
                    : [...newsForm.affectedAssetClasses, value as NewsItem["affectedAssetClasses"][number]],
                })
              }
            />

            <TagSelector
              label="테마"
              options={themes.map((theme) => ({
                label: getDisplayTheme(theme).name,
                value: theme.id,
              }))}
              values={newsForm.relatedThemeIds}
              onToggle={(value) =>
                setNewsForm({
                  ...newsForm,
                  relatedThemeIds: newsForm.relatedThemeIds.includes(value)
                    ? newsForm.relatedThemeIds.filter((entry) => entry !== value)
                    : [...newsForm.relatedThemeIds, value],
                })
              }
            />

            <TagSelector
              label="티커"
              options={tickers.map((ticker) => ({
                label: ticker.symbol,
                value: ticker.id,
              }))}
              values={newsForm.relatedTickerIds}
              onToggle={(value) =>
                setNewsForm({
                  ...newsForm,
                  relatedTickerIds: newsForm.relatedTickerIds.includes(value)
                    ? newsForm.relatedTickerIds.filter((entry) => entry !== value)
                    : [...newsForm.relatedTickerIds, value],
                })
              }
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {editingNewsId ? "수정 저장" : "뉴스 등록"}
              </button>
              <button
                type="button"
                onClick={resetNewsForm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-60"
              >
                입력 초기화
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="테마 관리"
          description="테마는 관리자만 추가/삭제할 수 있으며, 서버 저장 후 즉시 최신 데이터로 갱신됩니다."
        >
          <form className="space-y-4" onSubmit={(event) => void handleThemeSubmit(event)}>
            <Field label="테마명">
              <input
                required
                value={themeForm.name}
                onChange={(event) => setThemeForm({ ...themeForm, name: event.target.value })}
                className="field"
              />
            </Field>
            <Field label="설명">
              <textarea
                required
                value={themeForm.description}
                onChange={(event) =>
                  setThemeForm({ ...themeForm, description: event.target.value })
                }
                className="field min-h-[110px]"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="카테고리">
                <select
                  value={themeForm.category}
                  onChange={(event) =>
                    setThemeForm({
                      ...themeForm,
                      category: event.target.value as ThemeFormState["category"],
                    })
                  }
                  className="field"
                >
                  {THEME_CATEGORIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {themeCategoryLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="우선순위">
                <select
                  value={themeForm.priority}
                  onChange={(event) =>
                    setThemeForm({
                      ...themeForm,
                      priority: event.target.value as ThemeFormState["priority"],
                    })
                  }
                  className="field"
                >
                  {IMPORTANCE_LEVELS.map((entry) => (
                    <option key={entry} value={entry}>
                      {importanceLabels[entry]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="색상">
              <input
                value={themeForm.color}
                onChange={(event) => setThemeForm({ ...themeForm, color: event.target.value })}
                className="field"
              />
            </Field>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              테마 저장
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className="flex items-start justify-between gap-3 rounded-[22px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.72)] p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{themeCategoryLabels[theme.category]}</Badge>
                    <Badge>{importanceLabels[theme.priority]}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-[var(--text-strong)]">
                    {getDisplayTheme(theme).name}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {getDisplayTheme(theme).description}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void runMutation(
                      "/api/private/admin/themes",
                      {
                        method: "DELETE",
                        body: JSON.stringify({ id: theme.id }),
                      },
                      "테마를 삭제했습니다.",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="기존 뉴스 목록"
        description="기록된 뉴스의 수정과 삭제도 모두 서버 권한 경로를 통해 처리됩니다."
      >
        <div className="space-y-4">
          {newsItems.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ContentTypeBadge value={item.contentType ?? "news"} />
                <ImportanceBadge value={item.importance} />
                <DirectionBadge value={item.directionalView} />
                <FollowUpBadge value={item.followUpStatus} />
                <Badge variant="outline">{item.scanSlot}:00</Badge>
                <Badge variant="outline">{regionLabels[item.region]}</Badge>
              </div>
              <h3 className="mt-4 font-[family:var(--font-display)] text-3xl leading-tight text-[var(--text-strong)]">
                {getDisplayNewsItem(item).title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                {getDisplayNewsItem(item).summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setEditingNewsId(item.id);
                    setNewsForm(mapNewsItemToForm(item));
                    setStatusMessage(null);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-60"
                >
                  <PencilLine className="h-4 w-4" />
                  수정
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    void runMutation(
                      "/api/private/admin/news",
                      {
                        method: "DELETE",
                        body: JSON.stringify({ id: item.id }),
                      },
                      "뉴스를 삭제했습니다.",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)] disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="팔로업 업데이트"
        description="기존 해석의 결과는 별도 서버 경로로 저장되며, 관련 뉴스 상태도 함께 갱신됩니다."
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(29,123,96,0.18)] bg-[rgba(29,123,96,0.06)] px-4 py-2 text-sm text-[#1d604f]">
          <ShieldCheck className="h-4 w-4" />
          관리자 세션이 확인된 요청만 저장됩니다.
        </div>
        <div className="space-y-4">
          {followUps.map((record) => {
            const sourceNews = newsItems.find((item) => item.id === record.newsItemId);

            if (!sourceNews) {
              return null;
            }

            return (
              <FollowUpOpsRow
                key={record.id}
                record={record}
                title={getDisplayNewsItem(sourceNews).title}
                disabled={isSubmitting}
                onSave={(nextStatus, nextNote) =>
                  runMutation(
                    "/api/private/admin/follow-ups",
                    {
                      method: "PATCH",
                      body: JSON.stringify({
                        newsItemId: record.newsItemId,
                        status: nextStatus,
                        resultNote: nextNote,
                      }),
                    },
                    "팔로업을 저장했습니다.",
                  )
                }
              />
            );
          })}
        </div>
      </SectionCard>
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

function TagSelector({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: Array<{ label: string; value: string }>;
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-transparent bg-[var(--text-strong)] text-white"
                  : "border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[rgba(23,42,70,0.05)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FollowUpOpsRow({
  record,
  title,
  disabled,
  onSave,
}: {
  record: FollowUpRecord;
  title: string;
  disabled: boolean;
  onSave: (status: (typeof FOLLOW_UP_STATUSES)[number], note: string) => Promise<void>;
}) {
  const [nextStatus, setNextStatus] = useState(record.status);
  const [nextNote, setNextNote] = useState(getDisplayFollowUp(record).resultNote);

  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-5">
      <h3 className="font-[family:var(--font-display)] text-3xl leading-tight text-[var(--text-strong)]">
        {title}
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_auto]">
        <select
          value={nextStatus}
          disabled={disabled}
          onChange={(event) =>
            setNextStatus(event.target.value as (typeof FOLLOW_UP_STATUSES)[number])
          }
          className="field"
        >
          {FOLLOW_UP_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {followUpLabels[entry]}
            </option>
          ))}
        </select>
        <textarea
          value={nextNote}
          disabled={disabled}
          onChange={(event) => setNextNote(event.target.value)}
          className="field min-h-[110px]"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onSave(nextStatus, nextNote)}
          className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          저장
        </button>
      </div>
    </div>
  );
}
