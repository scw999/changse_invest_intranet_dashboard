"use client";

import { useState } from "react";
import { PencilLine, RotateCcw, Save, Trash2 } from "lucide-react";

import { PageIntro } from "@/components/layout/page-intro";
import {
  getDisplayFollowUp,
  getDisplayNewsItem,
  getDisplayTheme,
} from "@/lib/content-kr";
import {
  DirectionBadge,
  FollowUpBadge,
  ImportanceBadge,
} from "@/components/research/research-badges";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import {
  assetClassLabels,
  directionalLabels,
  followUpLabels,
  importanceLabels,
  regionLabels,
  themeCategoryLabels,
} from "@/lib/localize";
import { useResearchStore } from "@/lib/store/research-store";
import {
  ASSET_CLASSES,
  DIRECTIONAL_VIEWS,
  FOLLOW_UP_STATUSES,
  IMPORTANCE_LEVELS,
  REGIONS,
  SCAN_SLOTS,
  THEME_CATEGORIES,
  type NewsItem,
  type Theme,
} from "@/types/research";

type NewsFormState = {
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scanSlot: (typeof SCAN_SLOTS)[number];
  region: (typeof REGIONS)[number];
  affectedAssetClasses: string[];
  relatedThemeIds: string[];
  relatedTickerIds: string[];
  marketInterpretation: string;
  directionalView: (typeof DIRECTIONAL_VIEWS)[number];
  actionIdea: string;
  followUpStatus: (typeof FOLLOW_UP_STATUSES)[number];
  followUpNote: string;
  importance: (typeof IMPORTANCE_LEVELS)[number];
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
  };
}

function mapNewsItemToForm(item: NewsItem): NewsFormState {
  const displayItem = getDisplayNewsItem(item);

  return {
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
  };
}

