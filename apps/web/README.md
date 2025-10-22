# Cypherpunk Tip Jar – Web

This package contains the React front‑end for the Cypherpunk Tip Jar.  It renders the `/donate/sol` page where donors can scan a Solana Pay QR code, choose a donation amount and send SOL either publicly or privately.  After sending, the page can request an Arcium‑verified receipt via the API.

## Development

```bash
pnpm install
pnpm dev
```

The application will be served at `http://localhost:5173`.  By default, it redirects all routes to `/donate/sol`.  During development the API URL is configured via `VITE_API_URL` in `.env`.

### Environment variables

Create a `.env` file based on `.env.example` and populate the following values:

| Variable | Description |
| --- | --- |
| `VITE_RPC_URL` | Optional RPC endpoint for querying transactions.  Defaults to devnet. |
| `VITE_DONATION_SOL_ADDRESS` | Recipient Solana public key. |
| `VITE_API_URL` | Base URL of the backend API. |

### Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Starts Vite in development mode. |
| `pnpm build` | Builds the production bundle. |
| `pnpm preview` | Serves the production bundle locally. |
| `pnpm lint` | Runs ESLint on the source files. |

## Notes

- A per‑session reference public key is generated using `@solana/web3.js` and appended as a `reference` query parameter to the Solana Pay URL.
- The QR code is generated with `react-qr-code` and updates when the amount changes.
- The “Donate Privately” modal contains pseudo‑code snippets for Elusiv and Light Protocol.  These are placeholders to guide developers; actual integration would involve importing the respective SDKs and handling shield/unshield flows.
- After sending a transaction, users must paste the signature into the input box.  Auto‑discovery via the reference is out of scope for this MVP but can be implemented using `getSignaturesForAddress` and `getTransaction` from `@solana/web3.js`.