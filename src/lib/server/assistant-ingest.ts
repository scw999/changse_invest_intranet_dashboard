import "server-only";

import { z } from "zod";

import {
  ASSET_CLASSES,
  CONTENT_TYPES,
  DIRECTIONAL_VIEWS,
  FOLLOW_UP_STATUSES,
  IMAGE_PLACEMENTS,
  IMPORTANCE_LEVELS,
  NEWS_SORT_OPTIONS,
  PORTFOLIO_ASSET_TYPES,
  PRIORITY_LEVELS,
  REGIONS,
  SCAN_SLOTS,
  THEME_CATEGORIES,
} from "@/types/research";

const scanSlotAliasMap: Record<string, string> = {
  "09": "09",
  "9": "09",
  morning: "09",
  am: "09",
  오전: "09",
  아침: "09",
  "13": "13",
  noon: "13",
  midday: "13",
  점심: "13",
  "18": "18",
  evening: "18",
  오후: "18",
  저녁: "18",
  "22": "22",
  night: "22",
  야간: "22",
  밤: "22",
};

const regionAliasMap: Record<string, string> = {
  kr: "KR",
  korea: "KR",
  southkorea: "KR",
  한국: "KR",
  국내: "KR",
  us: "US",
  usa: "US",
  america: "US",
  미국: "US",
  global: "GLOBAL",
  worldwide: "GLOBAL",
  world: "GLOBAL",
  글로벌: "GLOBAL",
  전세계: "GLOBAL",
};

const assetClassAliasMap: Record<string, string> = {
  equities: "Equities",
  equity: "Equities",
  stock: "Equities",
  stocks: "Equities",
  주식: "Equities",
  rates: "Rates",
  금리: "Rates",
  fx: "FX",
  forex: "FX",
  환율: "FX",
  외환: "FX",
  commodities: "Commodities",
  commodity: "Commodities",
  원자재: "Commodities",
  crypto: "Crypto",
  coin: "Crypto",
  가상자산: "Crypto",
  암호화폐: "Crypto",
  etf: "ETF",
};

const directionalViewAliasMap: Record<string, string> = {
  bullish: "Bullish",
  buy: "Bullish",
  long: "Bullish",
  상승: "Bullish",
  강세: "Bullish",
  bearish: "Bearish",
  sell: "Bearish",
  short: "Bearish",
  하락: "Bearish",
  약세: "Bearish",
  neutral: "Neutral",
  중립: "Neutral",
  mixed: "Mixed",
  혼합: "Mixed",
  엇갈림: "Mixed",
};

const followUpStatusAliasMap: Record<string, string> = {
  pending: "Pending",
  대기: "Pending",
  보류: "Pending",
  correct: "Correct",
  right: "Correct",
  적중: "Correct",
  맞음: "Correct",
  wrong: "Wrong",
  incorrect: "Wrong",
  오판: "Wrong",
  틀림: "Wrong",
  mixed: "Mixed",
  혼합: "Mixed",
};

const importanceAliasMap: Record<string, string> = {
  critical: "Critical",
  최상: "Critical",
  매우높음: "Critical",
  high: "High",
  높음: "High",
  중요: "High",
  medium: "Medium",
  보통: "Medium",
  중간: "Medium",
  low: "Low",
  낮음: "Low",
};

const portfolioAssetTypeAliasMap: Record<string, string> = {
  stock: "Stock",
  주식: "Stock",
  etf: "ETF",
  bond: "Bond",
  채권: "Bond",
  commodity: "Commodity",
  원자재: "Commodity",
  crypto: "Crypto",
  coin: "Crypto",
  fx: "FX",
  cash: "Cash",
  현금: "Cash",
};

const themeCategoryAliasMap: Record<string, string> = {
  macro: "Macro",
  거시: "Macro",
  sector: "Sector",
  섹터: "Sector",
  업종: "Sector",
  policy: "Policy",
  정책: "Policy",
  risk: "Risk",
  리스크: "Risk",
  crossasset: "Cross-Asset",
  "cross-asset": "Cross-Asset",
  자산배분: "Cross-Asset",
};

const sortAliasMap: Record<string, string> = {
  latest: "latest",
  newest: "latest",
  최신: "latest",
  importance: "importance",
  중요도: "importance",
  followup: "followUp",
  "follow-up": "followUp",
  팔로업: "followUp",
  source: "source",
  출처: "source",
};

