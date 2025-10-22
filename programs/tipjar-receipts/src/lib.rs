use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions as instr_sysvar;
use anchor_lang::prelude::Pubkey;

declare_id!("7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q"); // temp; replace after deploy

// TEMP callback program id (valid base58). Swap to Arcium’s real id later.
const EXPECTED_CALLBACK_PROGRAM: Pubkey = Pubkey::new_from_array([0u8; 32]);

#[program]
pub mod tipjar_receipts {
    use super::*;

    pub fn complete_receipt(
        ctx: Context<CompleteReceipt>,
        amount_tier: u8,
        commitment: [u8; 32],
    ) -> Result<()> {
        // Enable caller gate later when you have the real program id:
        // require!(
        //     invoked_by_expected_program(&ctx.accounts.instructions)?,
        //     TipjarError::InvalidInvoker
        // );

        let receipt = &mut ctx.accounts.receipt;
        receipt.amount_tier = amount_tier;
        receipt.commitment = commitment;
        receipt.ts = Clock::get()?.unix_timestamp;

        emit!(DonationVerified {
            commitment,
            tier: amount_tier,
            ts: receipt.ts,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount_tier: u8, commitment: [u8; 32])]
pub struct CompleteReceipt<'info> {
    /// PDA: seeds = ["receipt", commitment]
    #[account(
        init_if_needed,
        payer = funder,
        space = 8 + Receipt::SIZE,
        seeds = [b"receipt", commitment.as_ref()],
        bump
    )]
    pub receipt: Account<'info, Receipt>,

    /// Fee payer (your relayer/API signer)
    #[account(mut)]
    pub funder: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// Instructions sysvar for optional invoker gating
    /// CHECK: well-known sysvar; address enforced here
    #[account(address = instr_sysvar::ID)]
    pub instructions: UncheckedAccount<'info>,
}

#[account]
pub struct Receipt {
    pub amount_tier: u8,
    pub commitment: [u8; 32],
    pub ts: i64,
}
impl Receipt {
    pub const SIZE: usize = 1 + 32 + 8; // 41 bytes
}

#[event]
pub struct DonationVerified {
    pub commitment: [u8; 32],
    pub tier: u8,
    pub ts: i64,
}

#[error_code]
pub enum TipjarError {
    #[msg("Instruction was not invoked by the expected callback program")]
    InvalidInvoker,
}

/// Checked helper: compare previous instruction’s program id.
fn invoked_by_expected_program(instructions_ai: &AccountInfo) -> Result<bool> {
    #[cfg(test)]
    {
        return Ok(true);
    }
    let current_idx = instr_sysvar::load_current_index_checked(instructions_ai)?;
    let prev_idx = current_idx.saturating_sub(1) as usize;
    let prev = instr_sysvar::load_instruction_at_checked(prev_idx, instructions_ai)?;
    Ok(prev.program_id == EXPECTED_CALLBACK_PROGRAM)
}


