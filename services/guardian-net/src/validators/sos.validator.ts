import { z } from 'zod';

export const sosSchema = z.object({
  type: z.enum(['hardware', 'voice', 'tap']),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    address: z.string().optional(),
  }),
  userId: z.string().min(1),
  deviceId: z.string().optional(),
  voiceKeyword: z.string().optional(),
});

export const safetyQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().positive().default(2),
});

export type SosPayload = z.infer<typeof sosSchema>;
export type SafetyQuery = z.infer<typeof safetyQuerySchema>;
