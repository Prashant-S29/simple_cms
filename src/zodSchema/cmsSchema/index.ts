import { z } from "zod";

// ─── File type config ─────────────────────────────────────────────────────────

export const FILE_TYPES = [
  "image",
  "video",
  "pdf",
  "audio",
  "document",
] as const;

export type FileType = (typeof FILE_TYPES)[number];

export const FILE_TYPE_FORMATS: Record<FileType, string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"],
  video: ["mp4", "webm", "mov", "avi", "mkv"],
  pdf: ["pdf"],
  audio: ["mp3", "wav", "ogg", "aac", "flac"],
  document: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"],
};

export const FileVariantSchema = z
  .object({
    fileType: z.enum(FILE_TYPES),
    allowedFormats: z.array(z.string()).min(1, "Select at least one format"),
    minCount: z.number().int().min(1),
    maxCount: z.number().int().min(1),
    minSizeKb: z.number().int().min(0).optional(),
    maxSizeKb: z.number().int().min(1).optional(),
  })
  .refine((v) => v.maxCount >= v.minCount, {
    message: "Max count must be >= min count",
    path: ["maxCount"],
  })
  .refine(
    (v) =>
      v.maxSizeKb === undefined ||
      v.minSizeKb === undefined ||
      v.maxSizeKb >= v.minSizeKb,
    {
      message: "Max size must be >= min size",
      path: ["maxSizeKb"],
    },
  );

export type FileVariant = z.infer<typeof FileVariantSchema>;

// ─── Field definition (recursive) ────────────────────────────────────────────

export type FieldDefinition =
  | { type: "string"; label: string }
  | { type: "text"; label: string }
  | {
      type: "file";
      label: string;
      multiple: boolean;
      variants: FileVariant[];
    }
  | { type: "object"; label: string; fields: Record<string, FieldDefinition> }
  | {
      type: "array";
      label: string;
      itemType: "string" | "text" | "file" | "object";
      fields?: Record<string, FieldDefinition>; // only when itemType = "object"
    };

export const FieldDefinitionSchema: z.ZodType<FieldDefinition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("string"),
      label: z.string().min(1),
    }),
    z.object({
      type: z.literal("text"),
      label: z.string().min(1),
    }),
    z.object({
      type: z.literal("file"),
      label: z.string().min(1),
      multiple: z.boolean(),
      variants: z
        .array(FileVariantSchema)
        .min(1, "At least one variant required"),
    }),
    z.object({
      type: z.literal("object"),
      label: z.string().min(1),
      fields: z.record(z.string(), FieldDefinitionSchema),
    }),
    z.object({
      type: z.literal("array"),
      label: z.string().min(1),
      itemType: z.enum(["string", "text", "file", "object"]),
      fields: z.record(z.string(), FieldDefinitionSchema).optional(),
    }),
  ]),
);

// ─── Schema structure (root) ──────────────────────────────────────────────────

export const SchemaStructureSchema = z.object({
  type: z.literal("object"),
  fields: z.record(z.string(), FieldDefinitionSchema),
});

export type SchemaStructure = z.infer<typeof SchemaStructureSchema>;

// ─── CRUD schemas ─────────────────────────────────────────────────────────────

export const CreateCmsSchemaSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().max(500, "Max 500 characters").optional(),
});

export const BulkCreateItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().max(500, "Max 500 characters").optional(),
  schemaStructure: SchemaStructureSchema,
});

export const BulkCreateCmsSchemaSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  items: z
    .array(BulkCreateItemSchema)
    .min(1, "At least one schema is required")
    .max(50, "Maximum 50 schemas per bulk creation"),
});

export const ResetSchemaStructureSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const GetCmsSchemasSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  noStructureFirst: z.boolean().default(false),
});

export const GetCmsSchemaBySlugSchema = z.object({
  slug: z.string(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const UpdateCmsSchemaSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const DeleteCmsSchemaSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const SaveSchemaStructureSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  schemaStructure: SchemaStructureSchema,
});

export type BulkCreateItemSchemaType = z.infer<typeof BulkCreateItemSchema>;
export type BulkCreateCmsSchemaSchemaType = z.infer<
  typeof BulkCreateCmsSchemaSchema
>;

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateCmsSchemaSchemaType = z.infer<typeof CreateCmsSchemaSchema>;
export type UpdateCmsSchemaSchemaType = z.infer<typeof UpdateCmsSchemaSchema>;
export type SaveSchemaStructureSchemaType = z.infer<
  typeof SaveSchemaStructureSchema
>;
