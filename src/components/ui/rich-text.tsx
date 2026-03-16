"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const plugins = [remarkGfm, remarkBreaks];

type RichTextProps = {
  content?: string | null;
  className?: string;
  compact?: boolean;
};

export const RichText = memo(function RichText({
  content,
  className,
  compact = false,
}: RichTextProps) {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        compact ? "rich-text rich-text-compact" : "rich-text",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={plugins}>{content}</ReactMarkdown>
    </div>
  );
});
