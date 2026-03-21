"use client";

import React, { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { generateTsType } from "~/lib/cms/tsTypeGenerator";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";

interface Props {
  structure: SchemaStructure;
  schemaSlug: string;
}

export const TypesPanel: React.FC<Props> = ({ structure, schemaSlug }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const typeCode = useMemo(
    () =>
      schemaSlug && structure ? generateTsType(structure, schemaSlug) : "",
    [structure, schemaSlug],
  );

  const fileName = `${schemaSlug}_json.types.ts`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(typeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-xl border">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-2.5"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
            size={13}
            className="text-muted-foreground"
          />
          <span className="text-sm font-medium">TypeScript Types</span>
          <code className="text-muted-foreground font-mono text-xs">
            {fileName}
          </code>
        </div>

        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void handleCopy();
            }}
            className="text-muted-foreground h-6 gap-1 px-2 text-xs"
          >
            <HugeiconsIcon
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              size={12}
              className={copied ? "text-green-500" : ""}
            />
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t px-4 pt-3 pb-4">
          <SyntaxHighlight code={typeCode} />
        </div>
      )}
    </div>
  );
};

const TOKEN_PATTERNS: { regex: RegExp; className: string }[] = [
  {
    regex: /\b(export|type|Array|Record|string|never)\b/g,
    className: "text-violet-400",
  },
  {
    regex: /\b([A-Z][a-zA-Z0-9]*_JsonType)\b/g,
    className: "text-sky-400",
  },
  {
    regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*:)/g,
    className: "text-emerald-400",
  },
  {
    regex: /([{}[\];=<>,])/g,
    className: "text-muted-foreground",
  },
];

function tokenize(code: string): React.ReactNode[] {
  const lines = code.split("\n");

  return lines.map((line, lineIdx) => {
    const nodes = highlightLine(line);
    return <div key={lineIdx}>{nodes}</div>;
  });
}

function highlightLine(line: string): React.ReactNode[] {
  type Span = { start: number; end: number; className: string };
  const spans: Span[] = [];

  for (const { regex, className } of TOKEN_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const captured = match[1] ?? match[0];
      const start = match.index + (match[0].length - captured.length);
      const end = start + captured.length;
      const overlaps = spans.some((s) => start < s.end && end > s.start);
      if (!overlaps) {
        spans.push({ start, end, className });
      }
    }
  }

  spans.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      nodes.push(
        <span key={cursor} className="text-foreground/80">
          {line.slice(cursor, span.start)}
        </span>,
      );
    }
    nodes.push(
      <span key={span.start} className={span.className}>
        {line.slice(span.start, span.end)}
      </span>,
    );
    cursor = span.end;
  }

  if (cursor < line.length) {
    nodes.push(
      <span key={cursor} className="text-foreground/80">
        {line.slice(cursor)}
      </span>,
    );
  }

  if (nodes.length === 0) {
    nodes.push(<span key="empty">{"\u200B"}</span>);
  }

  return nodes;
}

const SyntaxHighlight: React.FC<{ code: string }> = ({ code }) => {
  const nodes = useMemo(() => tokenize(code), [code]);

  return (
    <div className="bg-muted overflow-auto rounded-xl p-4">
      <pre className="font-mono text-xs leading-relaxed select-all">
        {nodes}
      </pre>
    </div>
  );
};
