// apps/api/src/lib/arcium-client.ts
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  RescueCipher,
  x25519,
  getMempoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
} from '@arcium-hq/client';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { config } from './config';

// ───────────────────────────────────────────────────────────────────────────────
// Helper to calculate comp_def_offset exactly as Rust does
// ───────────────────────────────────────────────────────────────────────────────

function computeCompDefOffset(instructionName: string): number {
  const hash = crypto.createHash('sha256').update(instructionName).digest();
  return hash.readUInt32LE(0);
}

// ───────────────────────────────────────────────────────────────────────────────
// Network / program constants (env-overridable)
// ───────────────────────────────────────────────────────────────────────────────

const MXE_PROGRAM_ID = new PublicKey(
  process.env.MXE_PROGRAM_ID || 'AuoVDGoVfQaRdKGGkrgQyfpcGrJt9P6C8AqVSkNoqo5i'
);

const MXE_ACCOUNT_ADDR = new PublicKey(
  process.env.MXE_ACCOUNT_ADDR || '64a3vafYyqFWcysk7BXVwJnnNXaiTyuLSh7nXP2JFQvS'
);

const ARCIUM_PROGRAM_ID = new PublicKey(
  process.env.ARCIUM_PROGRAM_ID || 'BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'
);

// Cluster offset for your MXE's cluster (must match `arcium deploy`)
const CLUSTER_OFFSET = parseInt(process.env.ARCIUM_CLUSTER_OFFSET || '1078779259', 10);

// ⚠️ CRITICAL: This MUST match the on-chain calculation
const COMP_DEF_OFFSET = computeCompDefOffset('verify_donation_v2');

console.log('🔧 Computed COMP_DEF_OFFSET for "verify_donation_v2":', COMP_DEF_OFFSET);

// Sysvar: Instructions
const SYSVAR_INSTRUCTIONS_PUBKEY = new PublicKey(
  'Sysvar1nstructions1111111111111111111111111'
);

// FeePool & ClockAccount PDAs (program-global)
const feePoolAccount = PublicKey.findProgramAddressSync(
  [Buffer.from('FeePool')],
  ARCIUM_PROGRAM_ID
)[0];

const clockAccount = PublicKey.findProgramAddressSync(
  [Buffer.from('ClockAccount')],
  ARCIUM_PROGRAM_ID
)[0];

// ExecutingPool PDA on devnet
const EXECUTING_POOL_DEVNET = new PublicKey(
  '7ceQdYuWwdwduqBFJADaURaNTj5NHhtYQYXLN1rRM67h'
);

console.log('📋 Arcium Network Accounts:');
console.log('  - feePoolAccount    :', feePoolAccount.toBase58());
console.log('  - clockAccount      :', clockAccount.toBase58());
console.log('  - executingPool     :', EXECUTING_POOL_DEVNET.toBase58());

// IDLs
const MXE_IDL = JSON.parse(fs.readFileSync('./idl/tipjar_mxe.json', 'utf-8'));

/**
 * Derive the computation definition PDA
 */
function deriveCompDefPda(
  arciumProgramId: PublicKey,
  mxeProgramId: PublicKey,
  compDefOffset: number
): PublicKey {
  const offsetBytes = Buffer.alloc(4);
  offsetBytes.writeUInt32LE(compDefOffset, 0);

  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('ComputationDefinitionAccount'),
      mxeProgramId.toBuffer(),
      offsetBytes
    ],
    arciumProgramId
  );

  return pda;
}

