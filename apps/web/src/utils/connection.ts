import { clusterApiUrl, Connection } from '@solana/web3.js';

/**
 * Returns a Connection to the configured Solana cluster.  Falls back to devnet if
 * no environment variable is provided.
 */
export function getConnection(): Connection {
  const url = import.meta.env.VITE_RPC_URL as string;
  const endpoint = url || clusterApiUrl('devnet');
  return new Connection(endpoint, 'confirmed');
}