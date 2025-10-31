# FundRaisely — Privacy‑Protecting Donations · API

Backend services for verifying Solana donations with **Arcium** MPC and recording **receipt PDAs** via **Anchor**.

> **Open‑source pledge:** MIT‑licensed and **will remain open source** after the hackathon.

> **Legacy naming note:** Package name may still include *cypherpunk‑tipjar*.

---

## Features

* `POST /arcium/verify` — validate a tx, compute donation tier, and either write a **receipt PDA** on‑chain or return the result (mode‑dependent).
* `GET /health` — liveness probe `{ status: "ok" }`.
* **Rate limiting** — protects verification endpoint.
* **Strict validation** — Zod schemas for request bodies.
* **Env‑driven config** — RPC URL, recipient, Arcium, callback mode, tier thresholds.

---

## Environment

Create `.env` from `.env.example` (or from root). **Dev example:**

```ini
RPC_URL=https://api.devnet.solana.com
DONATION_SOL_ADDRESS=7koYv1dqqHWh4PQ5bVh8CyLBTxqAHeARPiuazzF2FhCY

# Optional Arcium demo bits
ARCIUM_CLUSTER_OFFSET=1078779259
API_SIGNER_KEYPAIR_PATH=

PORT=3001
CALLBACK_MODE=server  # or: onchain

# Programs
MXE_PROGRAM_ID=AuoVDGoVfQaRdKGGkrgQyfpcGrJt9P6C8AqVSkNoqo5i
TIPJAR_PROGRAM_ID=7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q

# CORS
PUBLIC_WEBSITE_ORIGIN=http://localhost:5173
```

**Tier thresholds** (lamports) can be configured (e.g., `MIN_TIER_LAMPORTS_0..3`) or via a JSON blob depending on implementation.

---

## Run & build

```bash
pnpm install
pnpm dev     # ts-node dev server
pnpm build   # tsc → dist/
pnpm start   # node dist/index.js
```

---

## API — `POST /arcium/verify`

**Request body**

```json
{
  "txSig": "<solana tx signature>",
  "reference": "<optional reference pubkey>",
  "minLamports": 100000000
}
```

**Server flow**

1. Fetch tx by `txSig` from `RPC_URL` (devnet); ensure transfer to `DONATION_SOL_ADDRESS` ≥ `minLamports`.
2. Map amount → **tier** using configured thresholds.
3. Produce **commitment** (Arcium MPC in production; deterministic stub acceptable in dev).
4. If `CALLBACK_MODE=onchain`, sign and write **receipt PDA** via Anchor; else, return `{ status: "verified", tier, receiptCommitment }`.

**Response (server mode)**

```json
{
  "status": "verified",
  "tier": "gold",
  "receiptCommitment": "...",
  "receiptPubkey": "<optional, when written>"
}
```

---

## Notes

* Keep Arcium credentials **server‑side**.
* Do **not** log raw donation amounts.
* Validate `reference` if your front‑end uses reference‑based discovery.

---

## Scripts (from package.json)

```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts"
  }
}
```

---

## License

**MIT** — This API **will remain open source**.