export class ArciumClient {
  private connection: Connection;
  private signer: Keypair | null = null;
  private provider: anchor.AnchorProvider | null = null;
  private mxeProgram: anchor.Program | null = null;

  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
  }

  // Initialize Anchor provider + signer + Program (lazy)
  private initializeProvider() {
    if (this.provider) return;
    try {
      const signerPath = process.env.API_SIGNER_KEYPAIR_PATH || '/home/paulag/.config/solana/id.json';
      const signerData = JSON.parse(fs.readFileSync(signerPath, 'utf-8'));
      this.signer = Keypair.fromSecretKey(new Uint8Array(signerData));

      this.provider = new anchor.AnchorProvider(
        this.connection,
        new anchor.Wallet(this.signer),
        { commitment: 'confirmed' }
      );

      this.mxeProgram = new anchor.Program(MXE_IDL, this.provider);

      console.log('✅ [client initializeProvider] Arcium provider initialized');
      console.log('[client initializeProvider]  - Signer:', this.signer.publicKey.toBase58());
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      throw error;
    }
  }

  /**
   * Submit a donation amount to Arcium MPC for tier computation
   */
  async submitDonationToMPC(
    amountLamports: number,
    txSig: string
  ): Promise<{ computationOffset: string; commitment: string }> {
    try {
      this.initializeProvider();
      if (!this.provider || !this.mxeProgram || !this.signer) {
        throw new Error('Provider not initialized');
      }

      console.log('🔐 Starting Arcium MPC donation processing...');
      console.log('[CFG] MXE_PROGRAM_ID:', MXE_PROGRAM_ID.toBase58());
      console.log('[CFG] MXE_ACCOUNT_ADDR:', MXE_ACCOUNT_ADDR.toBase58());
      console.log('[CFG] ARCIUM_PROGRAM_ID:', ARCIUM_PROGRAM_ID.toBase58());
      console.log('[CFG] COMP_DEF_OFFSET:', COMP_DEF_OFFSET);

      // Load MXE x25519 pubkey from account data
      const mxeAccountInfo = await this.connection.getAccountInfo(MXE_ACCOUNT_ADDR);
      if (!mxeAccountInfo || !mxeAccountInfo.data) {
        throw new Error('MXE account not found or has no data');
      }
      const mxePublicKey = new Uint8Array(mxeAccountInfo.data.slice(16, 48));
      if (mxePublicKey.length !== 32) {
        throw new Error(`Invalid MXE public key length: ${mxePublicKey.length}`);
      }
      if (mxePublicKey.every(b => b === 0)) {
        throw new Error('MXE public key is all zeros - MXE may not be initialized');
      }

      // Canonical PDAs
      const mempoolAccount = getMempoolAccAddress(MXE_PROGRAM_ID);
      const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);
      const compDefAccount = deriveCompDefPda(ARCIUM_PROGRAM_ID, MXE_PROGRAM_ID, COMP_DEF_OFFSET);
      const executingPool = EXECUTING_POOL_DEVNET;

      console.log('📋 Derived PDAs:');
      console.log('  - MXE pubkey (x25519):', Buffer.from(mxePublicKey).toString('hex'));
      console.log('  - mempoolAccount     :', mempoolAccount.toBase58());
      console.log('  - compDefAccount     :', compDefAccount.toBase58());
      console.log('  - clusterAccount     :', clusterAccount.toBase58());
      console.log('  - executingPool      :', executingPool.toBase58());

      // Verify comp_def account exists
      const compDefInfo = await this.connection.getAccountInfo(compDefAccount);
      if (!compDefInfo || compDefInfo.data.length === 0) {
        throw new Error(
          `Computation definition account not initialized at ${compDefAccount.toBase58()}. ` +
          `Run POST /arcium/init-comp-def first.`
        );
      }

      // Ephemeral x25519 + shared secret
      const privateKey = x25519.utils.randomSecretKey(); // v0.3.0 uses randomSecretKey
      const publicKey = x25519.getPublicKey(privateKey);
      const sharedSecret = x25519.getSharedSecret(
        new Uint8Array(privateKey),
        new Uint8Array(mxePublicKey)
      );

// Encrypt amount (the circuit expects ONE encrypted block)
const cipher = new RescueCipher(sharedSecret);
const nonce = crypto.randomBytes(16);
const ct = cipher.encrypt([BigInt(amountLamports)], nonce);

// Sanity check: must be exactly 1 block
console.log('[Arcium] encrypt() blocks:', ct.length);
if (ct.length !== 1) {
  throw new Error(`Expected 1 ciphertext block, got ${ct.length}. Check circuit interface.`);
}

// Use only the first (and only) block
const ciphertext0 = ct[0];

// Provide a dummy second arg to satisfy the TS call signature.
// (Your on-chain program ignores this second block.)
const ciphertext1 = new Uint8Array(32);

      // u128 nonce as BN
      const nonceBn = new BN(nonce.toString('hex'), 16);

      // Random computation offset (u64)
      const computationOffset = new BN(Math.floor(Math.random() * 1_000_000_000));

      // Signer PDA
      const [signPdaAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('SignerAccount')],
        MXE_PROGRAM_ID
      );

      // Computation account
      const computationAccount = getComputationAccAddress(MXE_PROGRAM_ID, computationOffset);

      console.log('📋 Local PDAs:');
      console.log('  - signPdaAccount    :', signPdaAccount.toBase58());
      console.log('  - computationAccount:', computationAccount.toBase58());

      // Call verify_donation_v2
      console.log('🚀 Submitting to Arcium MPC network...');
      const tx = await this.mxeProgram.methods
        .verifyDonation(
          computationOffset,
          Array.from(ciphertext0),
          Array.from(ciphertext1),
          Array.from(publicKey),
          nonceBn
        )
        .accounts({
          payer: this.signer.publicKey,
          signPdaAccount,
          mxeAccount: MXE_ACCOUNT_ADDR,
          mempoolAccount,
          executingPool,
          computationAccount,
          compDefAccount,
          clusterAccount,
          poolAccount: feePoolAccount,
          clockAccount: clockAccount,
          systemProgram: SystemProgram.programId,
          arciumProgram: ARCIUM_PROGRAM_ID,
        })
        .rpc();

      console.log('✅ MPC computation queued! Transaction:', tx);
      console.log('  Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      const commitment = crypto
        .createHash('sha256')
        .update(txSig + computationOffset.toString())
        .digest('hex');

      return { computationOffset: computationOffset.toString(), commitment };
    } catch (error: any) {
      console.error('❌ Arcium MPC error:', error);
      console.error('Error details:', error.logs || error.message);

      console.log('⚠️  Falling back to local tier computation...');
      const tier = this.computeTierLocally(amountLamports);
      const commitment = this.generateCommitment(txSig, tier);
      return { computationOffset: '0', commitment };
    }
  }

 /**
 * Commission the computation definition (Arcium v0.3.0 requirement)
 */
