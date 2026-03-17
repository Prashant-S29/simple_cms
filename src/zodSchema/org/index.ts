import z from "zod";

export const CreateOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Org name must be at least 2 characters.")
    .max(50, "Org name must be at most 50 characters."),
});

export type CreateOrgSchemaType = z.infer<typeof CreateOrgSchema>;

export const UpdateOrgSchema = z.object({
  id: z.string().uuid("Invalid organization ID."),
  name: z
    .string()
    .min(2, "Org name must be at least 2 characters.")
    .max(50, "Org name must be at most 50 characters."),
});

export type UpdateOrgSchemaType = z.infer<typeof UpdateOrgSchema>;

export const GetOrgsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
});

export type GetOrgsSchemaType = z.infer<typeof GetOrgsSchema>;

export const GetOrgBySlugSchema = z.object({
  slug: z.string().min(1, "Slug is required."),
});

export type GetOrgBySlugSchemaType = z.infer<typeof GetOrgBySlugSchema>;
