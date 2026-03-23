import { z } from "zod";

export const CreateApiKeySchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const RevokeApiKeySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const GetApiKeysSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export type CreateApiKeySchemaType = z.infer<typeof CreateApiKeySchema>;
