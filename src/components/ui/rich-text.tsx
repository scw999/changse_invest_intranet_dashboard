"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type RichTextProps = {
  content?: string | null;
  className?: string;
  compact?: boolean;
};

export function RichText({ content, className, compact = false }: RichTextProps) {
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
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
