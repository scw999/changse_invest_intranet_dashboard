"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { cloneMockDataset } from "@/lib/mock-data";
import type {
  FollowUpRecord,
  NewsItem,
  PortfolioItem,
  ResearchDataset,
  Theme,
  UserPreferences,
} from "@/types/research";

type NewsInput = Omit<NewsItem, "id" | "createdAt" | "updatedAt">;
type ThemeInput = Omit<Theme, "id" | "slug"> & { slug?: string };
type PortfolioInput = Omit<PortfolioItem, "id">;
type PreferencePatch = Partial<UserPreferences>;
type FollowUpInput = Omit<FollowUpRecord, "id">;

type ResearchActions = {
  addNewsItem: (input: NewsInput) => void;
  updateNewsItem: (id: string, patch: Partial<NewsInput>) => void;
  deleteNewsItem: (id: string) => void;
  addTheme: (input: ThemeInput) => void;
  updateTheme: (id: string, patch: Partial<ThemeInput>) => void;
  deleteTheme: (id: string) => void;
  addPortfolioItem: (input: PortfolioInput) => void;
  updatePortfolioItem: (id: string, patch: Partial<PortfolioInput>) => void;
  deletePortfolioItem: (id: string) => void;
  updatePreferences: (patch: PreferencePatch) => void;
  upsertFollowUp: (newsItemId: string, patch: Omit<FollowUpInput, "newsItemId">) => void;
  resetData: () => void;
};

export type ResearchStore = ResearchDataset & ResearchActions;

function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${uuid}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFollowUpRecord(
  newsItemId: string,
  item: Pick<NewsItem, "directionalView" | "followUpStatus" | "followUpNote">,
) {
  if (item.directionalView === "Neutral") {
    return null;
  }

  return {
    id: createId("follow"),
    newsItemId,
    status: item.followUpStatus,
    resolvedAt: item.followUpStatus === "Pending" ? null : new Date().toISOString(),
    outcomeSummary:
      item.followUpStatus === "Pending" ? "팔로업 검토 대기 상태입니다." : "결과 검토를 완료했습니다.",
    resultNote: item.followUpNote || "새 전망 기록에서 생성된 기본 메모입니다.",
    marketImpact:
      item.followUpStatus === "Pending" ? "결과 확인 대기 중입니다." : "결과 검토를 완료했습니다.",
  };
}

export const useResearchStore = create<ResearchStore>()(
  persist(
    (set) => ({
      ...cloneMockDataset(),
      addNewsItem: (input) =>
        set((state) => {
          const timestamp = new Date().toISOString();
          const id = createId("news");
          const nextItem: NewsItem = {
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...input,
          };

          const pendingFollowUp = buildFollowUpRecord(id, input);

          return {
            newsItems: [nextItem, ...state.newsItems],
            followUps: pendingFollowUp
              ? [pendingFollowUp, ...state.followUps]
              : state.followUps,
          };
        }),
      updateNewsItem: (id, patch) =>
        set((state) => ({
          newsItems: state.newsItems.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
          ),
        })),
      deleteNewsItem: (id) =>
        set((state) => ({
          newsItems: state.newsItems.filter((item) => item.id !== id),
          followUps: state.followUps.filter((record) => record.newsItemId !== id),
        })),
      addTheme: (input) =>
        set((state) => ({
          themes: [
            {
              id: createId("theme"),
              slug: slugify(input.slug ?? input.name),
              ...input,
            },
            ...state.themes,
          ],
        })),
      updateTheme: (id, patch) =>
        set((state) => ({
          themes: state.themes.map((theme) =>
            theme.id === id
              ? {
                  ...theme,
                  ...patch,
                  slug: slugify(patch.slug ?? patch.name ?? theme.name),
                }
              : theme,
          ),
        })),
      deleteTheme: (id) =>
        set((state) => ({
          themes: state.themes.filter((theme) => theme.id !== id),
          newsItems: state.newsItems.map((item) => ({
            ...item,
            relatedThemeIds: item.relatedThemeIds.filter((themeId) => themeId !== id),
          })),
          preferences: {
            ...state.preferences,
            interestThemeIds: state.preferences.interestThemeIds.filter(
              (themeId) => themeId !== id,
            ),
          },
        })),
      addPortfolioItem: (input) =>
        set((state) => ({
          portfolioItems: [{ id: createId("portfolio"), ...input }, ...state.portfolioItems],
        })),
      updatePortfolioItem: (id, patch) =>
        set((state) => ({
          portfolioItems: state.portfolioItems.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      deletePortfolioItem: (id) =>
        set((state) => ({
          portfolioItems: state.portfolioItems.filter((item) => item.id !== id),
        })),
      updatePreferences: (patch) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...patch,
          },
        })),
      upsertFollowUp: (newsItemId, patch) =>
        set((state) => {
          const existing = state.followUps.find((record) => record.newsItemId === newsItemId);

          const nextFollowUps = existing
            ? state.followUps.map((record) =>
                record.newsItemId === newsItemId ? { ...record, ...patch } : record,
              )
            : [
                {
                  id: createId("follow"),
                  newsItemId,
                  ...patch,
                },
                ...state.followUps,
              ];

          return {
            followUps: nextFollowUps,
            newsItems: state.newsItems.map((item) =>
              item.id === newsItemId
                ? {
                    ...item,
                    followUpStatus: patch.status,
                    followUpNote: patch.resultNote,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        }),
      resetData: () => set(() => cloneMockDataset()),
    }),
    {
      name: "changse-invest-research-mvp",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
