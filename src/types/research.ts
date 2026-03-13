export const SCAN_SLOTS = ["09", "13", "18", "22"] as const;
export const REGIONS = ["KR", "US", "GLOBAL"] as const;
export const ASSET_CLASSES = [
  "Equities",
  "Rates",
  "FX",
  "Commodities",
  "Crypto",
  "ETF",
] as const;
export const DIRECTIONAL_VIEWS = [
  "Bullish",
  "Bearish",
  "Neutral",
  "Mixed",
] as const;
export const FOLLOW_UP_STATUSES = [
  "Pending",
  "Correct",
  "Wrong",
  "Mixed",
] as const;
export const IMPORTANCE_LEVELS = [
  "Critical",
  "High",
  "Medium",
  "Low",
] as const;
export const PORTFOLIO_ASSET_TYPES = [
  "Stock",
  "ETF",
  "Bond",
  "Commodity",
  "Crypto",
  "FX",
  "Cash",
] as const;
export const THEME_CATEGORIES = [
  "Macro",
  "Sector",
  "Policy",
  "Risk",
  "Cross-Asset",
] as const;
export const PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export const NEWS_SORT_OPTIONS = [
  "latest",
  "importance",
  "followUp",
  "source",
] as const;
export const CONTENT_TYPES = ["news", "analysis", "opinion", "monitoring"] as const;

export type ScanSlot = (typeof SCAN_SLOTS)[number];
export type Region = (typeof REGIONS)[number];
export type AssetClass = (typeof ASSET_CLASSES)[number];
export type DirectionalView = (typeof DIRECTIONAL_VIEWS)[number];
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];
export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number];
export type PortfolioAssetType = (typeof PORTFOLIO_ASSET_TYPES)[number];
export type ThemeCategory = (typeof THEME_CATEGORIES)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];
export type NewsSortOption = (typeof NEWS_SORT_OPTIONS)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];

export type MonitoringMeta = {
  targetTickers?: string[];
  note?: string;
  referencePrice?: string;
  currentSnapshot?: string;
  triggerCondition?: string;
  nextCheckNote?: string;
};

export type Theme = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ThemeCategory;
  priority: PriorityLevel;
  color: string;
};

export type Ticker = {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  region: Region;
  assetClass: AssetClass;
  note: string;
};

export type NewsItem = {
  id: string;
  contentType?: ContentType;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  scanSlot: ScanSlot;
  region: Region;
  affectedAssetClasses: AssetClass[];
  relatedThemeIds: string[];
  relatedTickerIds: string[];
  marketInterpretation: string;
  directionalView: DirectionalView;
  actionIdea: string;
  followUpStatus: FollowUpStatus;
  followUpNote: string;
  importance: ImportanceLevel;
  monitoring?: MonitoringMeta;
  createdAt: string;
  updatedAt: string;
};

export type FollowUpRecord = {
  id: string;
  newsItemId: string;
  status: FollowUpStatus;
  resolvedAt: string | null;
  outcomeSummary: string;
  resultNote: string;
  marketImpact: string;
};

export type PortfolioItem = {
  id: string;
  symbol: string;
  assetName: string;
  assetType: PortfolioAssetType;
  region: Region;
  isHolding: boolean;
  isWatchlist: boolean;
  weight?: number;
  averageCost?: number;
  memo?: string;
  priority: PriorityLevel;
};

export type UserPreferences = {
  id: string;
  timezone: string;
  preferredSort: NewsSortOption;
  favoriteSlots: ScanSlot[];
  defaultRegions: Region[];
  interestThemeIds: string[];
  compactMode: boolean;
};

export type ResearchDataset = {
  themes: Theme[];
  tickers: Ticker[];
  newsItems: NewsItem[];
  followUps: FollowUpRecord[];
  portfolioItems: PortfolioItem[];
  preferences: UserPreferences;
};
