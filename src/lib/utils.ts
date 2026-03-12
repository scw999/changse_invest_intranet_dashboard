import { format, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type {
  FollowUpStatus,
  ImportanceLevel,
  NewsItem,
  PriorityLevel,
} from "@/types/research";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPublishedAt(value: string) {
  return format(parseISO(value), "M월 d일 HH:mm", { locale: ko });
}

export function formatCalendarDate(value: string) {
  return format(parseISO(value), "M월 d일 (EEE)", { locale: ko });
}

export function formatLongDate(value: string) {
  return format(parseISO(value), "yyyy년 M월 d일", { locale: ko });
}

export function toDateKey(value: string) {
  return format(parseISO(value), "yyyy-MM-dd");
}

export function isSameDate(left: string, right: string) {
  return isSameDay(parseISO(left), parseISO(right));
}

export function compareImportance(
  left: ImportanceLevel | PriorityLevel,
  right: ImportanceLevel | PriorityLevel,
) {
  return priorityScore(right) - priorityScore(left);
}

export function priorityScore(
  value: ImportanceLevel | PriorityLevel | FollowUpStatus,
) {
  const scores = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
    Pending: 4,
    Mixed: 3,
    Correct: 2,
    Wrong: 1,
  } as const;

  return scores[value] ?? 0;
}

export function sortNewsItems(newsItems: NewsItem[], sortBy: string) {
  return [...newsItems].sort((left, right) => {
    if (sortBy === "importance") {
      return compareImportance(left.importance, right.importance);
    }

    if (sortBy === "followUp") {
      return priorityScore(right.followUpStatus) - priorityScore(left.followUpStatus);
    }

    if (sortBy === "source") {
      return left.sourceName.localeCompare(right.sourceName);
    }

    return (
      parseISO(right.publishedAt).getTime() - parseISO(left.publishedAt).getTime()
    );
  });
}
