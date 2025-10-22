# Cypherpunk Tip Jar

**Cypherpunk Tip Jar** is a minimal Solana donation portal built for FundRaisely’s demo at the Solana Colosseum.  It allows supporters to send voluntary gifts in SOL to a designated recipient wallet, optionally leveraging privacy‑preserving tools.  Donations are acknowledged by an Arcium‑verified receipt that proves the amount tier without revealing the sender or exact amount.

This repository is organised as a monorepo with three packages:

- **`apps/web`** – a React/TypeScript front‑end built with Vite and Tailwind.  It serves the `/donate/sol` page, generates per‑session payment references, displays a Solana Pay QR code, guides donors through simple and private donation flows, and fetches privacy‑preserving receipts.
- **`apps/api`** – a Node/Express backend that exposes a `POST /arcium/verify` endpoint.  It validates incoming transactions, submits encrypted verification requests to Arcium and, depending on the configured callback mode, either writes receipt PDAs on‑chain or returns the result directly to the client.
- **`programs/tipjar-receipts`** – an Anchor program deployed to Solana devnet.  It defines a `Receipt` PDA keyed off a unique reference and an instruction used by Arcium to record the commitment and amount tier on‑chain.

Each package contains its own README with setup instructions, environment variable descriptions and runbooks.  A quickstart is provided below for convenience.

## Quickstart

1. **Install dependencies**

   ```bash
   # install pnpm globally if not already installed
   npm install -g pnpm

   # install workspace dependencies
   cd cypherpunk-tipjar
   pnpm install
   ```

2. **Configure your environment**

   Copy the provided `.env.example` files in the root and each package to `.env` and fill in the missing values.  At a minimum you need a Solana devnet RPC URL and a recipient SOL address.  The Arcium API key and cluster can be left as placeholders when running locally.

3. **Run the front‑end**

   ```bash
   pnpm --filter web dev
   ```

   The donation page will be available at `http://localhost:5173/donate/sol`.

4. **Run the API**

   ```bash
   pnpm --filter api dev
   ```

   The API will listen on `http://localhost:3001`.  The health endpoint is available at `/health` and the receipt verification endpoint at `/arcium/verify`.

5. **Build and deploy the Anchor program**

   ```bash
   pnpm --filter tipjar-receipts build
   pnpm --filter tipjar-receipts deploy
   ```

   This compiles the program and deploys it to Solana devnet using your configured wallet.  The resulting program ID is written to `programs/tipjar-receipts/deployments/devnet.json` and consumed by the API and front‑end.

6. **Run the demo**

   A detailed demo script can be found in `docs/DEMO.md` that guides you through sending a donation on devnet, verifying it, and obtaining an Arcium‑verified receipt.

## Repository layout

```
cypherpunk-tipjar/
├── README.md
├── docs/
│   └── DEMO.md
├── package.json
├── .editorconfig
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── .env.example
└── apps/
    ├── web/
    ├── api/
    └── …
└── programs/
    └── tipjar-receipts/
```

See each package directory for more details.# donor-private-fundraising
