# Tip Jar Receipts Program

This directory contains the on‑chain Solana program that records privacy‑preserving donation receipts for the Cypherpunk Tip Jar.  It is written with [Anchor](https://book.anchor-lang.com/) and deployed to the Solana devnet.

## Overview

The program defines a `Receipt` PDA keyed off a `reference` public key.  When Arcium completes its MPC verification of a donation, it calls the program’s `complete_receipt` instruction to write the donation tier, a 32‑byte commitment and a timestamp into the account.  Receipts contain no sender information and do not record the exact donation amount.

### Account layout

| Field | Type | Description |
| --- | --- | --- |
| `amount_tier` | `u8` | Donation tier (0–3) corresponding to thresholds ≥0.1, ≥0.25, ≥0.5 and ≥1 SOL. |
| `commitment` | `[u8; 32]` | A cryptographic commitment to the transaction, produced by Arcium. |
| `ts` | `i64` | UNIX timestamp when the receipt was recorded. |

### Instructions

#### `complete_receipt`

Parameters: `(amount_tier: u8, commitment: [u8;32])`

Accounts:

| Name | Mut? | Signer? | Description |
| --- | --- | --- | --- |
| `receipt` | ✅ | – | PDA derived from `["receipt", reference_pubkey]`.  Will be initialised if it does not exist. |
| `reference` | – | – | Unchecked account whose public key is used as the seed. |
| `payer` | ✅ | ✅ | Pays for account creation.  In an Arcium callback this would be the Arcium authority. |
| `system_program` | – | – | The system program. |

The instruction initialises (if necessary) the `receipt` account, writes the provided `amount_tier` and `commitment`, and records the current timestamp.

In a production deployment you would also verify that the signer is the authorised Arcium program authority.  For this MVP the check is omitted.

## Building & Deploying

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build the program:
   ```bash
   pnpm --filter tipjar-receipts build
   ```
3. Deploy to devnet:
   ```bash
   pnpm --filter tipjar-receipts deploy
   ```

The deploy script will produce the program ID and write it into `Anchor.toml` as well as `devnet.json` under `programs/tipjar-receipts/deployments`.  Copy this program ID into your `.env` files for the API and web packages.

## Testing

To run Anchor tests:

```bash
pnpm --filter tipjar-receipts test
```

The test suite derives the receipt PDA, invokes `complete_receipt` and asserts that the account is written correctly.