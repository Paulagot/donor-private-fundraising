import React, { useState, useEffect } from 'react';
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface Receipt {
  commitment: string;
  amountTier: number;
  pda?: string; // filled by backend or client-side lookup
}

const DEBUG = true;
const dlog = (...args: any[]) => { if (DEBUG) console.log('[DonateSol]', ...args); };

// Tiers (unchanged)
const TIER_BENEFITS = [
  { tier: 0, name: 'Bronze (Tier 0 >0.10 SOL)',   color: '#94a3b8', copy: '1 pooled vote for a charity to receive a FundRaisely subscription.' },
  { tier: 1, name: 'Silver (Tier 1 >0.25 SOL)' ,   color: '#3b82f6', copy: '2 pooled votes + 1 roadmap (feature) vote.' },
  { tier: 2, name: 'Gold (Tier 2 >0.50 SOL)',     color: '#8b5cf6', copy: '3 pooled votes + 2 roadmap (feature) votes.' },
  { tier: 3, name: 'Platinum (Tier 3 >1.00 SOL)', color: '#f59e0b', copy: 'Directly select a charity to receive a subscription once funded.' },
];

// Cluster + explorer helpers
const CLUSTER = (import.meta.env.VITE_SOLANA_CLUSTER as 'mainnet' | 'devnet' | 'testnet') || 'devnet';
const clusterSuffix = CLUSTER === 'mainnet' ? '' : `?cluster=${CLUSTER}`;
const txExplorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}${clusterSuffix}`;
const accountExplorerUrl = (addr: string) => `https://explorer.solana.com/address/${addr}${clusterSuffix}`;

// TipJar program id (for client-side PDA lookup fallback)
const TIPJAR_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_TIPJAR_PROGRAM_ID || '7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q'
);

// receipt account layout: 8 (disc) + 1 (tier) + 32 (commitment) + 8 (ts) = 49 bytes
const RECEIPT_DATA_SIZE = 49;

// small helper to hex-encode bytes
const toHex = (u8: Uint8Array) => Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');

// Try to discover the receipt PDA on-chain by matching the commitment bytes.
async function findReceiptPdaByCommitment(conn: Connection, programId: PublicKey, commitmentHex: string): Promise<string | undefined> {
  try {
    const accounts = await conn.getProgramAccounts(programId, { filters: [{ dataSize: RECEIPT_DATA_SIZE }] });
    for (const { pubkey, account } of accounts) {
      const data = account.data as Buffer | Uint8Array;
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const got = toHex(u8.slice(9, 41)); // commitment at bytes [9..40]
      if (got === commitmentHex) {
        return pubkey.toBase58();
      }
    }
  } catch (e) {
    console.warn('[DonateSol] PDA lookup failed:', e);
  }
  return undefined;
}

// truncate to exactly 4 decimal places without rounding up
const to4dp = (n: number) => Math.floor(n * 10_000) / 10_000;