const tickerSymbolAliasMap: Record<string, string> = {
  삼전: "005930.KS",
  삼성전자: "005930.KS",
  하이닉스: "000660.KS",
  sk하이닉스: "000660.KS",
  엔비디아: "NVDA",
  테슬라: "TSLA",
  애플: "AAPL",
  마이크로소프트: "MSFT",
  마소: "MSFT",
  알파벳: "GOOGL",
  구글: "GOOGL",
  아마존: "AMZN",
  메타: "META",
  한화에어로스페이스: "012450.KS",
};

function cleanKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "").replace(/\./g, "");
}

function normalizeTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return value;
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = cleanKey(value);
    if (["true", "yes", "y", "1", "보유", "추가", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "0", "해제", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[%,$\s]/g, "");
    if (!normalized) {
      return undefined;
    }

    const next = Number(normalized);
    return Number.isFinite(next) ? next : value;
  }

  return value;
}

function normalizeEnumValue<T extends readonly string[]>(
  value: unknown,
  map: Record<string, string>,
  allowedValues: T,
) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const byAlias = map[cleanKey(trimmed)];
  if (byAlias) {
    return byAlias;
  }

  const exact = allowedValues.find((candidate) => candidate.toLowerCase() === trimmed.toLowerCase());
  return exact ?? trimmed;
}

function normalizeEnumArray<T extends readonly string[]>(
  value: unknown,
  map: Record<string, string>,
  allowedValues: T,
) {
  return normalizeStringArray(value)
    .map((item) => normalizeEnumValue(item, map, allowedValues))
    .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function normalizeTickerSymbol(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const aliased = tickerSymbolAliasMap[cleanKey(trimmed)] ?? trimmed;
  return aliased.toUpperCase();
}

const textField = z.preprocess(normalizeTrimmedText, z.string().min(1));
const optionalTextField = z.preprocess(normalizeNullableText, z.string().optional());
const commonIdField = z.preprocess(normalizeTrimmedText, z.string().min(1));

const imageAttachmentSchema = z.object({
  filename: z.preprocess(normalizeTrimmedText, z.string().min(1)),
  contentType: z.preprocess(normalizeTrimmedText, z.string().min(1)),
  caption: optionalTextField,
  alt: optionalTextField,
  order: z.preprocess(normalizeNumber, z.number().int().nonnegative().default(0)),
  placement: z.preprocess(
    (value) => normalizeEnumValue(value, { gallery: "gallery", inline: "inline" }, IMAGE_PLACEMENTS),
    z.enum(IMAGE_PLACEMENTS).default("gallery"),
  ),
  anchorKey: optionalTextField,
  bufferBase64: z.preprocess(normalizeTrimmedText, z.string().min(1)),
});

export type ImageIngestInput = z.infer<typeof imageAttachmentSchema>;

const imageOperationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    filename: z.preprocess(normalizeTrimmedText, z.string().min(1)),
    contentType: z.preprocess(normalizeTrimmedText, z.string().min(1)),
    caption: optionalTextField,
    alt: optionalTextField,
    order: z.preprocess(normalizeNumber, z.number().int().nonnegative().default(0)),
    placement: z.preprocess(
      (value) => normalizeEnumValue(value, { gallery: "gallery", inline: "inline" }, IMAGE_PLACEMENTS),
      z.enum(IMAGE_PLACEMENTS).default("gallery"),
    ),
    anchorKey: optionalTextField,
    bufferBase64: z.preprocess(normalizeTrimmedText, z.string().min(1)),
  }),
  z.object({
    action: z.literal("update"),
    imageId: z.preprocess(normalizeTrimmedText, z.string().min(1)),
    caption: optionalTextField,
    alt: optionalTextField,
    order: z.preprocess(normalizeNumber, z.number().int().nonnegative().optional()),
    placement: z.preprocess(
      (value) => normalizeEnumValue(value, { gallery: "gallery", inline: "inline" }, IMAGE_PLACEMENTS),
      z.enum(IMAGE_PLACEMENTS).optional(),
    ),
    anchorKey: optionalTextField,
  }),
  z.object({
    action: z.literal("delete"),
    imageId: z.preprocess(normalizeTrimmedText, z.string().min(1)),
  }),
]);

export type ImageOperationInput = z.infer<typeof imageOperationSchema>;

