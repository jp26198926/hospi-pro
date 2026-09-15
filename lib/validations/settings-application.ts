import { z } from "zod";

export const settingsAppSchema = z.object({
  appLogo: z.string().max(255).optional().nullable(),
  appFavicon: z.string().max(255).optional().nullable(),
  appName: z.string().min(1, "App name is required").max(100),
  appTagline: z.string().max(255).optional().nullable(),
  email: z.string().email("Invalid email").max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  tinNo: z.string().max(50).optional().nullable(),
  timezoneId: z.number().int().positive().optional().nullable(),
  currencyId: z.number().int().positive().optional().nullable(),
  otpDuration: z.number().int().positive().optional().nullable(),
  primaryStorage: z.enum(["filesystem", "cloudinary"]),
  downloadLinkAndroid: z.string().max(255).optional().nullable(),
  downloadLinkIos: z.string().max(255).optional().nullable(),
});

export type SettingsAppInput = z.infer<typeof settingsAppSchema>;