const DonateSol: React.FC = () => {
  const recipient = import.meta.env.VITE_DONATION_SOL_ADDRESS as string;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [reference, setReference] = useState<Keypair>();
  const [amount, setAmount] = useState<string>(''); // starts empty (no 0.01 shown)
  const [txSig, setTxSig] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  useEffect(() => {
    const kp = Keypair.generate();
    setReference(kp);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const effectiveAmount = amount?.trim();
  const amountNum = Number(effectiveAmount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  const handleSubmitReceipt = async (
    sigOverride?: string,
    lamportsOverride?: number,
    isPrivate: boolean = false
  ) => {
    setError(null);
    setLoading(true);
    setReceipt(null);
    try {
      const sigToUse = sigOverride || txSig.trim();

      // ensure we only consider up to 4 decimal places of SOL
      const amt = Number(effectiveAmount || '0');
      const amt4 = to4dp(amt);
      const lamportsToUse =
        lamportsOverride ?? Math.round(amt4 * LAMPORTS_PER_SOL);

      const body = {
        txSig: sigToUse,
        reference: reference?.publicKey.toBase58(),
        minLamports: lamportsToUse,
        isPrivate,
      };

      dlog(isPrivate ? '🔐 Submitting PRIVATE receipt' : 'Submitting STANDARD receipt', body);

      const res = await fetch(`${apiUrl}/arcium/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        dlog('API Error Response:', errorText);
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      dlog('API Response:', json);

      let payload: Receipt | null = null;

      if (json.receiptCommitment) {
        payload = {
          commitment: json.receiptCommitment,
          amountTier: json.amountTier,
          pda: json.receiptPda, // backend optional
        };
        setReceipt(payload);
        localStorage.setItem('fr_last_receipt', JSON.stringify(payload));
      } else if (json.status === 'queued') {
        payload = { commitment: 'PENDING', amountTier: -1 };
        setReceipt(payload);
      }

      // If backend didn't include PDA but we have a verified commitment: do a client-side lookup.
      if (payload && payload.commitment && payload.commitment !== 'PENDING' && !payload.pda) {
        try {
          const pda = await findReceiptPdaByCommitment(connection, TIPJAR_PROGRAM_ID, payload.commitment);
          if (pda) {
            const enriched = { ...payload, pda };
            setReceipt(enriched);
            localStorage.setItem('fr_last_receipt', JSON.stringify(enriched));
          }
        } catch (e) {
          console.warn('PDA enrichment failed:', e);
        }
      }
    } catch (err: any) {
      console.error('Receipt submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // STANDARD (public) flow → auto-submits receipt with isPrivate=false
  const handleDonateSimple = () => {
    if (!publicKey || !reference || !amountValid) return;
    (async () => {
      try {
        const amt4 = to4dp(Number(effectiveAmount));
        const lamports = Math.round(amt4 * LAMPORTS_PER_SOL);

        if (publicKey.toBase58() === recipient) throw new Error('Donation address must be different from your connected wallet.');

        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(recipient),
          lamports,
        });

        // Solana Pay reference tag (kept consistent with private flow)
        transferIx.keys.push({ pubkey: reference.publicKey, isSigner: false, isWritable: false });

        const tx = new Transaction().add(transferIx);
        const latest = await connection.getLatestBlockhash('finalized');

        const signature = await sendTransaction(tx, connection, {
          skipPreflight: true,
          preflightCommitment: 'processed',
        });
        dlog('🟦 Sent STANDARD tx', { signature });

        await connection.confirmTransaction(
          { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
          'confirmed'
        );

        setTxSig(signature);

        dlog('🟦 Auto-submitting to API with isPrivate=false');
        await handleSubmitReceipt(signature, lamports, false);
      } catch (err: any) {
        console.error('🟦 STANDARD DONATION ERROR:', err);
        if (Array.isArray(err?.logs)) dlog('on-chain logs:', err.logs);
        if (Array.isArray(err?.value?.logs)) dlog('on-chain logs (value):', err.value.logs);
        if (typeof err?.message === 'string') dlog('error message:', err.message);
      }
    })();
  };

  // PRIVATE flow → auto-submits receipt with isPrivate=true
  const handleTestPrivate = () => {
    if (!publicKey || !reference || !amountValid) return;
    (async () => {
      try {
        const amt4 = to4dp(Number(effectiveAmount));
        const lamports = Math.round(amt4 * LAMPORTS_PER_SOL);

        if (publicKey.toBase58() === recipient) throw new Error('Donation address must be different from your connected wallet.');

        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(recipient),
          lamports,
        });

        transferIx.keys.push({ pubkey: reference.publicKey, isSigner: false, isWritable: false });

        const tx = new Transaction().add(transferIx);
        const latest = await connection.getLatestBlockhash('finalized');

        const signature = await sendTransaction(tx, connection, {
          skipPreflight: true,
          preflightCommitment: 'processed',
        });
        dlog('🔐 Sent PRIVATE tx', { signature });

        await connection.confirmTransaction(
          { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
          'confirmed'
        );

        setTxSig(signature);

        dlog('🔐 Auto-submitting to API with isPrivate=true');
        await handleSubmitReceipt(signature, lamports, true);
      } catch (err: any) {
        console.error('🔐 PRIVATE DONATION ERROR:', err);
        if (Array.isArray(err?.logs)) dlog('on-chain logs:', err.logs);
        if (Array.isArray(err?.value?.logs)) dlog('on-chain logs (value):', err.value.logs);
        if (typeof err?.message === 'string') dlog('error message:', err.message);
      }
    })();
  };

  // Receipt tools
  const copyReceipt = async () => {
    if (!receipt) return;
    try { await navigator.clipboard.writeText(receipt.commitment); } catch {}
  };

  const downloadReceipt = () => {
    if (!receipt) return;
    const file = new Blob([JSON.stringify({ ...receipt, ts: Date.now() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundraisely-receipt-${receipt.commitment.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const claimUrl =
    receipt && receipt.commitment !== 'PENDING'
      ? `/claim?commitment=${encodeURIComponent(receipt.commitment)}&tier=${receipt.amountTier}`
      : '';

  const buttonsDisabled = !connected || !amountValid || loading;

  return (
    <div className="min-h-screen bg-black text-cyan-400 overflow-hidden relative flex items-center justify-center p-2 sm:p-4">
      <style>{`
        @keyframes heavyScanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes verticalScanline { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes glitch { 0% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
        @keyframes pulse-border { 0%, 100% { box-shadow: 0 0 5px #a855f7, 0 0 10px #a855f7, 0 0 15px #a855f7; } 50% { box-shadow: 0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 30px #0ff; } }
        .heavy-scanline { position: absolute; width: 100%; height: 8px; pointer-events: none; animation: heavyScanline 6s linear infinite; }
        .vertical-scanline { position: absolute; height: 100%; width: 6px; pointer-events: none; animation: verticalScanline 8s linear infinite; }
        .glitch { animation: ${glitchActive ? 'glitch 0.2s' : 'none'}; }
        .cyber-border { position: relative; border: 1px solid #a855f7; animation: pulse-border 2s ease-in-out infinite; }
        .cyber-input { background: rgba(168, 85, 247, 0.05); border: 1px solid #a855f7; color: #0ff; font-family: 'Courier New', monospace; }
        .cyber-input:focus { outline: none; box-shadow: 0 0 10px #a855f7; }
        .cyber-button { position: relative; overflow: hidden; transition: all 0.3s; }
        .cyber-button:hover { box-shadow: 0 0 20px #a855f7; transform: translateY(-2px); }
        .matrix-bg { position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(168, 85, 247, 0.03) 2px, rgba(168, 85, 247, 0.03) 4px); pointer-events: none; }
      `}</style>

      {/* scanlines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="heavy-scanline bg-gradient-to-b from-transparent via-cyan-400 to-transparent blur-sm" style={{ animationDelay: '0s' }} />
        <div className="heavy-scanline bg-gradient-to-b from-transparent via-purple-500 to-transparent blur-md" style={{ animationDelay: '2s' }} />
        <div className="heavy-scanline bg-gradient-to-b from-transparent via-cyan-400 to-transparent blur-sm" style={{ animationDelay: '4s' }} />
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="vertical-scanline bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-sm" style={{ animationDelay: '1s' }} />
        <div className="vertical-scanline bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-md" style={{ animationDelay: '5s' }} />
      </div>

      <div className="matrix-bg" />

      <div className="w-full max-w-md relative z-10">
        <div className="cyber-border bg-black bg-opacity-90 backdrop-blur-sm p-5 sm:p-7 rounded-lg">
          <h1
            className={`text-2xl sm:text-3xl font-bold mb-2 text-center font-mono tracking-wider glitch ${
              glitchActive
                ? 'text-pink-500'
                : 'text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text'
            }`}
          >
            DONOR-PRIVATE FUNDRAISING
          </h1>
          <p className="text-xs text-center mb-6 text-cyan-300 font-mono">{'>> '}Receipt Driven Verification{' <<'}</p>
          <p className="text-xs text-center mb-6 text-cyan-300 font-mono">{'>> '}Give privately. Get Perks.{' <<'}</p>

          {/* EXPLAINER */}
          <a
            href="/how-it-works"
            className="block mb-5 p-4 rounded-lg border-2 border-purple-500 bg-gradient-to-r from-purple-600/30 via-cyan-500/20 to-purple-600/30 hover:from-purple-500/50 hover:via-cyan-400/30 hover:to-purple-500/50 transition-all group relative overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse" />
            <div className="text-center relative z-10">
              <div className="text-sm font-mono text-yellow-300 mb-2 font-bold tracking-wider">
                HOW THIS WORKS (AMOUNT-PRIVATE)
              </div>

              <div className="text-xs font-mono text-purple-300 group-hover:text-purple-200 transition-colors leading-relaxed">
                • Your SOL donation funds a <span className="text-cyan-200 font-semibold">1-year Founding Partners Subscription</span> for a school, club, community group, or charity—<span className="text-cyan-200 font-semibold">no crypto setup</span> needed for them.<br/>
                • We verify your payment and compute your <span className="text-cyan-200 font-semibold">tier off-chain</span> with Arcium MPC, so the <span className="text-cyan-200 font-semibold">exact amount stays private</span> (only the tier is revealed - view tier benefits below).<br/>
                • The on-chain <em>receipt account</em> stores <span className="text-cyan-200 font-semibold">tier + commitment + timestamp </span>—<em> not</em> your amount or identity. (Your wallet is visible in the transfer, as per normal Solana.)
              </div>

              <div className="mt-3 text-[10px] font-mono text-cyan-300/90">
                <span className="px-2 py-1 rounded border border-cyan-400/40 bg-black/40">
                  Amount hidden (tier-only) • Powered by Arcium
                </span>
              </div>

              <div className="mt-3 text-xs font-mono text-cyan-200 underline">
                {'>> '}Learn how it works
              </div>
            </div>
          </a>

          {/* Collapsible tier benefits */}
          <details className="mb-5 border border-purple-500/40 rounded-lg">
            <summary className="cursor-pointer select-none px-3 py-2 font-mono text-sm text-cyan-300">
              [VIEW] TIER BENEFITS
            </summary>
            <div className="p-3 space-y-2">
              {TIER_BENEFITS.map(t => (
                <div key={t.tier} className="flex items-start gap-2">
                  <span className="mt-1 inline-block w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <div>
                    <div className="font-mono text-cyan-200 text-sm">{t.name}</div>
                    <div className="text-xs text-cyan-400/80">{t.copy}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Amount input only (no presets) */}
          <div className="mb-5">
            <div className="text-xs font-mono mb-2 text-cyan-300">DONATION (SOL):</div>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Please enter dontation amount"
              className="w-full cyber-input px-3 py-2 rounded text-sm font-mono placeholder-cyan-700 text-cyan-100"
            />
            {!amountValid && amount !== '' && (
              <div className="mt-1 text-[11px] text-red-400 font-mono">Enter a valid positive amount (up to 4 decimals).</div>
            )}
          </div>

          {/* Wallet button */}
          <div className="mb-5 flex justify-center">
            <WalletMultiButton className="!w-full !max-w-xs !bg-black !border-2 !border-purple-500 !text-cyan-400 hover:!bg-purple-900 hover:!text-cyan-300 !transition-all !font-mono !text-sm !py-3 !rounded" />
          </div>

          <div className="space-y-2 mb-5">
            {/* PRIVATE (Arcium MPC) */}
            <button
              onClick={handleTestPrivate}
              disabled={buttonsDisabled}
              className={`w-full cyber-button py-3 rounded text-sm font-mono border-2 transition-all ${
                !buttonsDisabled
                  ? 'bg-purple-600 text-cyan-400 border-purple-400 hover:shadow-lg hover:bg-purple-700 font-bold'
                  : 'bg-gray-900 text-gray-600 border-gray-700 cursor-not-allowed'
              }`}
            >
              {connected ? '[Private & Secure Donate] ARCIUM MPC' : '[WALLET REQUIRED]'}
            </button>

            {/* STANDARD (public) */}
            {/* <button
              onClick={handleDonateSimple}
              disabled={buttonsDisabled}
              className={`w-full cyber-button py-3 rounded text-sm font-mono border-2 transition-all ${
                !buttonsDisabled
                  ? 'bg-cyan-600 text-black border-cyan-400 hover:shadow-lg hover:bg-cyan-500 font-bold'
                  : 'bg-gray-900 text-gray-600 border-gray-700 cursor-not-allowed'
              }`}
            >
              {connected ? '[Standard Donate] PUBLIC (Explorer-visible amount)' : '[WALLET REQUIRED]'}
            </button> */}
          </div>

          {/* TX input + transaction explorer link */}
          <div className="mb-4">
            <div className="text-xs font-mono mb-2 text-cyan-300">TX_SIGNATURE:</div>
            <input
              type="text"
              value={txSig}
              onChange={(e) => setTxSig(e.target.value)}
              placeholder="PASTE_TX_SIG_HERE"
              className="w-full cyber-input px-3 py-2 rounded text-sm font-mono placeholder-cyan-700 text-cyan-100"
            />
            {txSig && (
              <div className="mt-2">
                <a
                  href={txExplorerUrl(txSig)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono underline text-cyan-300 hover:text-cyan-200"
                >
                  {'>> '}View on Explorer
                </a>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded text-sm font-mono text-red-400">
              ERROR: {error}
            </div>
          )}

          {receipt && (
            <div className="mt-3 p-3 cyber-border rounded text-sm font-mono bg-black">
              <div className="text-green-400 mb-1 font-bold">
                STATUS: {receipt.commitment === 'PENDING' ? 'QUEUED' : 'VERIFIED'}
              </div>
              <div className="text-cyan-300 break-all">ID: {receipt.commitment}</div>
              <div className="text-cyan-300">
                TIER: {receipt.amountTier === -1 ? 'COMPUTING...' : receipt.amountTier}
              </div>

              {/* Receipt tools */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={copyReceipt}
                  className="inline-flex items-center justify-center px-3 py-2 rounded border-2 border-purple-500 text-cyan-300 hover:bg-purple-900"
                >
                  [COPY ID]
                </button>
                {receipt.commitment !== 'PENDING' && (
                  <button
                    onClick={downloadReceipt}
                    className="inline-flex items-center justify-center px-3 py-2 rounded border-2 border-purple-500 text-cyan-300 hover:bg-purple-900"
                  >
                    [DOWNLOAD RECEIPT.JSON]
                  </button>
                )}
                {/* Receipt PDA link (backend or client-side lookup) */}
                {receipt.pda && (
                  <a
                    href={accountExplorerUrl(receipt.pda)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-2 rounded border-2 border-purple-500 text-cyan-300 hover:bg-purple-900"
                  >
                    [OPEN RECEIPT PDA]
                  </a>
                )}
              </div>

              {/* Claim button */}
              <div className="mt-3">
                <a
                  href={receipt.commitment !== 'PENDING' ? claimUrl : '#'}
                  aria-disabled={receipt.commitment === 'PENDING'}
                  className={`inline-flex items-center justify-center px-4 py-2 rounded border-2 font-mono text-sm ${
                    receipt.commitment !== 'PENDING'
                      ? 'border-purple-500 text-cyan-300 hover:bg-purple-900'
                      : 'border-gray-700 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {receipt.commitment !== 'PENDING' ? '[CLAIM BENEFITS]' : '[WAITING FOR RECEIPT…]'}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-cyan-600 font-mono px-2">
          NO_DATA_COLLECTION // IRREVERSIBLE_TX // PRIVACY_FOCUSED
        </div>
      </div>
    </div>
  );
};

export default DonateSol;