const scanSlotField = z.preprocess(
  (value) => normalizeEnumValue(value, scanSlotAliasMap, SCAN_SLOTS),
  z.enum(SCAN_SLOTS),
);
const regionField = z.preprocess(
  (value) => normalizeEnumValue(value, regionAliasMap, REGIONS),
  z.enum(REGIONS),
);
const assetClassField = z.preprocess(
  (value) => normalizeEnumValue(value, assetClassAliasMap, ASSET_CLASSES),
  z.enum(ASSET_CLASSES),
);
const assetClassArrayField = z.preprocess(
  (value) => normalizeEnumArray(value, assetClassAliasMap, ASSET_CLASSES),
  z.array(z.enum(ASSET_CLASSES)).min(1),
);
const directionalViewField = z.preprocess(
  (value) => normalizeEnumValue(value, directionalViewAliasMap, DIRECTIONAL_VIEWS),
  z.enum(DIRECTIONAL_VIEWS),
);
const followUpStatusField = z.preprocess(
  (value) => normalizeEnumValue(value, followUpStatusAliasMap, FOLLOW_UP_STATUSES),
  z.enum(FOLLOW_UP_STATUSES),
);
const importanceField = z.preprocess(
  (value) => normalizeEnumValue(value, importanceAliasMap, IMPORTANCE_LEVELS),
  z.enum(IMPORTANCE_LEVELS),
);
const contentTypeField = z.preprocess(
  (value) => normalizeEnumValue(value, {}, CONTENT_TYPES),
  z.enum(CONTENT_TYPES),
);
const priorityField = z.preprocess(
  (value) => normalizeEnumValue(value, importanceAliasMap, PRIORITY_LEVELS),
  z.enum(PRIORITY_LEVELS),
);
const portfolioAssetTypeField = z.preprocess(
  (value) => normalizeEnumValue(value, portfolioAssetTypeAliasMap, PORTFOLIO_ASSET_TYPES),
  z.enum(PORTFOLIO_ASSET_TYPES),
);
const themeCategoryField = z.preprocess(
  (value) => normalizeEnumValue(value, themeCategoryAliasMap, THEME_CATEGORIES),
  z.enum(THEME_CATEGORIES),
);
const newsSortField = z.preprocess(
  (value) => normalizeEnumValue(value, sortAliasMap, NEWS_SORT_OPTIONS),
  z.enum(NEWS_SORT_OPTIONS),
);

const placementField = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const lower = value.trim().toLowerCase();
  if (lower === "inline") return "inline";
  if (lower === "gallery") return "gallery";
  return value;
}, z.enum(["gallery", "inline"]).optional());

// Anchor keys flow through as plain optional strings here. The server-side
// resolver in news-images.ts is the single point of truth for normalization
// and validation, so we don't double-up the rules.
const anchorKeyField = optionalTextField;

const imageInputSchema = z.object({
  filename: optionalTextField,
  contentType: optionalTextField,
  caption: optionalTextField,
  alt: optionalTextField,
  order: z.preprocess(normalizeNumber, z.number().int().optional()),
  isCover: z.preprocess(normalizeBoolean, z.boolean().optional()),
  bufferBase64: optionalTextField,
  url: optionalTextField,
  placement: placementField,
  anchorKey: anchorKeyField,
});

const imageUpdateSchema = z.object({
  imageId: commonIdField,
  caption: optionalTextField,
  alt: optionalTextField,
  order: z.preprocess(normalizeNumber, z.number().int().optional()),
  isCover: z.preprocess(normalizeBoolean, z.boolean().optional()),
  placement: placementField,
  // Allow explicit null so admins can clear an anchor key.
  anchorKey: z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }
    return value;
  }, z.union([z.string(), z.null()]).optional()),
});

const imageReorderSchema = z.object({
  imageId: commonIdField,
  order: z.preprocess(normalizeNumber, z.number().int()),
});

const imageOperationsSchema = z
  .object({
    add: z.array(imageInputSchema).optional(),
    update: z.array(imageUpdateSchema).optional(),
    reorder: z.array(imageReorderSchema).optional(),
    delete: z.preprocess(normalizeStringArray, z.array(z.string()).optional()),
    replaceAll: z.preprocess(normalizeBoolean, z.boolean().optional()),
  })
  .optional();

