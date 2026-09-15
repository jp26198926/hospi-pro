import { z } from "zod";

export const settingsMailSchema = z.object({
  smtpHost: z.string().max(255).optional().nullable(),
  smtpPort: z.number().int().positive().optional().nullable(),
  smtpUsername: z.string().max(100).optional().nullable(),
  smtpPassword: z.string().max(255).optional().nullable(),
  smtpFromEmail: z.string().email("Invalid email").max(100).optional().nullable(),
  smtpSenderName: z.string().max(100).optional().nullable(),
  smtpCrypto: z.string().max(10).optional().nullable(),
});

export type SettingsMailInput = z.infer<typeof settingsMailSchema>;
