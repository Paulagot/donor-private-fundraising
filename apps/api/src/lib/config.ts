// apps/api/src/lib/config.ts
import dotenv from 'dotenv';
dotenv.config();

// Build an array of allowed origins from env:
// Prefer ALLOWED_ORIGINS (comma-separated), otherwise fall back to PUBLIC_WEBSITE_ORIGIN, or '*' (allow all)
const rawOrigins =
  process.env.ALLOWED_ORIGINS ??
  process.env.PUBLIC_WEBSITE_ORIGIN ??
  '*';

const parsedAllowedOrigins =
  rawOrigins === '*'
    ? ['*']
    : rawOrigins
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

export const config = {
  rpcUrl: process.env.RPC_URL || process.env.SHARED_RPC_URL || 'https://api.devnet.solana.com',
  donationAddress: process.env.DONATION_SOL_ADDRESS || '',
  arciumApiKey: process.env.ARCIUM_API_KEY || '',
  arciumCluster: process.env.ARCIUM_CLUSTER || 'devnet',
  callbackMode: (process.env.CALLBACK_MODE || 'onchain') as 'onchain' | 'server',
  tipjarProgramId: process.env.TIPJAR_PROGRAM_ID || '',
  port: parseInt(process.env.PORT || '3001', 10),

  // keep old single-origin setting for backwards compatibility
  publicWebsiteOrigin: process.env.PUBLIC_WEBSITE_ORIGIN || '*',

  // NEW: what index.ts expects
  allowedOrigins: parsedAllowedOrigins,

  // Tier thresholds (lamports)
  tiers: [
    parseInt(process.env.MIN_TIER_LAMPORTS_0 || String(0.1 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_1 || String(0.25 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_2 || String(0.5 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_3 || String(1 * 1e9), 10),
  ],
};
