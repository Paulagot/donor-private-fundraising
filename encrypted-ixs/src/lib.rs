use arcis_imports::*;

#[encrypted]
mod circuits {
    use arcis_imports::*;
    
    pub struct DonationInput {
        amount_lamports: u64,
    }
    
    #[instruction]
    pub fn verify_donation(input_ctxt: Enc<Shared, DonationInput>) -> Enc<Shared, u8> {
        //                                                             ^^^^^^^^^^^^^^^^
        //                                                             Keep it encrypted!
        let input = input_ctxt.to_arcis();
        
        // Compute tier based on donation amount
        let tier = if input.amount_lamports >= 1_000_000_000 {
            4u8  // >= 1 SOL
        } else if input.amount_lamports >= 500_000_000 {
            3u8  // >= 0.5 SOL
        } else if input.amount_lamports >= 250_000_000 {
            2u8  // >= 0.25 SOL
        } else if input.amount_lamports >= 100_000_000 {
            1u8  // >= 0.1 SOL
        } else {
            0u8  // < 0.1 SOL
        };
        
        // Return encrypted tier (not revealed!)
        input_ctxt.owner.from_arcis(tier)
        //         ^^^^^ This keeps it encrypted for the callback
    }
}