const upsertNewsBaseSchema = z.object({
  operation: z.literal("upsert"),
  id: commonIdField.optional(),
  contentType: contentTypeField.default("news"),
  title: textField.optional(),
  summary: textField.optional(),
  sourceName: textField.optional(),
  sourceUrl: z.preprocess(normalizeTrimmedText, z.string().url()).optional(),
  publishedAt: z
    .preprocess(normalizeTrimmedText, z.string().datetime({ offset: true }))
    .optional(),
  scanSlot: scanSlotField.optional(),
  region: regionField.optional(),
  affectedAssetClasses: assetClassArrayField.optional(),
  relatedThemeIds: z.preprocess(normalizeStringArray, z.array(z.string()).default([])),
  relatedTickerIds: z.preprocess(normalizeStringArray, z.array(z.string()).default([])),
  marketInterpretation: textField.optional(),
  directionalView: directionalViewField.optional(),
  actionIdea: textField.optional(),
  followUpStatus: followUpStatusField.optional(),
  followUpNote: z.preprocess(normalizeTrimmedText, z.string()).optional(),
  importance: importanceField.optional(),
  monitoring: z
    .object({
      targetTickers: z.preprocess(normalizeStringArray, z.array(z.string()).optional()),
      note: optionalTextField,
      referencePrice: optionalTextField,
      currentSnapshot: optionalTextField,
      triggerCondition: optionalTextField,
      nextCheckNote: optionalTextField,
    })
    .optional(),
  images: z.array(imageInputSchema).optional(),
  imageOperations: imageOperationsSchema,
});

const REQUIRED_NEWS_CREATE_FIELDS = [
  "title",
  "summary",
  "sourceName",
  "sourceUrl",
  "publishedAt",
  "scanSlot",
  "region",
  "affectedAssetClasses",
  "marketInterpretation",
  "directionalView",
  "actionIdea",
  "followUpStatus",
  "importance",
] as const;

const upsertNewsSchema = upsertNewsBaseSchema.superRefine((value, ctx) => {
  if (value.id) {
    return;
  }

  for (const field of REQUIRED_NEWS_CREATE_FIELDS) {
    const candidate = (value as Record<string, unknown>)[field];
    const isMissing =
      candidate === undefined ||
      candidate === null ||
      (typeof candidate === "string" && candidate.trim().length === 0) ||
      (Array.isArray(candidate) && candidate.length === 0);

    if (isMissing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is required when creating a news item.`,
      });
    }
  }
});

const deleteNewsSchema = z.object({
  operation: z.literal("delete"),
  id: commonIdField,
});

export const internalNewsIngestSchema = z.union([upsertNewsSchema, deleteNewsSchema]);

export const internalFollowUpIngestSchema = z.object({
  newsItemId: commonIdField,
  status: followUpStatusField,
  resultNote: z.preprocess(normalizeTrimmedText, z.string()),
});

export const internalPortfolioIngestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("upsert_item"),
    id: commonIdField.optional(),
    symbol: z.preprocess(normalizeTickerSymbol, z.string().min(1)),
    assetName: textField,
    assetType: portfolioAssetTypeField,
    region: regionField,
    isHolding: z.preprocess(normalizeBoolean, z.boolean()),
    isWatchlist: z.preprocess(normalizeBoolean, z.boolean()),
    weight: z.preprocess(normalizeNumber, z.number().min(0).max(100).optional()),
    averageCost: z.preprocess(normalizeNumber, z.number().nonnegative().optional()),
    memo: optionalTextField,
    priority: priorityField,
  }),
  z.object({
    operation: z.literal("delete_item"),
    id: commonIdField,
  }),
  z.object({
    operation: z.literal("update_preferences"),
    preferences: z.object({
      timezone: optionalTextField,
      preferredSort: newsSortField.optional(),
      favoriteSlots: z.preprocess(
        (value) => normalizeEnumArray(value, scanSlotAliasMap, SCAN_SLOTS),
        z.array(z.enum(SCAN_SLOTS)).optional(),
      ),
      defaultRegions: z.preprocess(
        (value) => normalizeEnumArray(value, regionAliasMap, REGIONS),
        z.array(z.enum(REGIONS)).optional(),
      ),
      interestThemeIds: z.preprocess(normalizeStringArray, z.array(z.string()).optional()),
      compactMode: z.preprocess(normalizeBoolean, z.boolean().optional()),
    }),
  }),
]);

export const internalTickerIngestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("upsert"),
    id: commonIdField.optional(),
    symbol: z.preprocess(normalizeTickerSymbol, z.string().min(1)),
    name: textField,
    exchange: textField,
    region: regionField,
    assetClass: assetClassField,
    note: z.preprocess(normalizeTrimmedText, z.string()),
  }),
  z.object({
    operation: z.literal("delete"),
    id: commonIdField,
  }),
]);

export const internalThemeIngestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("upsert"),
    id: commonIdField.optional(),
    slug: optionalTextField,
    name: textField,
    description: z.preprocess(normalizeTrimmedText, z.string()),
    category: themeCategoryField,
    priority: priorityField,
    color: z.preprocess(normalizeTrimmedText, z.string().min(1)),
  }),
  z.object({
    operation: z.literal("delete"),
    id: commonIdField,
  }),
]);

export function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(" | ");
}
