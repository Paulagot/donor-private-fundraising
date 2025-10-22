# Cypherpunk Tip Jar – API

This package provides the backend services for the Cypherpunk Tip Jar.  It exposes a REST API for verifying Solana donations using Arcium’s privacy‑preserving MPC service and (optionally) writing receipts to an on‑chain Anchor program.

## Features

- **POST /arcium/verify** – validate a transaction, compute a donation tier and queue an Arcium verification job.
- **Health endpoint** – `GET /health` returns `{ status: "ok" }` for liveness checks.
- **Rate limiting** – limits verification requests per client to prevent abuse.
- **Strict input validation** – uses [Zod](https://zod.dev) to parse and validate requests.
- **Environment‑driven configuration** – RPC URL, recipient address, Arcium credentials, callback mode and tier thresholds are configurable via `.env`.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file based on `.env.example` and fill in the required values.  You must specify at least the donation address.

3. Start the server in development mode using ts‑node:
   ```bash
   pnpm dev
   ```

   The API listens on port defined in `PORT` (defaults to `3001`).  The health check is available at `/health`.

4. To build a production bundle:
   ```bash
   pnpm build
   pnpm start
   ```

## Endpoint: POST /arcium/verify

Request body:

```json
{
  "txSig": "<transaction signature>",
  "reference": "<optional reference public key>",
  "minLamports": 100000000
}
```

| Field | Type | Description |
| --- | --- | --- |
| `txSig` | string | Transaction signature on Solana devnet. Must include a transfer to the recipient address with at least `minLamports` lamports. |
| `reference` | string (optional) | The reference public key appended to the Solana Pay URL.  Used to link the donation to a receipt; not validated server‑side. |
| `minLamports` | number | Minimum required donation in lamports (1 SOL = 1 000 000 000 lamports). |

The server performs the following steps:

1. **Sanity check the transaction** – queries the Solana RPC to confirm the signature exists and that it transfers at least `minLamports` to the configured `DONATION_SOL_ADDRESS`.
2. **Compute donation tier** – maps the amount to one of four tiers based on thresholds defined by `MIN_TIER_LAMPORTS_0..3`.
3. **Generate receipt commitment** – for local development this is a deterministic hash of `txSig` and the tier; in a production deployment this would be produced by the Arcium MPC service.
4. **Respond** – returns either `{ status: "verified", receiptCommitment, amountTier }` if `CALLBACK_MODE=server` or `{ status: "queued", reference }` if `CALLBACK_MODE=onchain`.

## Environment variables

The API reads environment variables from `.env` at the repository root or from its own `.env`.  The most important variables are listed below:

| Variable | Description |
| --- | --- |
| `RPC_URL` | RPC endpoint for querying transactions.  Falls back to the root `SHARED_RPC_URL` if not set. |
| `DONATION_SOL_ADDRESS` | Public key that must receive donations. |
| `ARCIUM_API_KEY` / `ARCIUM_CLUSTER` | Authentication for Arcium (placeholders in this MVP). |
| `CALLBACK_MODE` | `onchain` to instruct Arcium to call the Anchor program or `server` to return the result directly. |
| `TIPJAR_PROGRAM_ID` | Program ID of the Anchor receipt program.  Required for on‑chain callbacks. |
| `MIN_TIER_LAMPORTS_0..3` | Donation thresholds in lamports for tiers 0–3 (defaults correspond to ≥0.1, ≥0.25, ≥0.5 and ≥1 SOL). |
| `PUBLIC_WEBSITE_ORIGIN` | Allowed origin for CORS.  Should match your front‑end URL. |
| `PORT` | Port on which the API listens. |

## Notes

- The Arcium integration is stubbed in this MVP.  In a real deployment you would call the Arcium client SDK with the encrypted inputs and verify the returned commitment using their recommended flow.
- The on‑chain callback mode does not actually write to the Anchor program in this implementation.  A production version would create a signed transaction calling the program’s `complete_receipt` instruction with the computed tier and commitment.