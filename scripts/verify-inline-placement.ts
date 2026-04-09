/**
 * Integration test for the inline anchor placement pipeline.
 *
 * This test exercises the EXACT parser + grouping logic the archive detail
 * page uses at runtime, against the real user-authored template. It proves
 * that:
 *
 *  1. The body line-scan parser splits a body with mixed `##` plain headings
 *     and `###`/`##` `{#id}` headings into the expected subsection slices.
 *  2. Images with `placement: "inline"` and `anchorKey` values correctly
 *     snap to their matching subsection, in `display_order` order.
 *  3. Images with broken or missing anchor keys fall back to the gallery
 *     bucket (never silently dropped).
 *  4. Legacy posts without any `{#id}` markers still work (single preamble
 *     section, all images go to gallery).
 *
 * Run via:
 *
 *   node --experimental-strip-types scripts/verify-inline-placement.ts
 *
 * Exits 0 on success, 1 on any failed assertion.
 */

import { strict as assert } from "node:assert";

import {
  PREAMBLE_ANCHOR_KEY,
  extractArticleAnchors,
  normalizeAnchorKey,
  parseArticleSections,
  type ArticleSection,
} from "../src/lib/article-anchors.ts";
import { getDisplayNewsItem } from "../src/lib/content-kr.ts";
import type { NewsItem } from "../src/types/research.ts";

type FixtureImage = {
  id: string;
  placement: "inline" | "gallery";
  anchorKey?: string;
  order: number;
  caption?: string;
};

type RenderStep =
  | { kind: "section"; anchorKey: string; heading: string; level: number }
  | { kind: "image"; id: string; caption?: string };

/**
 * Re-implements the exact grouping logic in
 * `src/components/pages/news-detail-page.tsx`, then walks the sections in
 * document order and emits a flat "render plan" we can assert against.
 */
function planRender(body: string, images: FixtureImage[]) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const { sections, anchors } = parseArticleSections(body);
  const validAnchorKeys = new Set(anchors.map((a) => a.anchorKey));

  const inlineByAnchor = new Map<string, FixtureImage[]>();
  const gallery: FixtureImage[] = [];

  for (const image of sorted) {
    if (
      image.placement === "inline" &&
      image.anchorKey &&
      validAnchorKeys.has(image.anchorKey)
    ) {
      const arr = inlineByAnchor.get(image.anchorKey) ?? [];
      arr.push(image);
      inlineByAnchor.set(image.anchorKey, arr);
    } else {
      gallery.push(image);
    }
  }

  const plan: RenderStep[] = [];
  for (const section of sections) {
    plan.push({
      kind: "section",
      anchorKey: section.anchorKey,
      heading: section.heading,
      level: section.level,
    });
    if (section.anchorKey !== PREAMBLE_ANCHOR_KEY) {
      const inline = inlineByAnchor.get(section.anchorKey) ?? [];
      for (const image of inline) {
        plan.push({ kind: "image", id: image.id, caption: image.caption });
      }
    }
  }

  return { plan, gallery, anchors, sections };
}

function banner(title: string) {
  console.log(`\n=== ${title} ===`);
}

let failed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${label}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL ${label}`);
    console.log(`       ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ---------------------------------------------------------------------------
// Fixture 1: the exact subsection example from the task prompt
// ---------------------------------------------------------------------------

banner("Fixture 1: subsection placement (task prompt example)");

const body1 = `## 사실
### 삼성전자 저평가 논점 {#samsung-valuation}
삼성전자 관련 본문 A

### 사모대출 불안 {#private-credit-risk}
사모대출 관련 본문 B

### 트럼프 48시간 발언 {#trump-48h}
트럼프 관련 본문 C`;

const images1: FixtureImage[] = [
  {
    id: "samsung",
    placement: "inline",
    anchorKey: "samsung-valuation",
    order: 1,
    caption: "삼성 스크린샷",
  },
  {
    id: "private-credit",
    placement: "inline",
    anchorKey: "private-credit-risk",
    order: 2,
    caption: "사모대출 스크린샷",
  },
  {
    id: "trump",
    placement: "inline",
    anchorKey: "trump-48h",
    order: 3,
    caption: "트럼프 스크린샷",
  },
];

const result1 = planRender(body1, images1);

check("parser extracted exactly three anchors from the body", () => {
  assert.deepEqual(
    result1.anchors.map((a) => a.anchorKey),
    ["samsung-valuation", "private-credit-risk", "trump-48h"],
  );
});

