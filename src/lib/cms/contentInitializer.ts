import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";

/**
 * Builds an empty content object from a schema structure.
 * Every field gets its zero value:
 *   string / text / file → ""
 *   object               → recurse
 *   array                → []
 *
 * This is used when a content record doesn't exist yet — the manager
 * gets a pre-shaped empty form rather than a blank slate.
 */
export function initContentFromSchema(
  structure: SchemaStructure,
): Record<string, unknown> {
  return initFields(structure.fields);
}

function initFields(
  fields: Record<string, FieldDefinition>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    result[key] = initField(field);
  }
  return result;
}

function initField(field: FieldDefinition): unknown {
  switch (field.type) {
    case "string":
    case "text":
    case "file":
      return "";

    case "object":
      return initFields(field.fields ?? {});

    case "array":
      return [];
  }
}
