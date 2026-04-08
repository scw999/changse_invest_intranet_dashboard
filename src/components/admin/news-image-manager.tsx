"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";

import { extractArticleAnchors, normalizeAnchorKey } from "@/lib/article-anchors";
import type { NewsItemImage, NewsImagePlacement } from "@/types/research";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

type NewsImageManagerProps = {
  newsItemId: string;
  images: NewsItemImage[];
  /**
   * Markdown body the image manager should scan for `{#anchor-id}` headings.
   * Used to populate the inline-anchor suggestion dropdown. Optional — when
   * absent, the anchor input still works but offers no suggestions.
   */
  articleBody?: string;
  disabled?: boolean;
  onMutate: (
    body: Record<string, unknown>,
    successMessage: string,
  ) => Promise<void>;
};

type DraftMeta = {
  caption: string;
  alt: string;
  placement: NewsImagePlacement;
  anchorKey: string;
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file reader result."));
        return;
      }
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function NewsImageManager({
  newsItemId,
  images,
  articleBody,
  disabled = false,
  onMutate,
}: NewsImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftMeta>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  const datalistId = `news-anchors-${newsItemId}`;

  const detectedAnchors = useMemo(
    () => extractArticleAnchors(articleBody ?? ""),
    [articleBody],
  );

  const buildBaseDraft = (image: NewsItemImage): DraftMeta => ({
    caption: image.caption,
    alt: image.alt,
    placement: image.placement,
    anchorKey: image.anchorKey ?? "",
  });

  const getDraft = (image: NewsItemImage): DraftMeta => {
    return drafts[image.id] ?? buildBaseDraft(image);
  };

  const setDraftField = <K extends keyof DraftMeta>(
    image: NewsItemImage,
    field: K,
    value: DraftMeta[K],
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [image.id]: {
        ...(prev[image.id] ?? buildBaseDraft(image)),
        [field]: value,
      },
    }));
  };

  const handleAddFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setLocalError(null);
    setIsUploading(true);
    try {
      const oversize = Array.from(fileList).find((file) => file.size > MAX_FILE_BYTES);
      if (oversize) {
        throw new Error(
          `${oversize.name}이(가) 8MB 제한을 초과합니다. 더 작은 이미지를 사용해 주세요.`,
        );
      }

      const additions = await Promise.all(
        Array.from(fileList).map(async (file) => ({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          bufferBase64: await fileToBase64(file),
          alt: file.name,
        })),
      );

      await onMutate(
        {
          id: newsItemId,
          images: additions,
        },
        `${additions.length}개의 이미지를 업로드했습니다.`,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveMeta = async (image: NewsItemImage) => {
    const draft = getDraft(image);
    const captionChanged = draft.caption !== image.caption;
    const altChanged = draft.alt !== image.alt;
    const placementChanged = draft.placement !== image.placement;
    const anchorChanged = (draft.anchorKey || "") !== (image.anchorKey ?? "");

    if (!captionChanged && !altChanged && !placementChanged && !anchorChanged) {
      return;
    }

    // Inline placement requires a syntactically valid anchor key, otherwise
    // the server will silently downgrade to gallery — better to surface that
    // here so the admin can fix it before saving.
    if (draft.placement === "inline") {
      const normalized = normalizeAnchorKey(draft.anchorKey);
      if (!normalized) {
        setLocalError(
          "인라인 배치를 사용하려면 anchor id 가 필요합니다. 예: samsung-valuation",
        );
        return;
      }
    }

    setLocalError(null);

    const updateEntry: Record<string, unknown> = {
      imageId: image.id,
    };
    if (captionChanged) updateEntry.caption = draft.caption;
    if (altChanged) updateEntry.alt = draft.alt;
    if (placementChanged) updateEntry.placement = draft.placement;
    if (anchorChanged || placementChanged) {
      updateEntry.anchorKey =
        draft.placement === "inline" ? draft.anchorKey.trim() : null;
    }

    await onMutate(
      {
        id: newsItemId,
        imageOperations: {
          update: [updateEntry],
        },
      },
      "이미지 메타데이터를 저장했습니다.",
    );
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[image.id];
      return next;
    });
  };

  const handleMove = async (image: NewsItemImage, direction: "up" | "down") => {
    const index = sortedImages.findIndex((entry) => entry.id === image.id);
    const swapWith = sortedImages[direction === "up" ? index - 1 : index + 1];
    if (!swapWith) {
      return;
    }

    await onMutate(
      {
        id: newsItemId,
        imageOperations: {
          reorder: [
            { imageId: image.id, order: swapWith.order },
            { imageId: swapWith.id, order: image.order },
          ],
        },
      },
      "이미지 순서를 변경했습니다.",
    );
  };

  const handleSetCover = async (image: NewsItemImage) => {
    await onMutate(
      {
        id: newsItemId,
        imageOperations: {
          update: [
            {
              imageId: image.id,
              isCover: true,
            },
          ],
        },
      },
      "대표 이미지를 변경했습니다.",
    );
  };

  const handleDelete = async (image: NewsItemImage) => {
    await onMutate(
      {
        id: newsItemId,
        imageOperations: {
          delete: [image.id],
        },
      },
      "이미지를 삭제했습니다.",
    );
  };

  return (
    <div className="space-y-3 rounded-[20px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.55)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
            첨부 이미지
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {sortedImages.length === 0
              ? "현재 첨부된 이미지가 없습니다."
              : `${sortedImages.length}개의 이미지가 첨부되어 있습니다.`}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)]">
          <ImagePlus className="h-4 w-4" />
          {isUploading ? "업로드 중..." : "이미지 추가"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || isUploading}
            onChange={(event) => void handleAddFiles(event.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {localError ? (
        <div className="rounded-[16px] border border-[rgba(140,45,45,0.18)] bg-[rgba(140,45,45,0.06)] px-3 py-2 text-xs text-[#7a2f2f]">
          {localError}
        </div>
      ) : null}

      {detectedAnchors.length > 0 ? (
        <div className="rounded-[16px] border border-[rgba(46,106,100,0.18)] bg-[rgba(46,106,100,0.08)] px-3 py-2 text-xs text-[#1d604f]">
          <p className="font-semibold">
            본문에서 감지된 anchor {detectedAnchors.length}개
          </p>
          <p className="mt-1 text-[var(--text-muted)]">
            {detectedAnchors
              .map((anchor) => `#${anchor.anchorKey} (${anchor.heading})`)
              .join(" · ")}
          </p>
        </div>
      ) : (
        <div className="rounded-[16px] border border-[var(--border-soft)] bg-white/60 px-3 py-2 text-xs text-[var(--text-muted)]">
          본문에 <code>{"{#anchor-id}"}</code> 마커가 없습니다. 인라인 배치를 쓰려면 본문 제목에
          예: <code>### 삼성전자 저평가 논점 {"{#samsung-valuation}"}</code> 처럼 anchor id 를
          넣어 주세요.
        </div>
      )}

      {detectedAnchors.length > 0 ? (
        <datalist id={datalistId}>
          {detectedAnchors.map((anchor) => (
            <option key={anchor.anchorKey} value={anchor.anchorKey}>
              {`${"#".repeat(anchor.level)} ${anchor.heading}`}
            </option>
          ))}
        </datalist>
      ) : null}

      {sortedImages.length > 0 ? (
        <ul className="space-y-3">
          {sortedImages.map((image, index) => {
            const draft = getDraft(image);
            const dirty =
              draft.caption !== image.caption ||
              draft.alt !== image.alt ||
              draft.placement !== image.placement ||
              (draft.anchorKey || "") !== (image.anchorKey ?? "");
            const isInline = draft.placement === "inline";
            return (
              <li
                key={image.id}
                className="flex flex-col gap-3 rounded-[16px] border border-[var(--border-soft)] bg-white/80 p-3 sm:flex-row"
              >
                <div className="flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt || image.caption || "첨부 이미지"}
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-32 rounded-[12px] object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-faint)]">
                    <span className="font-semibold">#{index + 1}</span>
                    {image.placement === "inline" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(46,106,100,0.12)] px-2 py-1 text-[#1d604f]">
                        인라인 · {image.anchorKey ?? "(no anchor)"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(23,42,70,0.06)] px-2 py-1 text-[var(--text-muted)]">
                        갤러리
                      </span>
                    )}
                    {image.isCover ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f3eee0] px-2 py-1 text-[#7a5b1c]">
                        <Star className="h-3 w-3" />
                        대표 이미지
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    placeholder="캡션"
                    value={draft.caption}
                    disabled={disabled}
                    onChange={(event) => setDraftField(image, "caption", event.target.value)}
                    className="field"
                  />
                  <input
                    type="text"
                    placeholder="대체 텍스트 (alt)"
                    value={draft.alt}
                    disabled={disabled}
                    onChange={(event) => setDraftField(image, "alt", event.target.value)}
                    className="field"
                  />
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                    <select
                      value={draft.placement}
                      disabled={disabled}
                      onChange={(event) =>
                        setDraftField(
                          image,
                          "placement",
                          event.target.value as NewsImagePlacement,
                        )
                      }
                      className="field"
                    >
                      <option value="gallery">갤러리</option>
                      <option value="inline">인라인 (anchor)</option>
                    </select>
                    <input
                      type="text"
                      list={detectedAnchors.length > 0 ? datalistId : undefined}
                      placeholder={
                        isInline
                          ? "anchor id (예: samsung-valuation)"
                          : "anchor id (인라인일 때만 사용)"
                      }
                      value={draft.anchorKey}
                      disabled={disabled || !isInline}
                      onChange={(event) => setDraftField(image, "anchorKey", event.target.value)}
                      className="field"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disabled || !dirty}
                      onClick={() => void handleSaveMeta(image)}
                      className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-50"
                    >
                      메타 저장
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => void handleMove(image, "up")}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-50"
                    >
                      <ArrowUp className="h-3 w-3" />
                      위로
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === sortedImages.length - 1}
                      onClick={() => void handleMove(image, "down")}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-50"
                    >
                      <ArrowDown className="h-3 w-3" />
                      아래로
                    </button>
                    {!image.isCover ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void handleSetCover(image)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[rgba(23,42,70,0.05)] disabled:opacity-50"
                      >
                        <Star className="h-3 w-3" />
                        대표
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void handleDelete(image)}
                      className="inline-flex items-center gap-1 rounded-full border border-[rgba(140,45,45,0.2)] px-3 py-1 text-xs font-semibold text-[#8d2d2d] transition hover:bg-[rgba(140,45,45,0.06)] disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
