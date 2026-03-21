"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import { SchemaPreviewTree } from "~/components/dashboard/schema/builder/SchemaPreviewTree";
import { jsonToSchemaStructure } from "~/lib/cms/jsonParser";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import { slugify } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulkSchemaItem {
  title: string;
  description: string;
  rawJson: string;
  structure: SchemaStructure | null;
  parseError: string | null;
  titleError: string | null;
}

interface Props {
  item: BulkSchemaItem;
  index: number;
  usedTitles: string[]; // titles of all other items — for duplicate detection
  onChange: (index: number, updated: BulkSchemaItem) => void;
}

export const BulkSchemaTabItem: React.FC<Props> = ({
  item,
  index,
  usedTitles,
  onChange,
}) => {
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [jsonExpanded, setJsonExpanded] = useState(!!item.parseError);

  const update = (patch: Partial<BulkSchemaItem>) => {
    onChange(index, { ...item, ...patch });
  };

  // ── Title change ──────────────────────────────────────────────────────────
  const handleTitleChange = (value: string) => {
    let titleError: string | null = null;
    const newSlug = slugify(value.trim());

    if (!value.trim()) {
      titleError = "Title is required";
    } else if (value.length > 100) {
      titleError = "Max 100 characters";
    } else if (usedTitles.some((t) => slugify(t) === newSlug)) {
      titleError = `"${value}" is already used in this batch`;
    }
    update({ title: value, titleError });
  };

  // ── JSON change + live re-parse ───────────────────────────────────────────
  const handleJsonChange = (value: string) => {
    let structure: SchemaStructure | null = null;
    let parseError: string | null = null;

    if (value.trim()) {
      try {
        const json = JSON.parse(value) as unknown;
        structure = jsonToSchemaStructure(json);
      } catch (err) {
        parseError =
          err instanceof Error ? err.message : "Failed to parse JSON.";
      }
    } else {
      parseError = "JSON cannot be empty";
    }

    update({ rawJson: value, structure, parseError });
  };

  const isValid = item.structure !== null && !item.titleError;

  return (
    <div className="flex flex-col gap-5">
      {!isValid && (
        <div className="bg-destructive/5 border-destructive/20 flex items-center gap-2 rounded-xl border px-4 py-3">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            className="text-destructive shrink-0"
          />
          <p className="text-destructive text-sm">
            {item.titleError ??
              item.parseError ??
              "This schema has errors that must be fixed before importing."}
          </p>
        </div>
      )}

      <Field data-invalid={!!item.titleError}>
        <FieldLabel htmlFor={`title-${index}`}>
          Schema Title
          <span className="text-muted-foreground ml-1 text-xs font-normal">
            (becomes the schema name in this project)
          </span>
        </FieldLabel>
        <Input
          id={`title-${index}`}
          value={item.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. About Us Page, Home Hero"
          aria-invalid={!!item.titleError}
          autoComplete="off"
        />
        {item.titleError && (
          <FieldError errors={[{ message: item.titleError }]} />
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor={`desc-${index}`}>
          Description{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </FieldLabel>
        <Input
          id={`desc-${index}`}
          value={item.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What content does this schema manage?"
          autoComplete="off"
          maxLength={500}
        />
      </Field>

      <div className="bg-muted rounded-xl">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setJsonExpanded((v) => !v)}
        >
          <span className="text-sm font-medium">
            JSON
            <span className="text-muted-foreground ml-1 text-xs font-normal">
              (edit to correct the structure — changes re-parse instantly)
            </span>
          </span>
          <HugeiconsIcon
            icon={jsonExpanded ? ArrowDown01Icon : ArrowRight01Icon}
            size={16}
            className="text-muted-foreground"
          />
        </button>

        {jsonExpanded && (
          <div className="border-t px-4 pt-3 pb-4">
            <Field data-invalid={!!item.parseError}>
              <Textarea
                id={`json-${index}`}
                value={item.rawJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                aria-invalid={!!item.parseError}
              />
              {item.parseError && (
                <FieldError errors={[{ message: item.parseError }]} />
              )}
            </Field>
          </div>
        )}
      </div>

      {item.structure && (
        <div className="bg-muted rounded-xl">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setPreviewExpanded((v) => !v)}
          >
            <span className="text-sm font-medium">
              Parsed Structure Preview
            </span>
            <HugeiconsIcon
              icon={previewExpanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={16}
              className="text-muted-foreground"
            />
          </button>
          {previewExpanded && (
            <div className="border-t px-4 pt-3 pb-4">
              <SchemaPreviewTree structure={item.structure} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