export function AdminPage() {
  const dataset = useResearchStore((state) => state);
  const addNewsItem = useResearchStore((state) => state.addNewsItem);
  const updateNewsItem = useResearchStore((state) => state.updateNewsItem);
  const deleteNewsItem = useResearchStore((state) => state.deleteNewsItem);
  const addTheme = useResearchStore((state) => state.addTheme);
  const deleteTheme = useResearchStore((state) => state.deleteTheme);
  const upsertFollowUp = useResearchStore((state) => state.upsertFollowUp);
  const resetData = useResearchStore((state) => state.resetData);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsForm, setNewsForm] = useState<NewsFormState>(getDefaultNewsForm());
  const [themeForm, setThemeForm] = useState<ThemeFormState>(defaultThemeForm);

  const resetNewsForm = () => {
    setEditingNewsId(null);
    setNewsForm(getDefaultNewsForm());
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="관리 / 뉴스 운영"
        title="리서치 운영"
        description="과도하게 복잡하게 만들지 않고도 수기 뉴스 등록, 태그 정리, 팔로업 결과 갱신이 가능하도록 구성한 운영 화면입니다."
        meta={`뉴스 ${dataset.newsItems.length}건 · 테마 ${dataset.themes.length}개`}
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              resetData();
              resetNewsForm();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
          >
            <RotateCcw className="h-4 w-4" />
            시드 데이터 초기화
          </button>
          <Badge variant="outline">수기 뉴스 등록</Badge>
          <Badge variant="outline">태그 정리</Badge>
          <Badge variant="outline">팔로업 업데이트</Badge>
        </div>
      </PageIntro>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title={editingNewsId ? "뉴스 수정" : "뉴스 등록"}
          description="변경 내용은 브라우저 저장소에 바로 반영되므로 MVP 단계에서도 즉시 운영할 수 있습니다."
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();

              const payload = {
                title: newsForm.title.trim(),
                summary: newsForm.summary.trim(),
                sourceName: newsForm.sourceName.trim(),
                sourceUrl: newsForm.sourceUrl.trim(),
                publishedAt: new Date(newsForm.publishedAt).toISOString(),
                scanSlot: newsForm.scanSlot,
                region: newsForm.region,
                affectedAssetClasses:
                  newsForm.affectedAssetClasses as NewsItem["affectedAssetClasses"],
                relatedThemeIds: newsForm.relatedThemeIds,
                relatedTickerIds: newsForm.relatedTickerIds,
                marketInterpretation: newsForm.marketInterpretation.trim(),
                directionalView: newsForm.directionalView,
                actionIdea: newsForm.actionIdea.trim(),
                followUpStatus: newsForm.followUpStatus,
                followUpNote: newsForm.followUpNote.trim(),
                importance: newsForm.importance,
              };

              if (editingNewsId) {
                updateNewsItem(editingNewsId, payload);
              } else {
                addNewsItem(payload);
              }

              if (editingNewsId && newsForm.directionalView !== "Neutral") {
                upsertFollowUp(editingNewsId, {
                  status: newsForm.followUpStatus,
                  resolvedAt:
                    newsForm.followUpStatus === "Pending" ? null : new Date().toISOString(),
                  outcomeSummary:
                    newsForm.followUpStatus === "Pending"
                      ? "팔로업 검토 대기 상태입니다."
                      : "뉴스 운영 화면에서 결과를 갱신했습니다.",
                  resultNote:
                    newsForm.followUpNote.trim() || "뉴스 운영 화면에서 결과 메모를 갱신했습니다.",
                  marketImpact:
                    newsForm.followUpStatus === "Pending"
                      ? "결과 확인 대기 중입니다."
                      : "결과 검토를 완료했습니다.",
                });
              }

              resetNewsForm();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
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
                  onChange={(event) =>
                    setNewsForm({ ...newsForm, sourceName: event.target.value })
                  }
                  className="field"
                />
              </Field>
              <Field label="출처 URL">
                <input
                  required
                  value={newsForm.sourceUrl}
                  onChange={(event) =>
                    setNewsForm({ ...newsForm, sourceUrl: event.target.value })
                  }
                  className="field"
                />
              </Field>
              <Field label="발행 시각">
                <input
                  required
                  type="datetime-local"
                  value={newsForm.publishedAt}
                  onChange={(event) =>
                    setNewsForm({ ...newsForm, publishedAt: event.target.value })
                  }
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
            <Field label="대응 아이디어">
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
                onChange={(event) =>
                  setNewsForm({ ...newsForm, followUpNote: event.target.value })
                }
                className="field min-h-[100px]"
              />
            </Field>

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
                  affectedAssetClasses: newsForm.affectedAssetClasses.includes(value)
                    ? newsForm.affectedAssetClasses.filter((entry) => entry !== value)
                    : [...newsForm.affectedAssetClasses, value],
                })
              }
            />

            <TagSelector
              label="테마"
              options={dataset.themes.map((theme) => ({
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
              options={dataset.tickers.map((ticker) => ({
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
                className="inline-flex items-center gap-2 rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Save className="h-4 w-4" />
                {editingNewsId ? "변경 저장" : "뉴스 등록"}
              </button>
              <button
                type="button"
                onClick={resetNewsForm}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
              >
                폼 초기화
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="테마 관리"
          description="별도 도구 없이 테마를 추가하거나 삭제할 수 있습니다."
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              addTheme(themeForm);
              setThemeForm(defaultThemeForm);
            }}
          >
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
            <Field label="포인트 컬러">
              <input
                value={themeForm.color}
                onChange={(event) => setThemeForm({ ...themeForm, color: event.target.value })}
                className="field"
              />
            </Field>
            <button
              type="submit"
              className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              테마 추가
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {dataset.themes.map((theme) => (
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
                  onClick={() => deleteTheme(theme.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)]"
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
        description="이미 저장된 뉴스 항목을 수정하거나 삭제할 수 있습니다."
      >
        <div className="space-y-4">
          {dataset.newsItems.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() => {
                    setEditingNewsId(item.id);
                    setNewsForm(mapNewsItemToForm(item));
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]"
                >
                  <PencilLine className="h-4 w-4" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => deleteNewsItem(item.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(140,45,45,0.2)] px-4 py-2 text-sm font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)]"
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
        description="기존 해석의 결과가 드러나면 상태와 메모를 바로 갱신할 수 있습니다."
      >
        <div className="space-y-4">
          {dataset.followUps.map((record) => {
            const sourceNews = dataset.newsItems.find((item) => item.id === record.newsItemId);

            if (!sourceNews) {
              return null;
            }

            return (
              <FollowUpOpsRow
                key={record.id}
                title={getDisplayNewsItem(sourceNews).title}
                status={record.status}
                note={getDisplayFollowUp(record).resultNote}
                onSave={(nextStatus, nextNote) =>
                  upsertFollowUp(record.newsItemId, {
                    status: nextStatus,
                    resolvedAt: nextStatus === "Pending" ? null : new Date().toISOString(),
                    outcomeSummary: record.outcomeSummary,
                    resultNote: nextNote,
                    marketImpact: record.marketImpact,
                  })
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
  title,
  status,
  note,
  onSave,
}: {
  title: string;
  status: (typeof FOLLOW_UP_STATUSES)[number];
  note: string;
  onSave: (status: (typeof FOLLOW_UP_STATUSES)[number], note: string) => void;
}) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextNote, setNextNote] = useState(note);

  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.82)] p-5">
      <h3 className="font-[family:var(--font-display)] text-3xl leading-tight text-[var(--text-strong)]">
        {title}
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_auto]">
        <select
          value={nextStatus}
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
          onChange={(event) => setNextNote(event.target.value)}
          className="field min-h-[110px]"
        />
        <button
          type="button"
          onClick={() => onSave(nextStatus, nextNote)}
          className="rounded-full bg-[var(--text-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          저장
        </button>
      </div>
    </div>
  );
}
