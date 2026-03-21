import { z } from "zod";

export const GetContentSchema = z.object({
  schemaSlug: z.string(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
});

export const SaveContentSchema = z.object({
  schemaId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  content: z.record(z.string(), z.unknown()),
});

export type GetContentSchemaType = z.infer<typeof GetContentSchema>;
export type SaveContentSchemaType = z.infer<typeof SaveContentSchema>;
