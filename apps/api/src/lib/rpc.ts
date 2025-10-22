import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { config } from './config';

const connection = new Connection(config.rpcUrl, 'confirmed');

/**
 * Verify that a transaction sent SOL to the donation address and that the amount
 * meets or exceeds the provided minimum lamports.  Throws an error if the
 * transaction is not found or does not satisfy the conditions.
 */
export async function verifyTransaction(
  txSig: string,
  minLamports: number,
  reference?: string
): Promise<{ amountLamports: number }> {
  const tx = await connection.getTransaction(txSig, { 
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0 
  });
  
  if (!tx) {
    throw new Error('Transaction not found');
  }

  let paidAmount = 0;
  
  // Handle both legacy and versioned transactions
  const message: any = tx.transaction.message;
  const instructions = message.compiledInstructions || message.instructions;
  const accountKeys = message.staticAccountKeys || message.accountKeys;

  // iterate through instructions and accumulate lamports transferred to recipient
  for (const instr of instructions) {
    try {
      // Get program ID
      const programIdIndex = instr.programIdIndex;
      const programId = accountKeys[programIdIndex];
      
      if (programId.equals(SystemProgram.programId)) {
        // Decode the instruction data
        const data = Buffer.from(instr.data);
        
        // Check if it's a transfer instruction (instruction type 2)
        if (data.length >= 12 && data.readUInt32LE(0) === 2) {
          const lamports = Number(data.readBigUInt64LE(4));
          
          // Get the 'to' account (index 1 in accounts)
          const toIndex = instr.accountKeyIndexes ? instr.accountKeyIndexes[1] : instr.accounts[1];
          const toPubkey = accountKeys[toIndex];
          
          if (toPubkey && toPubkey.equals(new PublicKey(config.donationAddress))) {
            paidAmount += lamports;
          }
        }
      }
    } catch (err) {
      // ignore instructions we can't decode
      console.log('Could not decode instruction:', err);
    }
  }

  // Allow 1% tolerance for rounding differences
  const tolerance = Math.floor(minLamports * 0.01);
  const minimumAcceptable = minLamports - tolerance;

  if (paidAmount < minimumAcceptable) {
    throw new Error(
      `Donation amount too small. Expected at least ${minLamports} lamports, got ${paidAmount} lamports`
    );
  }

  console.log(`✅ Verified donation: ${paidAmount} lamports (expected: ${minLamports})`);

  return { amountLamports: paidAmount };
}
