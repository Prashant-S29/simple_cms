import type {
  FieldDefinition,
  FileVariant,
  SchemaStructure,
} from "~/zodSchema/cmsSchema";
import { FILE_EXTENSION_MAP } from "../constants";

// ─── File detection config ────────────────────────────────────────────────────

/**
 * Key patterns that hint at a file field, mapped to default file type config.
 * Checked case-insensitively against the field key.
 *
 * Order matters — more specific patterns first.
 */
const KEY_PATTERN_MAP: {
  pattern: RegExp;
  fileType: string;
  formats: string[];
}[] = [
  // Video hints
  {
    pattern: /video/i,
    fileType: "video",
    formats: ["mp4", "webm", "mov"],
  },
  // PDF hints
  {
    pattern: /pdf|document|doc|file/i,
    fileType: "pdf",
    formats: ["pdf"],
  },
  // Audio hints
  {
    pattern: /audio|sound|music|track/i,
    fileType: "audio",
    formats: ["mp3", "wav", "ogg"],
  },
  // Image hints — most common, checked last so more specific patterns win
  {
    pattern:
      /image|img|photo|picture|banner|thumbnail|avatar|icon|logo|cover|background|bg|hero|slider|gallery|portrait|landscape/i,
    fileType: "image",
    formats: ["webp", "jpg", "jpeg", "png"],
  },
];

// ─── Detection helpers ────────────────────────────────────────────────────────

/**
 * Try to detect file type from the actual string value.
 * Looks for a file extension at the end of the path/URL.
 * e.g. "/about/team.webp" → image, ["webp"]
 */
function detectFileFromValue(
  value: string,
): { fileType: string; formats: string[] } | null {
  const ext = value.split(".").pop()?.toLowerCase().split("?")[0]; // strip query string
  if (!ext) return null;
  return FILE_EXTENSION_MAP[ext] ?? null;
}

/**
 * Try to detect file type from the key name pattern.
 * e.g. "heroSliderImage" → image, "backgroundVideo" → video
 */
function detectFileFromKey(
  key: string,
): { fileType: string; formats: string[] } | null {
  for (const { pattern, fileType, formats } of KEY_PATTERN_MAP) {
    if (pattern.test(key)) {
      return { fileType, formats };
    }
  }
  return null;
}

/**
 * Build a FileVariant from detected file info.
 */
function makeFileVariant(fileType: string, formats: string[]): FileVariant {
  return {
    fileType: fileType as FileVariant["fileType"],
    allowedFormats: formats,
    minCount: 1,
    maxCount: 1,
  };
}

// ─── Field inference ──────────────────────────────────────────────────────────

/**
 * Infers a FieldDefinition from a JSON value + key.
 *
 * Detection priority:
 *   1. Value-based: if it's a string ending in a known file extension → file
 *   2. Key-based:   if the key matches a file pattern → file
 *   3. Content:     string (short/long), array, object, fallback
 */
function inferField(key: string, value: unknown): FieldDefinition {
  if (/alt/i.test(key)) {
    return { type: "string", label: labelFromKey(key) };
  }

  // ── null / undefined ──────────────────────────────────────────────────────
  if (value === null || value === undefined) {
    // Even for null, check key pattern — it might be an optional image
    const keyHint = detectFileFromKey(key);
    if (keyHint) {
      return {
        type: "file",
        label: labelFromKey(key),
        multiple: false,
        variants: [makeFileVariant(keyHint.fileType, keyHint.formats)],
      };
    }
    return { type: "string", label: labelFromKey(key) };
  }

  // ── String value ──────────────────────────────────────────────────────────
  if (typeof value === "string") {
    // 1. Check actual value for file extension
    const valueHint = detectFileFromValue(value);
    if (valueHint) {
      return {
        type: "file",
        label: labelFromKey(key),
        multiple: false,
        variants: [makeFileVariant(valueHint.fileType, valueHint.formats)],
      };
    }

    // 2. Check key pattern
    const keyHint = detectFileFromKey(key);
    if (keyHint) {
      return {
        type: "file",
        label: labelFromKey(key),
        multiple: false,
        variants: [makeFileVariant(keyHint.fileType, keyHint.formats)],
      };
    }

    // 3. Plain text
    return {
      type: value.length > 80 ? "text" : "string",
      label: labelFromKey(key),
    };
  }

  // ── Number or boolean ─────────────────────────────────────────────────────
  if (typeof value === "number" || typeof value === "boolean") {
    return { type: "string", label: labelFromKey(key) };
  }

  // ── Array ─────────────────────────────────────────────────────────────────
  if (Array.isArray(value)) {
    if (value.length === 0) {
      // Empty array — check key for file hint
      const keyHint = detectFileFromKey(key);
      if (keyHint) {
        return {
          type: "file",
          label: labelFromKey(key),
          multiple: true,
          variants: [makeFileVariant(keyHint.fileType, keyHint.formats)],
        };
      }
      return { type: "array", label: labelFromKey(key), itemType: "string" };
    }

    const firstItem = value[0];

    // Array of objects → recurse first item
    if (
      typeof firstItem === "object" &&
      firstItem !== null &&
      !Array.isArray(firstItem)
    ) {
      return {
        type: "array",
        label: labelFromKey(key),
        itemType: "object",
        fields: inferFields(firstItem as Record<string, unknown>),
      };
    }

    // Array of strings — check if they look like file paths
    if (typeof firstItem === "string") {
      const valueHint = detectFileFromValue(firstItem);
      if (valueHint) {
        // Multiple file upload
        return {
          type: "file",
          label: labelFromKey(key),
          multiple: true,
          variants: [makeFileVariant(valueHint.fileType, valueHint.formats)],
        };
      }

      // Check key pattern
      const keyHint = detectFileFromKey(key);
      if (keyHint) {
        return {
          type: "file",
          label: labelFromKey(key),
          multiple: true,
          variants: [makeFileVariant(keyHint.fileType, keyHint.formats)],
        };
      }

      return {
        type: "array",
        label: labelFromKey(key),
        itemType: firstItem.length > 80 ? "text" : "string",
      };
    }

    // Fallback
    return { type: "array", label: labelFromKey(key), itemType: "string" };
  }

  // ── Plain object ──────────────────────────────────────────────────────────
  if (typeof value === "object") {
    return {
      type: "object",
      label: labelFromKey(key),
      fields: inferFields(value as Record<string, unknown>),
    };
  }

  // ── Final fallback ────────────────────────────────────────────────────────
  return { type: "string", label: labelFromKey(key) };
}

/**
 * Recursively infer all fields from a plain object.
 */
function inferFields(
  obj: Record<string, unknown>,
): Record<string, FieldDefinition> {
  const result: Record<string, FieldDefinition> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] = inferField(key, value);
  }
  return result;
}

/**
 * Convert a camelCase or snake_case key into a readable label.
 * e.g. "heroTitle" → "Hero Title", "hero_title" → "Hero Title"
 */
function labelFromKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Main entry point.
 * Accepts any parsed JSON value and returns a SchemaStructure.
 * Throws a descriptive error if the root is not a plain object.
 */
export function jsonToSchemaStructure(json: unknown): SchemaStructure {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error(
      "Root JSON must be a plain object (e.g. { hero: { ... }, mission: { ... } })",
    );
  }

  return {
    type: "object",
    fields: inferFields(json as Record<string, unknown>),
  };
}
