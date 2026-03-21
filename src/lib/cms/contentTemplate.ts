import type { FieldDefinition, SchemaStructure } from "~/zodSchema/cmsSchema";

/**
 * Generates the expected JSON template from a schema structure.
 * Shows one representative item for arrays.
 * Used as the readonly "expected structure" panel in JSON mode.
 */
export function generateContentTemplate(
  structure: SchemaStructure,
): Record<string, unknown> {
  return templateFields(structure.fields);
}

function templateFields(
  fields: Record<string, FieldDefinition>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    result[key] = templateField(key, field);
  }
  return result;
}

function templateField(key: string, field: FieldDefinition): unknown {
  switch (field.type) {
    case "string":
    case "text":
    case "file":
      return "";

    case "object":
      return templateFields(field.fields ?? {});

    case "array":
      if (field.itemType === "object") {
        return [templateFields(field.fields ?? {})];
      }
      return [""];
  }
}

// ─── Validator ────────────────────────────────────────────────────────────────

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Validates that a parsed content object matches the schema structure.
 * Does not enforce values — only checks shape and types.
 * Missing keys default to empty (not an error). Extra keys are ignored.
 */
export function validateContentAgainstSchema(
  content: unknown,
  structure: SchemaStructure,
): ValidationResult {
  const errors: string[] = [];
  validateFields(content, structure.fields, "", errors);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateFields(
  obj: unknown,
  fields: Record<string, FieldDefinition>,
  path: string,
  errors: string[],
): void {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    errors.push(
      `${path || "root"}: expected an object, got ${Array.isArray(obj) ? "array" : typeof obj}`,
    );
    return;
  }

  const record = obj as Record<string, unknown>;

  for (const [key, field] of Object.entries(fields)) {
    const fieldPath = path ? `${path}.${key}` : key;
    const value = record[key];

    // Missing key is fine — treated as empty
    if (value === undefined || value === null) continue;

    validateField(value, field, fieldPath, errors);
  }
}

function validateField(
  value: unknown,
  field: FieldDefinition,
  path: string,
  errors: string[],
): void {
  switch (field.type) {
    case "string":
    case "text":
    case "file":
      if (typeof value !== "string") {
        errors.push(`"${path}": expected a string, got ${typeof value}`);
      }
      break;

    case "object":
      validateFields(value, field.fields ?? {}, path, errors);
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push(`"${path}": expected an array, got ${typeof value}`);
        break;
      }
      if (field.itemType === "object") {
        value.forEach((item, i) => {
          validateFields(item, field.fields ?? {}, `${path}[${i}]`, errors);
        });
      } else {
        value.forEach((item, i) => {
          if (typeof item !== "string") {
            errors.push(
              `"${path}[${i}]": expected a string, got ${typeof item}`,
            );
          }
        });
      }
      break;
  }
}