check("render plan has sections in document order", () => {
  const sectionKeys = result1.plan
    .filter((step): step is Extract<RenderStep, { kind: "section" }> => step.kind === "section")
    .map((step) => step.anchorKey);
  assert.deepEqual(sectionKeys, [
    PREAMBLE_ANCHOR_KEY,
    "samsung-valuation",
    "private-credit-risk",
    "trump-48h",
  ]);
});

check("images appear immediately after their matching subsection", () => {
  // Flatten to (anchorKey, imageId) pairs showing what comes after each
  // section in the render plan.
  const flat: string[] = [];
  let currentSection = "";
  for (const step of result1.plan) {
    if (step.kind === "section") {
      currentSection = step.anchorKey;
      flat.push(`SECTION:${currentSection}`);
    } else {
      flat.push(`IMAGE:${step.id}@${currentSection}`);
    }
  }

  assert.deepEqual(flat, [
    `SECTION:${PREAMBLE_ANCHOR_KEY}`,
    "SECTION:samsung-valuation",
    "IMAGE:samsung@samsung-valuation",
    "SECTION:private-credit-risk",
    "IMAGE:private-credit@private-credit-risk",
    "SECTION:trump-48h",
    "IMAGE:trump@trump-48h",
  ]);
});

check("gallery bucket is empty because every image is inline-resolved", () => {
  assert.deepEqual(result1.gallery, []);
});

// ---------------------------------------------------------------------------
// Fixture 2: full realistic assistant-authored template (mixed ## and ###)
// ---------------------------------------------------------------------------

banner("Fixture 2: realistic assistant template (## and ### mixed)");

const body2 = `## 상단 요약 카드
- 핵심 1: ...
- 핵심 2: ...

## 사실
### 삼성전자 저평가 논점 {#samsung-valuation}
본문 ...

### 사모대출 불안 {#private-credit-risk}
본문 ...

### 트럼프 48시간 발언 {#trump-48h}
본문 ...

## 시장 해석 {#market-interpretation}
본문 ...

## 창세봇 의견 {#bot-opinion}
본문 ...

## Bull {#bull}
본문 ...

## Bear {#bear}
본문 ...

## 실행 아이디어 {#action-ideas}
본문 ...

## 체크포인트 {#checkpoints}
본문 ...`;

const images2: FixtureImage[] = [
  { id: "a", placement: "inline", anchorKey: "samsung-valuation", order: 1 },
  { id: "b", placement: "inline", anchorKey: "private-credit-risk", order: 2 },
  { id: "c", placement: "inline", anchorKey: "bull", order: 3 },
  { id: "d", placement: "inline", anchorKey: "bear", order: 4 },
  { id: "e", placement: "inline", anchorKey: "checkpoints", order: 5 },
];

const result2 = planRender(body2, images2);

check("all 9 {#id} headings are detected (both ### and ##)", () => {
  assert.deepEqual(
    result2.anchors.map((a) => a.anchorKey),
    [
      "samsung-valuation",
      "private-credit-risk",
      "trump-48h",
      "market-interpretation",
      "bot-opinion",
      "bull",
      "bear",
      "action-ideas",
      "checkpoints",
    ],
  );
});

check("### subsections land under their direct anchor, not under the preceding ## 사실", () => {
  // The user's #1 concern: does `### 삼성전자 저평가 논점` correctly own its
  // own section, or does its content get rolled up into the parent `## 사실`?
  const samsungSection = result2.sections.find(
    (s: ArticleSection) => s.anchorKey === "samsung-valuation",
  );
  assert.ok(samsungSection, "samsung-valuation section must exist");
  assert.equal(samsungSection!.level, 3);
  assert.match(samsungSection!.content, /삼성전자 저평가 논점/);
  assert.match(samsungSection!.content, /본문 \.\.\./);
  // And it must NOT swallow the next subsection's content.
  assert.doesNotMatch(samsungSection!.content, /사모대출/);
});

check("inline images target the requested subsections in order", () => {
  const imageSteps = result2.plan.filter(
    (step): step is Extract<RenderStep, { kind: "image" }> => step.kind === "image",
  );
  // We can't show adjacency from this list alone, so walk the full plan.
  const emitted: Array<{ id: string; after: string }> = [];
  let currentAnchor = "";
  for (const step of result2.plan) {
    if (step.kind === "section") {
      currentAnchor = step.anchorKey;
    } else {
      emitted.push({ id: step.id, after: currentAnchor });
    }
  }
  assert.deepEqual(emitted, [
    { id: "a", after: "samsung-valuation" },
    { id: "b", after: "private-credit-risk" },
    { id: "c", after: "bull" },
    { id: "d", after: "bear" },
    { id: "e", after: "checkpoints" },
  ]);
  // sanity: we emitted as many images as we put in
  assert.equal(imageSteps.length, 5);
});

