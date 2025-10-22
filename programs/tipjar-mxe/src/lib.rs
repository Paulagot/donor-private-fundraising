use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

// ⚠️ CRITICAL: This MUST match the TypeScript calculation
// The comp_def_offset macro computes: sha256("verify_donation").slice(0,4) as little-endian u32
// DO NOT hardcode this as 1 unless that's what the macro actually produces!
// Use: const COMP_DEF_OFFSET: u32 = comp_def_offset("verify_donation");
const COMP_DEF_OFFSET_VERIFY_DONATION: u32 = comp_def_offset("verify_donation");

declare_id!("AuoVDGoVfQaRdKGGkrgQyfpcGrJt9P6C8AqVSkNoqo5i");

#[arcium_program]
pub mod tipjar_mxe {
    use super::*;

    pub fn init_verify_donation_comp_def(ctx: Context<InitVerifyDonationCompDef>) -> Result<()> {
        // Log the actual offset value for debugging
        msg!("Initializing comp_def with offset: {}", COMP_DEF_OFFSET_VERIFY_DONATION);
        init_comp_def(ctx.accounts, true, 0, None, None)?;
        Ok(())
    }

    pub fn verify_donation(
        ctx: Context<VerifyDonation>,
        computation_offset: u64,
        ciphertext_0: [u8; 32],
        ciphertext_1: [u8; 32],
        pub_key: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;
        
        msg!("Queueing computation with offset: {}", computation_offset);
        msg!("Using comp_def_offset: {}", COMP_DEF_OFFSET_VERIFY_DONATION);
        
        let args = vec![
            Argument::ArcisPubkey(pub_key),
            Argument::PlaintextU128(nonce),
            Argument::EncryptedU8(ciphertext_0),
            Argument::EncryptedU8(ciphertext_1),
        ];

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![VerifyDonationCallback::callback_ix(&[])],
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "verify_donation", auto_serialize = false)]
    pub fn verify_donation_callback(
        ctx: Context<VerifyDonationCallback>,
        output: ComputationOutputs<u8>,
    ) -> Result<()> {
        let tier = match output {
            ComputationOutputs::Success(tier_value) => tier_value,
            _ => return Err(ErrorCode::AbortedComputation.into()),
        };
        
        msg!("Donation verified with tier: {}", tier);
        emit!(DonationVerifiedEvent { tier });
        
        Ok(())
    }
}

#[queue_computation_accounts("verify_donation", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct VerifyDonation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, SignerAccount>,
   
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(
        mut,
        address = derive_mempool_pda!()
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_execpool_pda!()
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(
        mut,
        address = derive_comp_pda!(computation_offset)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_DONATION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account)
    )]
    pub cluster_account: Account<'info, Cluster>,
    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,
    #[account(
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("verify_donation")]
#[derive(Accounts)]
pub struct VerifyDonationCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_DONATION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[init_computation_definition_accounts("verify_donation", payer)]
#[derive(Accounts)]
pub struct InitVerifyDonationCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    /// Can't check it here as it's not initialized yet.
    pub comp_def_account: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct DonationVerifiedEvent {
    pub tier: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The computation was aborted")]
    AbortedComputation,
    #[msg("Cluster not set")]
    ClusterNotSet,
}



