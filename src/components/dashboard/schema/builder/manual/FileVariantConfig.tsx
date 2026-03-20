"use client";

import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import { Checkbox } from "~/components/ui/checkbox";
import {
  FILE_TYPES,
  FILE_TYPE_FORMATS,
  type FileVariant,
  type FileType,
} from "~/zodSchema/cmsSchema";

interface Props {
  variants: FileVariant[];
  onChange: (variants: FileVariant[]) => void;
  errors?: string[];
}

const emptyVariant = (): FileVariant => ({
  fileType: "image",
  allowedFormats: ["jpg", "jpeg", "png", "webp"],
  minCount: 1,
  maxCount: 1,
});

export const FileVariantConfig: React.FC<Props> = ({
  variants,
  onChange,
  errors,
}) => {
  const addVariant = () => onChange([...variants, emptyVariant()]);

  const removeVariant = (i: number) =>
    onChange(variants.filter((_, idx) => idx !== i));

  const updateVariant = (i: number, patch: Partial<FileVariant>) => {
    onChange(
      variants.map((v, idx) => {
        if (idx !== i) return v;
        const updated = { ...v, ...patch };
        // When file type changes, reset formats to that type's defaults
        if (patch.fileType && patch.fileType !== v.fileType) {
          updated.allowedFormats =
            FILE_TYPE_FORMATS[patch.fileType as FileType] ?? [];
        }
        return updated;
      }),
    );
  };

  const toggleFormat = (variantIdx: number, fmt: string) => {
    const current = variants[variantIdx]!.allowedFormats;
    const next = current.includes(fmt)
      ? current.filter((f) => f !== fmt)
      : [...current, fmt];
    updateVariant(variantIdx, { allowedFormats: next });
  };

  return (
    <div className="flex flex-col gap-4">
      {variants.map((variant, i) => {
        const availableFormats =
          FILE_TYPE_FORMATS[variant.fileType as FileType] ?? [];

        return (
          <div key={i} className="bg-muted flex flex-col gap-3 rounded-xl p-4">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Variant {i + 1}</span>
              {variants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeVariant(i)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
              )}
            </div>

            {/* ── File type ───────────────────────────────────────────── */}
            <Field>
              <FieldLabel>File Type</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {FILE_TYPES.map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => updateVariant(i, { fileType: ft })}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                      variant.fileType === ft
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {ft}
                  </button>
                ))}
              </div>
            </Field>

            {/* ── Allowed formats ─────────────────────────────────────── */}
            <Field>
              <FieldLabel>Allowed Formats</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {availableFormats.map((fmt) => (
                  <label
                    key={fmt}
                    className="flex cursor-pointer items-center gap-1.5"
                  >
                    <Checkbox
                      checked={variant.allowedFormats.includes(fmt)}
                      onCheckedChange={() => toggleFormat(i, fmt)}
                    />
                    <span className="font-mono text-sm">.{fmt}</span>
                  </label>
                ))}
              </div>
              {variant.allowedFormats.length === 0 && (
                <p className="text-destructive text-xs">
                  Select at least one format
                </p>
              )}
            </Field>

            {/* ── Count range ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Min Files</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={variant.minCount}
                  onChange={(e) =>
                    updateVariant(i, {
                      minCount: Math.max(1, Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Max Files</FieldLabel>
                <Input
                  type="number"
                  min={variant.minCount}
                  value={variant.maxCount}
                  onChange={(e) =>
                    updateVariant(i, {
                      maxCount: Math.max(
                        variant.minCount,
                        Number(e.target.value),
                      ),
                    })
                  }
                />
              </Field>
            </div>

            {/* ── Size limits (optional) ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>
                  Min Size{" "}
                  <span className="text-muted-foreground font-normal">
                    (KB, optional)
                  </span>
                </FieldLabel>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 10"
                  value={variant.minSizeKb ?? ""}
                  onChange={(e) =>
                    updateVariant(i, {
                      minSizeKb: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>
                  Max Size{" "}
                  <span className="text-muted-foreground font-normal">
                    (KB, optional)
                  </span>
                </FieldLabel>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 5120"
                  value={variant.maxSizeKb ?? ""}
                  onChange={(e) =>
                    updateVariant(i, {
                      maxSizeKb: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        );
      })}

      {errors && errors.length > 0 && (
        <p className="text-destructive text-sm">{errors[0]}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addVariant}
        className="self-start"
      >
        <HugeiconsIcon icon={AddCircleIcon} />
        Add Variant
      </Button>
    </div>
  );
};
