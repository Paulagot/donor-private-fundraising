import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { assert } from 'chai';

describe('tipjar-receipts', () => {
  // Configure the client to use the devnet cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.TipjarReceipts as Program;

  it('can derive the receipt PDA', async () => {
    const reference = anchor.web3.Keypair.generate();
    const [receiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('receipt'), reference.publicKey.toBuffer()],
      program.programId
    );
    assert.ok(receiptPda !== undefined, 'PDA must be derivable');
  });

  it('writes a receipt on complete_receipt', async () => {
    const reference = anchor.web3.Keypair.generate();
    const payer = provider.wallet;
    const [receiptPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('receipt'), reference.publicKey.toBuffer()],
      program.programId
    );
    const commitment = Array.from({ length: 32 }, () => 1); // dummy commitment
    const tx = await program.methods
      .completeReceipt(1, commitment)
      .accounts({
        receipt: receiptPda,
        reference: reference.publicKey,
        payer: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();
    // Fetch the account and check fields
    const account = await program.account.receipt.fetch(receiptPda);
    assert.equal(account.amountTier, 1);
    assert.deepEqual(account.commitment, Buffer.from(commitment));
  });
});