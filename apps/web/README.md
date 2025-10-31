# FundRaisely — Privacy‑Protecting Donations · Web

React/Vite front‑end for the donation portal. Renders `/donate/sol`, generates per‑session **reference** keys, shows a **Solana Pay** QR, and fetches **privacy‑preserving receipts**.

> **Open‑source pledge:** MIT‑licensed and **will remain open source** after the hackathon.

> **Legacy naming note:** Package name may still include *cypherpunk‑tipjar*.

---

## Development

```bash
pnpm install
pnpm dev
```

* App: [http://localhost:5173](http://localhost:5173) (dev)
* Default route redirects to `/donate/sol`.

**Environment** — create `.env` from `.env.example`:

```ini
VITE_DONATION_SOL_ADDRESS=7koYv1dqqHWh4PQ5bVh8CyLBTxqAHeARPiuazzF2FhCY
VITE_API_URL=http://localhost:3001
VITE_TIPJAR_PROGRAM_ID=7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q
# Optional: VITE_RPC_URL (defaults to devnet if omitted)
```

---

## What the UI does

* Creates a per‑session **reference** (`@solana/web3.js`) and appends it to the Solana Pay URL.
* Renders a **QR code** (react‑qr‑code) that updates as the amount changes.
* Offers a “Donate Privately” path (Elusiv/Light Protocol **stubs** for now; integrate SDKs for real shield/unshield flows).
* After sending, donors paste the **tx signature**; the app calls the API to request an **Arcium‑verified** receipt.
* (Suggested enhancement) Auto‑discover signatures by reference using `getSignaturesForAddress` + `getTransaction`.

---

## Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 8080 --strictPort",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

**Build & preview**

```bash
pnpm build
pnpm preview  # http://localhost:8080
```

---

## Notes

* Never expose private keys or Arcium credentials in the browser.
* Amount privacy is enforced at the **app layer** (the blockchain is public).
* Program IDs can be **our devnet IDs** or **your own** (if you deploy the Anchor program).

---

## License

**MIT** — The web app **will remain open source**.
