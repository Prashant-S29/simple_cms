import { z } from "zod";

export const AddLanguageSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  label: z.string().min(1).max(100),
});

export const BulkAddLanguageSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locales: z
    .array(
      z.object({
        locale: z.string().min(2).max(10),
        label: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(20),
});

export const SetLanguageStatusSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
});

export const DeleteLanguageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const GetLanguagesSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export type BulkAddLanguageSchemaType = z.infer<typeof BulkAddLanguageSchema>;

export type AddLanguageSchemaType = z.infer<typeof AddLanguageSchema>;
