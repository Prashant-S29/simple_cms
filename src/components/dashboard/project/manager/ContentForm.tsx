"use client";

import React from "react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AddCircleIcon,
  Delete02Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";
import { cn } from "~/lib/utils";

// ─── Top-level form ───────────────────────────────────────────────────────────

interface ContentFormProps {
  structure: SchemaStructure;
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

export const ContentForm: React.FC<ContentFormProps> = ({
  structure,
  data,
  onChange,
}) => {
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(structure.fields).map(([key, field]) => (
        <FieldRenderer
          key={key}
          fieldKey={key}
          field={field}
          value={data[key]}
          onChange={(val) => handleFieldChange(key, val)}
          depth={0}
        />
      ))}
    </div>
  );
};

// ─── Single field renderer ────────────────────────────────────────────────────

interface FieldRendererProps {
  fieldKey: string;
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  onRemove?: () => void;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({
  fieldKey,
  field,
  value,
  onChange,
  depth,
  onRemove,
}) => {
  // Reusable label row with optional remove button — used by string, text
  const labelRow = (
    <div className="flex items-center justify-between">
      <FieldLabel htmlFor={fieldKey}>{field.label}</FieldLabel>
      {onRemove && (
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-destructive hover:text-destructive/80 -mt-1"
          onClick={onRemove}
          aria-label="Remove item"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} />
        </Button>
      )}
    </div>
  );

  switch (field.type) {
    case "string":
      return (
        <Field>
          {labelRow}
          <Input
            id={fieldKey}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            autoComplete="off"
          />
        </Field>
      );

    case "text":
      return (
        <Field>
          {labelRow}
          <Textarea
            id={fieldKey}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={4}
          />
        </Field>
      );

    case "file":
      return (
        <FileFieldRenderer
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          onRemove={onRemove}
        />
      );

    case "object":
      return (
        <ObjectFieldRenderer
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          depth={depth}
          onRemove={onRemove}
        />
      );

    case "array":
      return (
        <ArrayFieldRenderer
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          depth={depth}
        />
      );

    default:
      return null;
  }
};

// ─── File field ───────────────────────────────────────────────────────────────

interface FileFieldRendererProps {
  fieldKey: string;
  field: Extract<FieldDefinition, { type: "file" }>;
  value: unknown;
  onChange: (value: unknown) => void;
  onRemove?: () => void;
}

const FileFieldRenderer: React.FC<FileFieldRendererProps> = ({
  fieldKey,
  field,
  value,
  onChange,
  onRemove,
}) => {
  const variantSummary = field.variants
    .map((v) => `${v.fileType} (${v.allowedFormats.join(", ")})`)
    .join(", ");

  return (
    <Field>
      {/* Label row — same pattern as string/text */}
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={fieldKey}>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={Image01Icon}
              size={13}
              className="text-green-500"
            />
            {field.label}
          </div>
        </FieldLabel>
        {onRemove && (
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-destructive hover:text-destructive/80 -mt-1"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} />
          </Button>
        )}
      </div>

      <p className="text-muted-foreground mb-1.5 text-xs">
        Accepts: {variantSummary}
        {field.multiple && " · Multiple files"}
      </p>

      <div className="bg-muted flex items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <HugeiconsIcon
            icon={Image01Icon}
            size={24}
            className="text-muted-foreground"
          />
          <p className="text-muted-foreground text-sm">
            File upload coming soon
          </p>
          <p className="text-muted-foreground text-xs">
            For now, paste a URL below
          </p>
        </div>
      </div>

      <Input
        id={fieldKey}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="mt-2 font-mono text-xs"
        autoComplete="off"
      />
    </Field>
  );
};

// ─── Object field ─────────────────────────────────────────────────────────────

interface ObjectFieldRendererProps {
  fieldKey: string;
  field: Extract<FieldDefinition, { type: "object" }>;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
  onRemove?: () => void;
}

const ObjectFieldRenderer: React.FC<ObjectFieldRendererProps> = ({
  field,
  value,
  onChange,
  depth,
  onRemove,
}) => {
  const obj =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const handleSubChange = (key: string, val: unknown) => {
    onChange({ ...obj, [key]: val });
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        depth === 0 ? "bg-card" : "bg-muted/30",
      )}
    >
      {/* Header with label + optional remove */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">{field.label}</p>
        {onRemove && (
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-destructive hover:text-destructive/80"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(field.fields ?? {}).map(([key, subField]) => (
          <FieldRenderer
            key={key}
            fieldKey={key}
            field={subField}
            value={obj[key]}
            onChange={(val) => handleSubChange(key, val)}
            depth={depth + 1}
            // Sub-fields inside an object are not individually removable
          />
        ))}
      </div>
    </div>
  );
};

// ─── Array field ──────────────────────────────────────────────────────────────

interface ArrayFieldRendererProps {
  fieldKey: string;
  field: Extract<FieldDefinition, { type: "array" }>;
  value: unknown;
  onChange: (value: unknown) => void;
  depth: number;
}

const ArrayFieldRenderer: React.FC<ArrayFieldRendererProps> = ({
  field,
  value,
  onChange,
  depth,
}) => {
  const arr = Array.isArray(value) ? value : [];

  const addItem = () => {
    let emptyItem: unknown = "";
    if (field.itemType === "object") {
      emptyItem = Object.fromEntries(
        Object.entries(field.fields ?? {}).map(([k]) => [k, ""]),
      );
    }
    onChange([...arr, emptyItem]);
  };

  const updateItem = (index: number, val: unknown) => {
    onChange(arr.map((item, i) => (i === index ? val : item)));
  };

  const removeItem = (index: number) => {
    onChange(arr.filter((_, i) => i !== index));
  };

  const itemField: FieldDefinition =
    field.itemType === "object"
      ? {
          type: "object",
          label: `${field.label} item`,
          fields: field.fields ?? {},
        }
      : field.itemType === "file"
        ? {
            type: "file",
            label: `${field.label} item`,
            multiple: false,
            variants: [
              {
                fileType: "image",
                allowedFormats: ["webp", "jpg", "png"],
                minCount: 1,
                maxCount: 1,
              },
            ],
          }
        : {
            type: field.itemType as "string" | "text",
            label: `${field.label} item`,
          };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        depth === 0 ? "bg-card" : "bg-muted/30",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">{field.label}</p>
        <span className="text-muted-foreground text-xs">
          {arr.length} item{arr.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {arr.map((item, i) => (
          <FieldRenderer
            key={i}
            fieldKey={`${field.label}-${i}`}
            field={itemField}
            value={item}
            onChange={(val) => updateItem(i, val)}
            depth={depth + 1}
            onRemove={() => removeItem(i)} // ← passed here, shows on every item type
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={addItem}
      >
        <HugeiconsIcon icon={AddCircleIcon} />
        Add {field.label} item
      </Button>
    </div>
  );
};