check("preamble section preserves `## 상단 요약 카드` and `## 사실` content", () => {
  const preamble = result2.sections.find(
    (s: ArticleSection) => s.anchorKey === PREAMBLE_ANCHOR_KEY,
  );
  assert.ok(preamble);
  assert.match(preamble!.content, /## 상단 요약 카드/);
  assert.match(preamble!.content, /핵심 1/);
  assert.match(preamble!.content, /## 사실/);
});

// ---------------------------------------------------------------------------
// Fixture 3: fallback behavior for broken or missing anchors
// ---------------------------------------------------------------------------

banner("Fixture 3: fallback behavior");

const body3 = `### A {#alpha}
본문
### B {#beta}
본문`;

const images3: FixtureImage[] = [
  { id: "ok", placement: "inline", anchorKey: "alpha", order: 1 },
  { id: "ghost", placement: "inline", anchorKey: "does-not-exist", order: 2 },
  { id: "no-anchor", placement: "inline", anchorKey: undefined, order: 3 },
  { id: "plain", placement: "gallery", order: 4 },
];

const result3 = planRender(body3, images3);

check("valid inline image still renders after its subsection", () => {
  const planKeys = result3.plan
    .filter((step) => step.kind === "image")
    .map((step) => (step as Extract<RenderStep, { kind: "image" }>).id);
  assert.deepEqual(planKeys, ["ok"]);
});

check("broken anchor → gallery fallback (not dropped)", () => {
  assert.ok(result3.gallery.find((img) => img.id === "ghost"));
});

check("inline with no anchorKey → gallery fallback (not dropped)", () => {
  assert.ok(result3.gallery.find((img) => img.id === "no-anchor"));
});

check("explicit gallery image stays in gallery", () => {
  assert.ok(result3.gallery.find((img) => img.id === "plain"));
});

// ---------------------------------------------------------------------------
// Fixture 4: legacy text-only body (no anchors at all)
// ---------------------------------------------------------------------------

banner("Fixture 4: legacy text-only body");

const body4 = `보통 본문입니다.

다음 단락입니다.`;
const images4: FixtureImage[] = [
  { id: "g1", placement: "gallery", order: 1 },
];

const result4 = planRender(body4, images4);

check("parser emits a single preamble section, no anchors", () => {
  assert.equal(result4.sections.length, 1);
  assert.equal(result4.sections[0].anchorKey, PREAMBLE_ANCHOR_KEY);
  assert.equal(result4.anchors.length, 0);
});

check("gallery images still render", () => {
  assert.equal(result4.gallery.length, 1);
  assert.equal(result4.gallery[0].id, "g1");
});

// ---------------------------------------------------------------------------
// Fixture 5: multiple images target the same anchor
// ---------------------------------------------------------------------------

banner("Fixture 5: multiple images on the same anchor");

const body5 = `### Focus {#focus}
본문`;
const images5: FixtureImage[] = [
  { id: "img-first", placement: "inline", anchorKey: "focus", order: 1 },
  { id: "img-second", placement: "inline", anchorKey: "focus", order: 2 },
  { id: "img-third", placement: "inline", anchorKey: "focus", order: 3 },
];

const result5 = planRender(body5, images5);

check("three images on the same anchor render in order", () => {
  const ids = result5.plan
    .filter((step) => step.kind === "image")
    .map((step) => (step as Extract<RenderStep, { kind: "image" }>).id);
  assert.deepEqual(ids, ["img-first", "img-second", "img-third"]);
});

// ---------------------------------------------------------------------------
// Fixture 6: normalizeAnchorKey boundary cases
// ---------------------------------------------------------------------------

banner("Fixture 6: anchor key normalization");

check("leading # is tolerated and stripped", () => {
  assert.equal(normalizeAnchorKey("#samsung-valuation"), "samsung-valuation");
});

check("uppercase is normalized to lowercase", () => {
  assert.equal(normalizeAnchorKey("Samsung-Valuation"), "samsung-valuation");
});

check("illegal characters are rejected", () => {
  assert.equal(normalizeAnchorKey("bad id with space"), null);
  assert.equal(normalizeAnchorKey("한글-앵커"), null);
  assert.equal(normalizeAnchorKey(""), null);
  assert.equal(normalizeAnchorKey("-leading-dash"), null);
});

check("extractArticleAnchors is identity-equivalent to parser.anchors", () => {
  const viaHelper = extractArticleAnchors(body2);
  const viaParser = parseArticleSections(body2).anchors;
  assert.deepEqual(viaHelper, viaParser);
});

// ---------------------------------------------------------------------------
// Fixture 7: getDisplayNewsItem must NOT clobber a body that contains anchors
//
// Regression for the bug where the seed Korean translation layer in
// `content-kr.ts` was spreading hardcoded `marketInterpretation` text on top
// of the DB row for any seed news id (e.g. "news-001"), stripping the
// `{#id}` markers a real edit had introduced. The renderer then saw a body
// with zero anchors and dropped every inline image into the bottom gallery.
// ---------------------------------------------------------------------------

banner("Fixture 7: getDisplayNewsItem regression (do not clobber DB body)");

const anchoredBody = `## 사실
### 삼성전자 저평가 논점 {#samsung-valuation}
삼성전자 관련 본문 A

### 사모대출 불안 {#private-credit-risk}
사모대출 관련 본문 B

### 트럼프 48시간 발언 {#trump-48h}
트럼프 관련 본문 C`;

// Build the smallest plausible NewsItem with the seed id whose Korean
// override historically clobbered the body. Casts are ok here — the test only
// touches `marketInterpretation` and we're not exercising other fields.
const seededItem = {
  id: "news-001",
  contentType: "news",
  title: "seeded title",
  summary: "seeded summary",
  sourceName: "test",
  sourceUrl: "https://example.com",
  publishedAt: "2026-04-09T00:00:00+09:00",
  scanSlot: "09",
  region: "KR",
  affectedAssetClasses: [],
  relatedThemeIds: [],
  relatedTickerIds: [],
  marketInterpretation: anchoredBody,
  directionalView: "Bullish",
  actionIdea: "act",
  followUpStatus: "Pending",
  followUpNote: "follow",
  importance: "High",
  createdAt: "2026-04-09T00:00:00+09:00",
  updatedAt: "2026-04-09T00:00:00+09:00",
} as unknown as NewsItem;

const displayedSeed = getDisplayNewsItem(seededItem);

check("getDisplayNewsItem preserves a non-empty body verbatim", () => {
  assert.equal(displayedSeed.marketInterpretation, anchoredBody);
});

check("anchors survive the display layer for a seed id", () => {
  const { anchors: displayedAnchors } = parseArticleSections(
    displayedSeed.marketInterpretation,
  );
  assert.deepEqual(
    displayedAnchors.map((anchor) => anchor.anchorKey),
    ["samsung-valuation", "private-credit-risk", "trump-48h"],
  );
});

check("inline images for a seed id render under their anchors, not in gallery", () => {
  const seedImages: FixtureImage[] = [
    { id: "samsung", placement: "inline", anchorKey: "samsung-valuation", order: 1 },
    { id: "pc", placement: "inline", anchorKey: "private-credit-risk", order: 2 },
    { id: "trump", placement: "inline", anchorKey: "trump-48h", order: 3 },
  ];
  // Plan against the *displayed* body — i.e. the body the renderer actually
  // hands to parseArticleSections after running through getDisplayNewsItem.
  const seedResult = planRender(displayedSeed.marketInterpretation, seedImages);
  assert.deepEqual(seedResult.gallery, [], "gallery must be empty");
  const flat: string[] = [];
  let currentSection = "";
  for (const step of seedResult.plan) {
    if (step.kind === "section") {
      currentSection = step.anchorKey;
      flat.push(`SECTION:${currentSection}`);
    } else {
      flat.push(`IMAGE:${step.id}@${currentSection}`);
    }
  }
  assert.deepEqual(flat, [
    `SECTION:${PREAMBLE_ANCHOR_KEY}`,
    "SECTION:samsung-valuation",
    "IMAGE:samsung@samsung-valuation",
    "SECTION:private-credit-risk",
    "IMAGE:pc@private-credit-risk",
    "SECTION:trump-48h",
    "IMAGE:trump@trump-48h",
  ]);
});

check("getDisplayNewsItem still falls back to override when DB field is empty", () => {
  // An item with an empty `marketInterpretation` should still pick up the
  // legacy Korean override — the fallback layer is preserved for backward
  // compatibility with un-migrated seed entries.
  const emptyItem = { ...seededItem, marketInterpretation: "" };
  const displayed = getDisplayNewsItem(emptyItem);
  assert.notEqual(displayed.marketInterpretation, "");
  assert.match(displayed.marketInterpretation, /국내 베타/);
});

// ---------------------------------------------------------------------------

console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
if (failed > 0) {
  process.exit(1);
}
