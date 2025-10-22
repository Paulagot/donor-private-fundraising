use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CircuitSource, OffChainCircuitSource};

const COMP_DEF_OFFSET_VERIFY_DONATION: u32 = comp_def_offset("verify_donation_v2");

declare_id!("AuoVDGoVfQaRdKGGkrgQyfpcGrJt9P6C8AqVSkNoqo5i");

/// -------------------- Accounts (top-level, public) --------------------

#[queue_computation_accounts("verify_donation_v2", payer)]
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

    #[account(mut, address = derive_mempool_pda!())]
    /// CHECK: Verified by Arcium program via PDA seeds/owner.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!())]
    /// CHECK: Verified by Arcium program via PDA seeds/owner.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset))]
    /// CHECK: Verified by Arcium program via PDA seeds/owner.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_DONATION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[init_computation_definition_accounts("verify_donation_v2", payer)]
#[derive(Accounts)]
pub struct InitVerifyDonationCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: Created/initialized by Arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

/// -------------------- Program --------------------

#[arcium_program(skip-lint)]
pub mod tipjar_mxe {
    use super::*;

    pub fn init_verify_donation_comp_def(
        ctx: Context<InitVerifyDonationCompDef>,
    ) -> Result<()> {
        msg!(
            "Initializing comp_def with offset: {}",
            COMP_DEF_OFFSET_VERIFY_DONATION
        );

        init_comp_def(
            ctx.accounts,
            true,
            0,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://raw.githubusercontent.com/Paulagot/donor-private-fundraising/main/apps/api/public/arcium/verify_donation_v2_testnet.arcis".to_string(),
                hash: [0; 32], // not enforced yet
            })),
            None,
        )?;
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
                // first struct: (public_key, u128)
    Argument::ArcisPubkey(pub_key),
    Argument::PlaintextU128(nonce),
    // second struct: ([ciphertext], [])
    // -> just ONE encrypted block
    Argument::EncryptedU8(ciphertext_0),
    // DO NOT push ciphertext_1
        ];

        // NOTE: references the callback accounts type defined below the module
        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            None,
            vec![VerifyDonationV2Callback::callback_ix(&[])],
        )?;
        Ok(())
    }

    // MUST be named <encrypted_ix_name>_callback
    #[arcium_callback(encrypted_ix = "verify_donation_v2", auto_serialize = false)]
    pub fn verify_donation_v2_callback(
        ctx: Context<VerifyDonationV2Callback>,
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

/// -------------------- Callback accounts (place AFTER the program) --------------------

#[callback_accounts("verify_donation_v2")]
#[derive(Accounts)]
pub struct VerifyDonationV2Callback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_DONATION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: Read-only sysvar; checked by fixed address.
    pub instructions_sysvar: AccountInfo<'info>,
}

/// -------------------- Events / Errors --------------------

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





