// apps/api/src/routes/arcium.ts
import { Router } from 'express';

import { verifyRequestSchema } from '../lib/validation';
import { verifyTransaction } from '../lib/rpc';
import { config } from '../lib/config';
import { logError, logInfo } from '../lib/log';
import { arciumClient } from '../lib/arcium-client';

export const arciumRouter = Router();

/**
 * POST /arcium/verify
 * Validates a transaction and (optionally) sends encrypted data to Arcium for private tiering.
 * Returns a commitment and, if configured, writes a receipt on-chain.
 */
arciumRouter.post('/verify', async (req, res) => {
  try {
    const parsed = verifyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const { txSig, reference, minLamports, isPrivate } = parsed.data;

    logInfo('Donation verification request', {
      txSig,
      reference,
      minLamports,
      isPrivate: isPrivate || false,
    });

    // 1) Verify the payment on-chain (transparent)
    await verifyTransaction(txSig, minLamports, reference);

    let tier: number;
    let commitment: string;

    // 2) Private vs public computation path
    if (isPrivate) {
      logInfo('Processing private donation with Arcium MPC', { txSig });

      try {
        const result = await arciumClient.submitDonationToMPC(minLamports, txSig);
        commitment = result.commitment;

        // TEMP: until your callback consumption is wired, compute tier locally
        tier = arciumClient.computeTierLocally(minLamports);

        logInfo('Arcium MPC computation queued', {
          txSig,
          computationOffset: result.computationOffset,
          tier,
        });
      } catch (mpcError: any) {
        logError('Arcium MPC failed, falling back to local', { error: mpcError.message });
        tier = arciumClient.computeTierLocally(minLamports);
        commitment = arciumClient.generateCommitment(txSig, tier);
      }
    } else {
      logInfo('Processing simple donation (public)', { txSig });
      tier = arciumClient.computeTierLocally(minLamports);
      commitment = arciumClient.generateCommitment(txSig, tier);
      logInfo('Simple donation processed', { txSig, tier });
    }

    // 3) Best-effort: write on-chain receipt to tipjar-receipts program
    let receiptTx: string | undefined;
    try {
      receiptTx = await arciumClient.writeReceiptOnChain(commitment, tier);
      logInfo('Receipt written on-chain', {
        commitment,
        tier,
        receiptTx,
        explorerUrl: `https://explorer.solana.com/tx/${receiptTx}?cluster=devnet`,
      });
    } catch (receiptError: any) {
      logError('Failed to write receipt on-chain', {
        error: receiptError.message,
        commitment,
        tier,
      });
      // continue anyway
    }

    // 4) Response shape
    if (config.callbackMode === 'server') {
      return res.json({
        status: 'verified',
        receiptCommitment: commitment,
        amountTier: tier,
        isPrivate: isPrivate || false,
        receiptTx,
      });
    } else {
      return res.json({
        status: 'queued',
        reference,
        commitment,
        tier,
        isPrivate: isPrivate || false,
        receiptTx,
      });
    }
  } catch (err: any) {
    logError('Verification error', { error: err.message });
    return res.status(500).json({ error: err.message });
  }
});


/**
 * POST /arcium/init-comp-def
 * Initialize the computation definition for the verify_donation circuit.
 * Call this once after deploy (idempotent).
 */
arciumRouter.post('/init-comp-def', async (_req, res) => {
  try {
    logInfo('{routes] Initializing computation definition...');
    const result = await arciumClient.initializeComputationDefinition();

    const isAlreadyInitialized = result === 'already_initialized';

    res.json({
      success: true,
      tx: isAlreadyInitialized ? undefined : result,
      message: isAlreadyInitialized
        ? 'Computation definition already initialized'
        : 'Computation definition initialized successfully',
      explorerUrl: !isAlreadyInitialized
        ? `https://explorer.solana.com/tx/${result}?cluster=devnet`
        : undefined,
    });
  } catch (error: any) {
    logError('Failed to initialize comp def', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
  
});

arciumRouter.get('/status', async (req, res) => {
  try {
    const { commitment, txSig } = req.query as { commitment?: string; txSig?: string };

    // Implement however you track queued jobs:
    // - if you key by commitment, look it up
    // - if by txSig, derive commitment and look it up
    // Return unified shape:
    // { status: 'verified', receiptCommitment, amountTier, receiptTx } OR { status: 'queued' }
    // For now, a stub:
    return res.json({ status: 'queued' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});