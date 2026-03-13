import { Badge } from "@/components/ui/badge";
import {
  contentTypeLabels,
  directionalLabels,
  followUpLabels,
  importanceLabels,
  regionLabels,
} from "@/lib/localize";
import type {
  ContentType,
  DirectionalView,
  FollowUpStatus,
  ImportanceLevel,
  Region,
  ScanSlot,
} from "@/types/research";

export function ImportanceBadge({ value }: { value: ImportanceLevel }) {
  const variantMap = {
    Critical: "critical",
    High: "high",
    Medium: "medium",
    Low: "low",
  } as const;

  return <Badge variant={variantMap[value]}>{importanceLabels[value]}</Badge>;
}

export function FollowUpBadge({ value }: { value: FollowUpStatus }) {
  const variantMap = {
    Pending: "pending",
    Correct: "bullish",
    Wrong: "bearish",
    Mixed: "mixed",
  } as const;

  return <Badge variant={variantMap[value]}>{followUpLabels[value]}</Badge>;
}

export function DirectionBadge({ value }: { value: DirectionalView }) {
  const variantMap = {
    Bullish: "bullish",
    Bearish: "bearish",
    Neutral: "outline",
    Mixed: "mixed",
  } as const;

  return <Badge variant={variantMap[value]}>{directionalLabels[value]}</Badge>;
}

export function SlotBadge({ value }: { value: ScanSlot }) {
  return <Badge variant="outline">{`${value}:00`}</Badge>;
}

export function RegionBadge({ value }: { value: Region }) {
  return <Badge>{regionLabels[value]}</Badge>;
}

export function ContentTypeBadge({ value }: { value: ContentType }) {
  const variantMap = {
    news: "outline",
    analysis: "high",
    opinion: "mixed",
    monitoring: "pending",
  } as const;

  return <Badge variant={variantMap[value]}>{contentTypeLabels[value]}</Badge>;
}
