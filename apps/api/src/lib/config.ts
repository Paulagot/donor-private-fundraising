import dotenv from 'dotenv';

// Load environment variables from a `.env` file.  When running via ts-node or
// compiled code, this will pick up `.env` in the current working directory
// if present.  If no `.env` file exists, environment variables are
// unaffected.
dotenv.config();

export const config = {
  rpcUrl: process.env.RPC_URL || process.env.SHARED_RPC_URL || 'https://api.devnet.solana.com',
  donationAddress: process.env.DONATION_SOL_ADDRESS || '',
  arciumApiKey: process.env.ARCIUM_API_KEY || '',
  arciumCluster: process.env.ARCIUM_CLUSTER || 'devnet',
  callbackMode: (process.env.CALLBACK_MODE || 'onchain') as 'onchain' | 'server',
  tipjarProgramId: process.env.TIPJAR_PROGRAM_ID || '',
  port: parseInt(process.env.PORT || '3001', 10),
  publicWebsiteOrigin: process.env.PUBLIC_WEBSITE_ORIGIN || '*',
  // Tier thresholds defined as lamports; fallback to defaults if not provided
  tiers: [
    parseInt(process.env.MIN_TIER_LAMPORTS_0 || String(0.1 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_1 || String(0.25 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_2 || String(0.5 * 1e9), 10),
    parseInt(process.env.MIN_TIER_LAMPORTS_3 || String(1 * 1e9), 10),
  ],
};