async commissionComputationDefinition(compDefPda: PublicKey): Promise<string> {
  console.log('[INFO] 🏗️  Checking computation definition status...');
  
  if (!this.provider || !this.mxeProgram) {
    throw new Error('Provider not initialized');
  }

  try {
    // Just check if the account exists and has data
    const compDefInfo = await this.connection.getAccountInfo(compDefPda);
    
    if (!compDefInfo || compDefInfo.data.length === 0) {
      throw new Error('CompDef account does not exist');
    }

    // According to Arcium v0.3.0 docs, when you call init_comp_def with `true` as first param,
    // it should auto-commission. If you're still getting "NotCompleted" errors,
    // you need to redeploy using: arcium deploy --cluster-offset 1078779259 ...
    
    console.log('[INFO] ✅ Computation definition exists');
    console.log('[INFO] If you see "ComputationDefinitionNotCompleted" errors:');
    console.log('[INFO] Run: arcium deploy --cluster-offset 1078779259 --keypair-path ~/.config/solana/id.json -ud');
    
    return 'check-passed';
    
  } catch (err: any) {
    console.error('❌ Error checking comp def:', err.message);
    throw err;
  }
}
  // ────────────────────────────────────────────────────────────────────────────
 /**
 * Initialize the computation definition
 */
async initializeComputationDefinition(): Promise<string> {
  console.log('[INFO] Initializing computation definition...');
  this.initializeProvider();
  
  if (!this.provider || !this.mxeProgram || !this.signer) {
    throw new Error('Provider not initialized');
  }

  console.log('✅ [client initializeComputationDefinition] Arcium provider initialized');
  console.log(` [client initializeComputationDefinition] - Signer: ${this.signer.publicKey.toString()}`);
  
  console.log('🔧 [client initializeComputationDefinition] Initializing computation definition...');
  console.log('[client initializeComputationDefinition] MXE_PROGRAM_ID:', MXE_PROGRAM_ID.toBase58());
  console.log('[client initializeComputationDefinition] COMP_DEF_OFFSET:', COMP_DEF_OFFSET);

  const compDefPda = deriveCompDefPda(ARCIUM_PROGRAM_ID, MXE_PROGRAM_ID, COMP_DEF_OFFSET);

  console.log('📋[client] Initialization accounts:');
  console.log('  - MXE Program ID:', MXE_PROGRAM_ID.toString());
  console.log('  - MXE Account   :', MXE_ACCOUNT_ADDR.toString());
  console.log('  - CompDef (PDA) :', compDefPda.toString());
  console.log('  - Payer         :', this.signer.publicKey.toString());

  try {
    // Check if already initialized
    const compDefInfo = await this.connection.getAccountInfo(compDefPda);
    
    if (compDefInfo && compDefInfo.data.length > 0) {
      console.log('✅ [client] Computation definition already initialized');
      await this.commissionComputationDefinition(compDefPda);
      return 'already_initialized';
    }

    console.log('⚠️  Computation definition not found, creating...');

    const tx = await this.mxeProgram.methods
      .initVerifyDonationCompDef()
      .accounts({
        payer: this.signer.publicKey,
        mxeAccount: MXE_ACCOUNT_ADDR,
        compDefAccount: compDefPda,
        arciumProgram: ARCIUM_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await this.connection.confirmTransaction(tx, 'confirmed');
    console.log('✅ Computation definition initialized:', tx);
    
    // Check commissioning status
    await this.commissionComputationDefinition(compDefPda);
    
    return tx;
    
  } catch (err: any) {
    console.error('❌ Failed to initialize computation definition:', err);
    throw err;
  }
}

  // ────────────────────────────────────────────────────────────────────────────
  // Local helpers (fallbacks)
  // ────────────────────────────────────────────────────────────────────────────

  computeTierLocally(amountLamports: number): number {
    return config.tiers.reduceRight(
      (acc, threshold, idx) => (amountLamports >= threshold ? Math.max(acc, idx) : acc),
      0
    );
  }

  generateCommitment(txSig: string, tier: number): string {
    return crypto
      .createHash('sha256')
      .update(txSig + tier.toString() + 'cypherpunk-secret')
      .digest('hex');
  }

  /** Write a receipt on-chain to the tipjar-receipts program */
  async writeReceiptOnChain(commitment: string, tier: number): Promise<string> {
    try {
      this.initializeProvider();
      if (!this.provider || !this.signer) throw new Error('Provider not initialized');

      const TIPJAR_PROGRAM_ID = new PublicKey(
        process.env.TIPJAR_PROGRAM_ID || '7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q'
      );

      const idlPath = path.join(__dirname, '../../idl/tipjar_receipts.json');
      const tipjarIdl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      const tipjarProgram = new anchor.Program(tipjarIdl, this.provider);

      const commitmentBytes = Buffer.from(commitment, 'hex');
      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('receipt'), commitmentBytes],
        TIPJAR_PROGRAM_ID
      );

      console.log('📝 Writing receipt on-chain:', {
        commitment,
        tier,
        receiptPda: receiptPda.toBase58(),
        signer: this.signer.publicKey.toBase58(),
      });

      const tx = await tipjarProgram.methods
        .completeReceipt(tier, Array.from(commitmentBytes))
        .accounts({
          receipt: receiptPda,
          funder: this.signer.publicKey,
          systemProgram: SystemProgram.programId,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();

      console.log('✅ Receipt written on-chain:', {
        tx,
        receiptPda: receiptPda.toBase58(),
        tier,
        explorerUrl: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
      });

      return tx;
    } catch (error: any) {
      console.error('❌ Failed to write receipt on-chain:', error.message);
      throw new Error(`Receipt write failed: ${error.message}`);
    }
  }
}

// Export singleton
export const arciumClient = new ArciumClient();








