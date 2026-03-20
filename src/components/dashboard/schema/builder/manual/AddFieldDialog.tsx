"use client";

import React, { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { FileVariantConfig } from "./FileVariantConfig";
import type { FieldDefinition, FileVariant } from "~/zodSchema/cmsSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldFormState =
  | { type: "string"; key: string; label: string }
  | { type: "text"; key: string; label: string }
  | {
      type: "file";
      key: string;
      label: string;
      multiple: boolean;
      variants: FileVariant[];
    }
  | { type: "object"; key: string; label: string }
  | {
      type: "array";
      key: string;
      label: string;
      itemType: "string" | "text" | "file" | "object";
    };

type FieldType = FieldDefinition["type"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, we are editing an existing field */
  existing?: { key: string; field: FieldDefinition };
  /** Keys already used at this level — to prevent duplicates */
  usedKeys: string[];
  onConfirm: (key: string, field: FieldDefinition) => void;
}

const FIELD_TYPES: { value: FieldType; label: string; desc: string }[] = [
  { value: "string", label: "Short Text", desc: "Single line text" },
  { value: "text", label: "Long Text", desc: "Multiline / paragraph" },
  { value: "file", label: "File Upload", desc: "Image, video, PDF, etc." },
  { value: "object", label: "Object", desc: "Named group of fields" },
  {
    value: "array",
    label: "Array",
    desc: "Repeatable list of items",
  },
];

const ARRAY_ITEM_TYPES: {
  value: "string" | "text" | "file" | "object";
  label: string;
}[] = [
  { value: "string", label: "Short Text" },
  { value: "text", label: "Long Text" },
  { value: "file", label: "File Upload" },
  { value: "object", label: "Object" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AddFieldDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  existing,
  usedKeys,
  onConfirm,
}) => {
  const isEditing = !!existing;

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("string");
  const [multiple, setMultiple] = useState(false);
  const [variants, setVariants] = useState<FileVariant[]>([
    {
      fileType: "image",
      allowedFormats: ["jpg", "jpeg", "png", "webp"],
      minCount: 1,
      maxCount: 1,
    },
  ]);
  const [arrayItemType, setArrayItemType] = useState<
    "string" | "text" | "file" | "object"
  >("string");

  const [keyError, setKeyError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;

    if (existing) {
      setKey(existing.key);
      setLabel(existing.field.label);
      setType(existing.field.type);

      if (existing.field.type === "file") {
        setMultiple(existing.field.multiple);
        setVariants(existing.field.variants);
      }
      if (existing.field.type === "array") {
        setArrayItemType(existing.field.itemType);
      }
    } else {
      // Reset for new field
      setKey("");
      setLabel("");
      setType("string");
      setMultiple(false);
      setVariants([
        {
          fileType: "image",
          allowedFormats: ["jpg", "jpeg", "png", "webp"],
          minCount: 1,
          maxCount: 1,
        },
      ]);
      setArrayItemType("string");
    }

    setKeyError(null);
    setLabelError(null);
    setVariantError(null);
  }, [open, existing]);

  // Auto-fill label from key when label is empty
  const handleKeyChange = (val: string) => {
    const sanitized = val
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    setKey(sanitized);
    setKeyError(null);
    if (!label) {
      setLabel(
        sanitized.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      );
    }
  };

  const validate = (): boolean => {
    let valid = true;

    if (!key.trim()) {
      setKeyError("Key is required");
      valid = false;
    } else if (!isEditing && usedKeys.includes(key)) {
      setKeyError(`"${key}" is already used at this level`);
      valid = false;
    } else if (isEditing && key !== existing!.key && usedKeys.includes(key)) {
      setKeyError(`"${key}" is already used at this level`);
      valid = false;
    }

    if (!label.trim()) {
      setLabelError("Label is required");
      valid = false;
    }

    if (type === "file") {
      if (variants.length === 0) {
        setVariantError("At least one file variant is required");
        valid = false;
      } else if (variants.some((v) => v.allowedFormats.length === 0)) {
        setVariantError("Each variant must have at least one allowed format");
        valid = false;
      }
    }

    return valid;
  };

  const handleConfirm = () => {
    if (!validate()) return;

    let field: FieldDefinition;

    switch (type) {
      case "string":
        field = { type: "string", label };
        break;
      case "text":
        field = { type: "text", label };
        break;
      case "file":
        field = { type: "file", label, multiple, variants };
        break;
      case "object":
        // Fields will be added separately once the object node exists
        field = {
          type: "object",
          label,
          fields:
            existing?.field.type === "object"
              ? (existing.field.fields ?? {})
              : {},
        };
        break;
      case "array":
        field = {
          type: "array",
          label,
          itemType: arrayItemType,
          // Preserve existing sub-fields if editing object array
          fields:
            arrayItemType === "object" &&
            existing?.field.type === "array" &&
            existing.field.itemType === "object"
              ? (existing.field.fields ?? {})
              : arrayItemType === "object"
                ? {}
                : undefined,
        };
        break;
    }

    onConfirm(key, field!);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Field"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!keyError}>
              <FieldLabel htmlFor="field-key">
                Key{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (used in API response)
                </span>
              </FieldLabel>
              <Input
                id="field-key"
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="e.g. heroTitle, bannerImage"
                autoComplete="off"
                aria-invalid={!!keyError}
                disabled={isEditing}
              />
              {keyError && <FieldError errors={[{ message: keyError }]} />}
            </Field>

            <Field data-invalid={!!labelError}>
              <FieldLabel htmlFor="field-label">
                Label{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (shown to manager)
                </span>
              </FieldLabel>
              <Input
                id="field-label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setLabelError(null);
                }}
                placeholder="e.g. Hero Title"
                autoComplete="off"
                aria-invalid={!!labelError}
              />
              {labelError && <FieldError errors={[{ message: labelError }]} />}
            </Field>
          </div>

          {/* ── Type ────────────────────────────────────────────────── */}
          <Field>
            <FieldLabel>Field Type</FieldLabel>
            <div className="grid grid-cols-5 gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                    type === ft.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-medium">{ft.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {ft.desc}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          {type === "array" && (
            <Field>
              <FieldLabel>Item Type</FieldLabel>
              <div className="grid grid-cols-4 gap-2">
                {ARRAY_ITEM_TYPES.map((it) => (
                  <button
                    key={it.value}
                    type="button"
                    onClick={() => setArrayItemType(it.value)}
                    className={`flex items-center rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      arrayItemType === it.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {/* ── File config ──────────────────────────────────────────── */}
          {type === "file" && (
            <>
              <Field>
                <div className="flex items-center justify-between">
                  <div>
                    <FieldLabel>Allow Multiple Files</FieldLabel>
                    <p className="text-muted-foreground text-xs">
                      Manager can upload more than one file for this field
                    </p>
                  </div>
                  <Switch checked={multiple} onCheckedChange={setMultiple} />
                </div>
              </Field>

              <Field data-invalid={!!variantError}>
                <FieldLabel>File Variants</FieldLabel>
                <p className="text-muted-foreground mb-2 text-xs">
                  Define what file types and sizes are allowed. Add multiple
                  variants for mixed uploads (e.g. 3 images + 2 PDFs).
                </p>
                <FileVariantConfig
                  variants={variants}
                  onChange={setVariants}
                  errors={variantError ? [variantError] : undefined}
                />
              </Field>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {isEditing ? "Save Changes" : "Add Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
