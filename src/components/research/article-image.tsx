"use client";

import type { NewsItemImage } from "@/types/research";

type ArticleImageProps = {
  image: NewsItemImage;
  fallbackAlt?: string;
  inline?: boolean;
};

/**
 * Single attachment renderer used both inside the article body (inline mode)
 * and inside the gallery section. The two visual modes share the same lazy /
 * async decode behavior so detail-page performance stays predictable.
 */
export function ArticleImage({ image, fallbackAlt, inline = false }: ArticleImageProps) {
  return (
    <figure
      className={
        inline
          ? "my-5 overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white/85"
          : "overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white/80"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt || image.caption || fallbackAlt || "첨부 이미지"}
        loading="lazy"
        decoding="async"
        width={image.width}
        height={image.height}
        className={
          inline
            ? "block h-auto w-full object-contain"
            : "block h-auto max-h-[420px] w-full object-cover"
        }
      />
      {image.caption ? (
        <figcaption className="px-4 py-3 text-sm text-[var(--text-muted)]">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
