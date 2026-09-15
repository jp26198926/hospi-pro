import { z } from "zod";

export const settingsCloudinarySchema = z.object({
  cloudinaryName: z.string().max(255).optional().nullable(),
  cloudinaryApiKey: z.string().max(255).optional().nullable(),
  cloudinaryApiSecret: z.string().max(255).optional().nullable(),
});

export type SettingsCloudinaryInput = z.infer<typeof settingsCloudinarySchema>;
