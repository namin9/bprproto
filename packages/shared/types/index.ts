import { z } from "zod";

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  customDomain: z.string(),
  config: z.record(z.any()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const adminSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  email: z.string().email(),
  role: z.enum(["SUPER_ADMIN", "TENANT_ADMIN", "EDITOR"]),
  createdAt: z.number(),
});
