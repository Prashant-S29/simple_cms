"use client";

import React, { useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AddCircleIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Edit03Icon,
  TextIcon,
  AlignLeftIcon,
  Image01Icon,
  FolderLibraryIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { AddFieldDialog } from "./AddFieldDialog";
import type { FieldDefinition } from "~/zodSchema/cmsSchema";
import { cn } from "~/lib/utils";

// ─── Field type meta ──────────────────────────────────────────────────────────

const FIELD_META: Record<
  string,
  { icon: IconSvgElement; color: string; label: string }
> = {
  string: { icon: TextIcon, color: "text-blue-500", label: "Short Text" },
  text: { icon: AlignLeftIcon, color: "text-purple-500", label: "Long Text" },
  file: { icon: Image01Icon, color: "text-green-500", label: "File" },
  object: {
    icon: FolderLibraryIcon,
    color: "text-orange-500",
    label: "Object",
  },
  array: { icon: ListViewIcon, color: "text-pink-500", label: "Array" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  fieldKey: string;
  field: FieldDefinition;
  depth: number;
  /** Called when this field itself is updated (label/type change) */
  onUpdate: (key: string, field: FieldDefinition) => void;
  /** Called when this field is deleted */
  onDelete: (key: string) => void;
  /** Called when a child field is added/updated inside an object or array */
  onChildChange: (
    parentKey: string,
    childKey: string,
    childField: FieldDefinition,
  ) => void;
  /** Called when a child field is deleted */
  onChildDelete: (parentKey: string, childKey: string) => void;
  readOnly: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FieldNode: React.FC<Props> = ({
  fieldKey,
  field,
  depth,
  onUpdate,
  onDelete,
  onChildChange,
  onChildDelete,
  readOnly,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);

  const meta = FIELD_META[field.type] ?? FIELD_META.string!;

  const isExpandable =
    (field.type === "object" && Object.keys(field.fields ?? {}).length > 0) ||
    (field.type === "array" &&
      field.itemType === "object" &&
      Object.keys(field.fields ?? {}).length > 0);

  const canAddChild =
    field.type === "object" ||
    (field.type === "array" && field.itemType === "object");

  const childFields =
    field.type === "object"
      ? field.fields
      : field.type === "array" && field.itemType === "object"
        ? field.fields
        : undefined;

  const usedChildKeys = Object.keys(childFields ?? {});

  // ── Edit handler ───────────────────────────────────────────────────────────
  const handleEdit = (key: string, updated: FieldDefinition) => {
    onUpdate(key, updated);
  };

  // ── Add child ──────────────────────────────────────────────────────────────
  const handleAddChild = (childKey: string, childField: FieldDefinition) => {
    onChildChange(fieldKey, childKey, childField);
    setExpanded(true);
  };

  // ── Child update (nested) ──────────────────────────────────────────────────
  const handleChildUpdate = (childKey: string, childField: FieldDefinition) => {
    onChildChange(fieldKey, childKey, childField);
  };

  const handleChildDelete = (childKey: string) => {
    onChildDelete(fieldKey, childKey);
  };

  const handleGrandchildChange = (
    childKey: string,
    grandchildKey: string,
    grandchildField: FieldDefinition,
  ) => {
    if (!childFields) return;
    const childField = childFields[childKey];
    if (!childField) return;

    if (childField.type === "object") {
      const updated: FieldDefinition = {
        ...childField,
        fields: { ...childField.fields, [grandchildKey]: grandchildField },
      };
      onChildChange(fieldKey, childKey, updated);
    } else if (
      childField.type === "array" &&
      childField.itemType === "object"
    ) {
      const updated: FieldDefinition = {
        ...childField,
        fields: {
          ...(childField.fields ?? {}),
          [grandchildKey]: grandchildField,
        },
      };
      onChildChange(fieldKey, childKey, updated);
    }
  };

  const handleGrandchildDelete = (childKey: string, grandchildKey: string) => {
    if (!childFields) return;
    const childField = childFields[childKey];
    if (!childField) return;

    if (childField.type === "object") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [grandchildKey]: _, ...rest } = childField.fields ?? {};
      onChildChange(fieldKey, childKey, { ...childField, fields: rest });
    } else if (
      childField.type === "array" &&
      childField.itemType === "object"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [grandchildKey]: _, ...rest } = childField.fields ?? {};
      onChildChange(fieldKey, childKey, {
        ...childField,
        fields: Object.keys(rest).length > 0 ? rest : undefined,
      });
    }
  };

  return (
    <div className={cn("flex flex-col", depth > 0 && "ml-6 border-l pl-3")}>
      <div
        className={cn(
          "group hover:bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-1.5",
          isExpandable ? "cursor-pointer" : "cursor-default",
        )}
        onClick={() => isExpandable && setExpanded((v) => !v)}
      >
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted-foreground rounded-sm"
          disabled={!isExpandable}
        >
          {isExpandable ? (
            expanded ? (
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
            ) : (
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
            )
          ) : null}
        </Button>

        <HugeiconsIcon icon={meta.icon} size={16} className={meta.color} />
        <code className="text-sm font-medium">{fieldKey}</code>
        <span className="text-muted-foreground text-sm">{field.label}</span>
        <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
          {field.type}
          {field.type === "array" && ` of ${field.itemType}`}
        </span>

        {field.type === "file" && (
          <div className="flex items-center gap-1">
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
                {v.fileType} ({v.allowedFormats.join(", ")}) {v.minCount}–
                {v.maxCount}
              </span>
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
            {canAddChild && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddChildOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Add child field"
              >
                <HugeiconsIcon icon={AddCircleIcon} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit field"
            >
              <HugeiconsIcon icon={Edit03Icon} />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(fieldKey);
              }}
              className="text-destructive hover:text-destructive/80"
              aria-label="Delete field"
            >
              <HugeiconsIcon icon={Delete02Icon} />
            </Button>
          </div>
        )}
      </div>

      {childFields && (
        <div
          className={`flex flex-col ${expanded ? "max-h-[400vh]" : "max-h-0"} overflow-hidden pt-0.5 duration-200 ease-in-out`}
        >
          {Object.entries(childFields).map(([k, f]) => (
            <FieldNode
              key={k}
              fieldKey={k}
              field={f}
              depth={depth + 1}
              onUpdate={handleChildUpdate}
              onDelete={handleChildDelete}
              onChildChange={handleGrandchildChange}
              onChildDelete={handleGrandchildDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <AddFieldDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={{ key: fieldKey, field }}
        usedKeys={[]}
        onConfirm={handleEdit}
      />

      <AddFieldDialog
        open={addChildOpen}
        onOpenChange={setAddChildOpen}
        usedKeys={usedChildKeys}
        onConfirm={handleAddChild}
      />
    </div>
  );
};
