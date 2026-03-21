"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Database02Icon } from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { FieldNode } from "./FieldNode";
import { AddFieldDialog } from "./AddFieldDialog";
import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";

interface Props {
  currentDraft: SchemaStructure | null;
  onChange: (structure: SchemaStructure) => void;
  readOnly: boolean;
}

export const ManualBuilder: React.FC<Props> = ({
  currentDraft,
  onChange,
  readOnly,
}) => {
  const [addRootOpen, setAddRootOpen] = useState(false);

  const structure: SchemaStructure = currentDraft ?? {
    type: "object",
    fields: {},
  };

  const rootFields = structure.fields;
  const usedRootKeys = Object.keys(rootFields);

  const emitChange = (fields: Record<string, FieldDefinition>) => {
    onChange({ type: "object", fields });
  };

  const handleAddRoot = (key: string, field: FieldDefinition) => {
    emitChange({ ...rootFields, [key]: field });
  };

  const handleUpdateRoot = (key: string, field: FieldDefinition) => {
    emitChange({ ...rootFields, [key]: field });
  };

  const handleDeleteRoot = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _, ...rest } = rootFields;
    emitChange(rest);
  };

  const handleChildChange = (
    parentKey: string,
    childKey: string,
    childField: FieldDefinition,
  ) => {
    const parent = rootFields[parentKey];
    if (!parent) return;

    if (parent.type === "object") {
      const updated: FieldDefinition = {
        ...parent,
        fields: { ...parent.fields, [childKey]: childField },
      };
      emitChange({ ...rootFields, [parentKey]: updated });
    } else if (parent.type === "array" && parent.itemType === "object") {
      const updated: FieldDefinition = {
        ...parent,
        fields: { ...(parent.fields ?? {}), [childKey]: childField },
      };
      emitChange({ ...rootFields, [parentKey]: updated });
    }
  };

  const handleChildDelete = (parentKey: string, childKey: string) => {
    const parent = rootFields[parentKey];
    if (!parent) return;

    if (parent.type === "object") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [childKey]: _, ...rest } = parent.fields ?? {};
      emitChange({
        ...rootFields,
        [parentKey]: { ...parent, fields: rest },
      });
    } else if (parent.type === "array" && parent.itemType === "object") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [childKey]: _, ...rest } = parent.fields ?? {};
      emitChange({
        ...rootFields,
        [parentKey]: {
          ...parent,
          fields: Object.keys(rest).length > 0 ? rest : undefined,
        },
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="bg-card rounded-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Add fields one by one. Object and Array fields can contain nested
              fields.
            </p>
          </div>
          {!readOnly && (
            <Button size="sm" onClick={() => setAddRootOpen(true)}>
              <HugeiconsIcon icon={AddCircleIcon} />
              Add Field
            </Button>
          )}
        </div>

        <div className="p-4">
          {usedRootKeys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
                <HugeiconsIcon
                  icon={Database02Icon}
                  className="text-muted-foreground"
                />
              </div>
              <div>
                <p className="font-medium">No fields yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {readOnly
                    ? "This schema has no fields defined."
                    : 'Click "Add Field" to start building your schema.'}
                </p>
              </div>
              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddRootOpen(true)}
                >
                  <HugeiconsIcon icon={AddCircleIcon} />
                  Add First Field
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {Object.entries(rootFields).map(([key, field]) => (
                <FieldNode
                  key={key}
                  fieldKey={key}
                  field={field}
                  depth={0}
                  onUpdate={handleUpdateRoot}
                  onDelete={handleDeleteRoot}
                  onChildChange={handleChildChange}
                  onChildDelete={handleChildDelete}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddFieldDialog
        open={addRootOpen}
        onOpenChange={setAddRootOpen}
        usedKeys={usedRootKeys}
        onConfirm={handleAddRoot}
      />
    </div>
  );
};
