"use client";

import { memo } from "react";
import Image from "next/image";

import type { ImageAttachment } from "@/types/research";

type NewsImageProps = {
  image: ImageAttachment;
  priority?: boolean;
};

export const NewsImage = memo(function NewsImage({ image, priority = false }: NewsImageProps) {
  return (
    <figure className="my-4 overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[rgba(243,239,231,0.48)]">
      <div className="relative aspect-video w-full">
        <Image
          src={image.url}
          alt={image.alt || image.caption || image.filename}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-contain"
          priority={priority}
          unoptimized
        />
      </div>
      {image.caption ? (
        <figcaption className="px-4 py-3 text-center text-sm text-[var(--text-muted)]">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
});

type NewsImageGalleryProps = {
  images: ImageAttachment[];
};

export const NewsImageGallery = memo(function NewsImageGallery({ images }: NewsImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="space-y-4">
      {images.length === 1 ? (
        <NewsImage image={images[0]} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {images
            .sort((a, b) => a.order - b.order)
            .map((image) => (
              <NewsImage key={image.id} image={image} />
            ))}
        </div>
      )}
    </div>
  );
});

type InlineImageGroupProps = {
  images: ImageAttachment[];
};

export const InlineImageGroup = memo(function InlineImageGroup({ images }: InlineImageGroupProps) {
  if (images.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {images
        .sort((a, b) => a.order - b.order)
        .map((image) => (
          <NewsImage key={image.id} image={image} />
        ))}
    </div>
  );
});
