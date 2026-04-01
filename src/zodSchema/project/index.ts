import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(500).optional(),
  orgId: z.string().uuid("Invalid organization ID"),
});

export const GetProjectsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  orgId: z.string().uuid(),
});

export const GetProjectBySlugSchema = z.object({
  slug: z.string().min(1),
  orgId: z.string().uuid(),
});

export const UpdateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Project name is required").max(100).optional(),
  description: z.string().max(500).optional(),
});

export const UpdateProjectWebhookSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  webhookUrl: z.string().url("Must be a valid URL").nullable().optional(),
  webhookSecret: z.string().max(256).nullable().optional(),
});

export type CreateProjectSchemaType = z.infer<typeof CreateProjectSchema>;
export type GetProjectsSchemaType = z.infer<typeof GetProjectsSchema>;
export type UpdateProjectSchemaType = z.infer<typeof UpdateProjectSchema>;
export type UpdateProjectWebhookSchemaType = z.infer<
  typeof UpdateProjectWebhookSchema
>;
