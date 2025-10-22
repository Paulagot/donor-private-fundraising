# Cypherpunk Tip Jar – Demo Script

This document outlines a simple demo flow to showcase the Cypherpunk Tip Jar.  It assumes you have followed the setup instructions in the root README and have the program deployed to Solana devnet.  Replace placeholders in commands with your own values as needed.

## 1. Start the services

Open two terminal windows:

1. **Front‑end** – run the React app and serve the donation page:
   ```bash
   pnpm --filter web dev
   ```
   This will serve the app at `http://localhost:5173`.

2. **Backend** – start the Express API server:
   ```bash
   pnpm --filter api dev
   ```
   The API listens on `http://localhost:3001`.

Ensure that your `.env` files are populated with the same RPC URL, recipient address, and program ID.

## 2. Visit the donation page

Navigate to `http://localhost:5173/donate/sol`.  You should see:

* A header with the Cypherpunk Tip Jar branding.
* The recipient SOL address in a copyable box.
* A QR code generated with Solana Pay pointing to your recipient with a unique `reference` parameter.
* Preset buttons for 0.1, 0.25, 0.5 and 1 SOL amounts.  Selecting one updates the QR code.
* Two donation options:
  * **Donate with SOL (Simple)** – uses a standard Solana Pay transfer via your wallet.
  * **Donate Privately (ZK)** – opens a modal with instructions for using Elusiv or Light Protocol to send a shielded payment.

## 3. Send a devnet donation

Use a Solana wallet (e.g. Phantom or Solflare) funded with devnet SOL.  Scan the QR code or click the “Donate with SOL (Simple)” button and approve the transaction.  Ensure you send at least 0.10 SOL to qualify for a receipt.

### Optional: Private donations

If you wish to test a private donation, follow the instructions in the modal.  Both Elusiv and Light Protocol steps are included as guidance, but you can skip this if you just want to demo the simple flow.

## 4. Obtain an Arcium‑verified receipt

After submitting the transaction, the page will attempt to auto‑locate your transaction signature using the reference public key.  If it does not find it within ~30 seconds, paste the transaction signature manually into the provided field.

Click the **Get Arcium‑Verified Receipt** button.  The front‑end will send a `POST /arcium/verify` request to the API with the transaction signature, reference and minimum tier.  The API will queue a verification job with Arcium.

If `CALLBACK_MODE=server`, the API will return the verified `commitment` and `amountTier` immediately (or after a short polling period).  If `CALLBACK_MODE=onchain`, wait a few seconds for the Anchor program to be invoked; the UI will poll the program and eventually display a success message and your receipt commitment.

Once verified you should see:

* ✅ **Verified by Arcium** badge
* **Receipt ID** – a 32‑byte commitment hash derived from the transaction
* **Donation Tier** – one of 0 (≥0.1 SOL), 1 (≥0.25 SOL), 2 (≥0.5 SOL), or 3 (≥1 SOL)

The donation tier proves the minimum amount you gifted without revealing your identity or exact amount.

## 5. Inspect on‑chain data (optional)

If using the on‑chain callback, you can inspect the receipt PDA via the Anchor CLI:

```bash
anchor account <RECEIPT_PDA>
```

where `<RECEIPT_PDA>` is the deterministic address derived from `anchor seeds ["receipt", reference_pubkey]`.  The program stores the amount tier, commitment and timestamp; no sender data is recorded.

## 6. Highlight privacy features

When demoing, emphasise that:

* The donation page does not ask for names or emails.
* Solana Pay transfers use a unique reference to link the donation to a receipt without embedding sensitive metadata on‑chain.
* The privacy options (Elusiv and Light Protocol) allow donors to send from shielded accounts for stronger anonymity.
* Receipts only reveal the donation tier and a cryptographic commitment; they do not leak sender addresses or exact amounts.

## 7. Stop services

When finished, stop the front‑end and backend processes with `Ctrl+C`.