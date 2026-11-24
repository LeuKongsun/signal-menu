import { z } from "zod";

export const realtimeSchema = {
  order: {
    updated: z.object({
      id: z.string().uuid(),
      orderNumber: z.string().regex(/^SIG-\d{4}$/),
      status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]),
    }),
  },
  loyalty: {
    registered: z.object({
      telegramId: z.string().regex(/^\d{1,32}$/),
      telegramName: z.string().min(1).max(120),
      qrToken: z.string().min(20).max(80),
    }),
    updated: z.object({
      telegramId: z.string().regex(/^\d{1,32}$/),
      stamps: z.number().int().min(0).max(9),
      totalEarned: z.number().int().nonnegative(),
      freeDrinksClaimed: z.number().int().nonnegative(),
      freeDrinksRedeemed: z.number().int().nonnegative(),
    }),
  },
};
