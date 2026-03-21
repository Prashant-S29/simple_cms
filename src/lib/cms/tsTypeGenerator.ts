import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";

/**
 * Generates a TypeScript type definition from a schema structure.
 *
 * Rules:
 *   string / text / file → string
 *   object               → { key: Type; ... }
 *   array of string/text → string[]
 *   array of object      → Array<{ key: Type; ... }>
 *
 * Output uses `type` (not `interface`) as requested.
 * Top-level export name is derived from the schema slug:
 *   "cdp-page" → CdpPage_JsonType
 */
export function generateTsType(
  structure: SchemaStructure,
  schemaSlug: string,
): string {
  const typeName = slugToTypeName(schemaSlug);
  const body = renderFields(structure.fields, 0);
  return `export type ${typeName} = ${body};`;
}

function slugToTypeName(slug: string): string {
  if (!slug) return "Schema_JsonType";

  const pascal = slug
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${pascal}_JsonType`;
}

function renderFields(
  fields: Record<string, FieldDefinition>,
  depth: number,
): string {
  const indent = "  ".repeat(depth + 1);
  const closingIndent = "  ".repeat(depth);

  const lines = Object.entries(fields).map(([key, field]) => {
    const type = renderFieldType(field, depth + 1);
    return `${indent}${key}: ${type};`;
  });

  if (lines.length === 0) return "Record<string, never>";
  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}

function renderFieldType(field: FieldDefinition, depth: number): string {
  switch (field.type) {
    case "string":
    case "text":
    case "file":
      return "string";

    case "object": {
      if (!field.fields || Object.keys(field.fields).length === 0) {
        return "Record<string, never>";
      }
      return renderFields(field.fields, depth);
    }

    case "array": {
      if (field.itemType === "object") {
        const inner =
          field.fields && Object.keys(field.fields).length > 0
            ? renderFields(field.fields, depth)
            : "Record<string, never>";
        return `Array<${inner}>`;
      }
      return "string[]";
    }
  }
}
