import type {
  AssetClass,
  DirectionalView,
  FollowUpStatus,
  ImportanceLevel,
  NewsSortOption,
  PortfolioAssetType,
  PriorityLevel,
  Region,
  ThemeCategory,
} from "@/types/research";

export const regionLabels: Record<Region, string> = {
  KR: "한국",
  US: "미국",
  GLOBAL: "글로벌",
};

export const importanceLabels: Record<ImportanceLevel, string> = {
  Critical: "핵심",
  High: "높음",
  Medium: "보통",
  Low: "낮음",
};

export const priorityLabels: Record<PriorityLevel, string> = {
  Critical: "핵심",
  High: "높음",
  Medium: "보통",
  Low: "낮음",
};

export const followUpLabels: Record<FollowUpStatus, string> = {
  Pending: "대기",
  Correct: "적중",
  Wrong: "오판",
  Mixed: "혼합",
};

export const directionalLabels: Record<DirectionalView, string> = {
  Bullish: "상방",
  Bearish: "하방",
  Neutral: "중립",
  Mixed: "혼합",
};

export const assetClassLabels: Record<AssetClass, string> = {
  Equities: "주식",
  Rates: "금리",
  FX: "환율",
  Commodities: "원자재",
  Crypto: "가상자산",
  ETF: "ETF",
};

export const portfolioAssetTypeLabels: Record<PortfolioAssetType, string> = {
  Stock: "주식",
  ETF: "ETF",
  Bond: "채권",
  Commodity: "원자재",
  Crypto: "가상자산",
  FX: "환율",
  Cash: "현금",
};

export const themeCategoryLabels: Record<ThemeCategory, string> = {
  Macro: "매크로",
  Sector: "섹터",
  Policy: "정책",
  Risk: "리스크",
  "Cross-Asset": "크로스에셋",
};

export const newsSortLabels: Record<NewsSortOption, string> = {
  latest: "최신순",
  importance: "중요도순",
  followUp: "팔로업순",
  source: "출처순",
};
