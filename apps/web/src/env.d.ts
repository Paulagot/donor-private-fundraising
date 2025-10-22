/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DONATION_SOL_ADDRESS: string;
  readonly VITE_API_URL: string;
  readonly VITE_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
