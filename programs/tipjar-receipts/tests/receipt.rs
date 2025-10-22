use anchor_lang::prelude::*;
use tipjar_receipts::Receipt;

#[test]
fn test_pda_derivation() {
    let reference = Pubkey::new_unique();
    let (pda, _bump) = Pubkey::find_program_address(&[b"receipt", reference.as_ref()], &tipjar_receipts::ID);
    // The PDA should be valid (i.e., on the curve check is implied by find_program_address)
    assert!(pda.to_bytes()[..] != [0u8; 32]);
}