import { z } from "zod";

export const settingsSmsSchema = z.object({
  textbeeApiKey: z.string().max(255).optional().nullable(),
  textbeeDeviceId: z.string().max(255).optional().nullable(),
});

export type SettingsSmsInput = z.infer<typeof settingsSmsSchema>;
