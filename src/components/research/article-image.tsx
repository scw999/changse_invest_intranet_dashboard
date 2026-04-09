"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { NewsItemImage } from "@/types/research";

type ArticleImageProps = {
  image: NewsItemImage;
  fallbackAlt?: string;
  inline?: boolean;
};

/**
 * Single attachment renderer used both inside the article body (inline mode)
 * and inside the gallery section. Images can be opened in a fullscreen
 * lightbox rendered via portal so mobile browsers keep it centered.
 */
export function ArticleImage({ image, fallbackAlt, inline = false }: ArticleImageProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const altText = useMemo(
    () => image.alt || image.caption || fallbackAlt || "첨부 이미지",
    [fallbackAlt, image.alt, image.caption],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const lightbox =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex min-h-screen w-screen items-center justify-center bg-black/88 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="확대 이미지 보기"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-black/70"
            >
              닫기
            </button>
            <div
              className="flex max-h-full w-full max-w-6xl flex-col items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={altText}
                className="block max-h-[82vh] max-w-[94vw] rounded-[18px] object-contain shadow-2xl"
              />
              {image.caption ? (
                <p className="mt-3 max-w-[94vw] text-center text-sm text-white/90">{image.caption}</p>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <figure
        className={
          inline
            ? "my-5 overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white/85"
            : "overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white/80"
        }
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group block w-full cursor-zoom-in text-left"
          aria-label="이미지 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={altText}
            loading="lazy"
            decoding="async"
            width={image.width}
            height={image.height}
            className={
              inline
                ? "block h-auto w-full object-contain transition duration-200 group-hover:opacity-95"
                : "block h-auto max-h-[420px] w-full object-cover transition duration-200 group-hover:opacity-95"
            }
          />
        </button>
        {image.caption ? (
          <figcaption className="px-4 py-3 text-sm text-[var(--text-muted)]">
            {image.caption}
          </figcaption>
        ) : null}
      </figure>

      {lightbox}
    </>
  );
}
