"use client";

import React, { useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  TextIcon,
  AlignLeftIcon,
  Image01Icon,
  FolderLibraryIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";
import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";
import { cn } from "~/lib/utils";

interface SchemaPreviewTreeProps {
  structure: SchemaStructure;
}

export const SchemaPreviewTree: React.FC<SchemaPreviewTreeProps> = ({
  structure,
}) => {
  return (
    <div className="flex flex-col gap-1">
      {Object.entries(structure.fields).map(([key, field]) => (
        <FieldNodePreview key={key} fieldKey={key} field={field} depth={0} />
      ))}
    </div>
  );
};

// ─── Field type metadata ──────────────────────────────────────────────────────

const FIELD_TYPE_META: Record<
  string,
  { label: string; icon: IconSvgElement; color: string }
> = {
  string: { label: "Short Text", icon: TextIcon, color: "text-blue-500" },
  text: { label: "Long Text", icon: AlignLeftIcon, color: "text-purple-500" },
  file: { label: "File", icon: Image01Icon, color: "text-green-500" },
  object: {
    label: "Object",
    icon: FolderLibraryIcon,
    color: "text-orange-500",
  },
  array: { label: "Array", icon: ListViewIcon, color: "text-pink-500" },
};

// ─── Single field node ────────────────────────────────────────────────────────

interface FieldNodePreviewProps {
  fieldKey: string;
  field: FieldDefinition;
  depth: number;
}

const FieldNodePreview: React.FC<FieldNodePreviewProps> = ({
  fieldKey,
  field,
  depth,
}) => {
  const [expanded, setExpanded] = useState(true);
  const isExpandable = field.type === "object" || field.type === "array";
  const meta = FIELD_TYPE_META[field.type] ?? FIELD_TYPE_META.string!;

  const hasChildren =
    (field.type === "object" && Object.keys(field.fields ?? {}).length > 0) ||
    (field.type === "array" &&
      field.itemType === "object" &&
      Object.keys(field.fields ?? {}).length > 0);

  return (
    <div className={cn("flex flex-col", depth > 0 && "ml-6 border-l pl-4")}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-4.5 py-2",
          "hover:bg-muted/50 transition-colors",
          isExpandable && hasChildren && "cursor-pointer",
        )}
        onClick={() => {
          if (isExpandable && hasChildren) setExpanded((v) => !v);
        }}
      >
        <span className="text-muted-foreground w-4 shrink-0">
          {isExpandable && hasChildren ? (
            expanded ? (
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
            ) : (
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            )
          ) : null}
        </span>

        <HugeiconsIcon
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          icon={meta.icon as any}
          size={16}
          className={meta.color}
        />

        <code className="text-foreground text-sm font-medium whitespace-nowrap">
          {fieldKey}
        </code>
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {field.label}
        </span>

        <span className="bg-muted text-muted-foreground ml-auto rounded px-2 py-0.5 font-mono text-xs whitespace-nowrap">
          {field.type}
          {field.type === "array" && ` of ${field.itemType}`}
        </span>

        {field.type === "file" && <FileBadge field={field} />}
      </div>

      {expanded && field.type === "object" && field.fields && (
        <div className="flex flex-col">
          {Object.entries(field.fields).map(([k, f]) => (
            <FieldNodePreview
              key={k}
              fieldKey={k}
              field={f}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {expanded &&
        field.type === "array" &&
        field.itemType === "object" &&
        field.fields && (
          <div className="flex flex-col">
            {Object.entries(field.fields).map(([k, f]) => (
              <FieldNodePreview
                key={k}
                fieldKey={k}
                field={f}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
    </div>
  );
};

// ─── File badge — shows variant summary ──────────────────────────────────────

const FileBadge: React.FC<{
  field: Extract<FieldDefinition, { type: "file" }>;
}> = ({ field }) => {
  return (
    <div className="flex min-w-fit items-center gap-1 whitespace-nowrap">
      {field.multiple && (
        <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
          multiple
        </span>
      )}
      {field.variants.map((v, i) => (
        <span
          key={i}
          className="rounded bg-green-500/10 px-2 py-0.5 font-mono text-xs text-green-600"
        >
          {v.fileType} ({v.allowedFormats.join(", ")}) {v.minCount}–{v.maxCount}
        </span>
      ))}
    </div>
  );
};
