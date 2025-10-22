import { z } from 'zod';

export const verifyRequestSchema = z.object({
  txSig: z.string().min(1, 'txSig is required'),
  reference: z.string().optional(),
  minLamports: z.number().int().nonnegative(),
  isPrivate: z.boolean().optional().default(false),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;
