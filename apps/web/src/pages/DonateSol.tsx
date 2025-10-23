// src/components/DonateSol.tsx
import React, { useState, useEffect } from 'react';
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface Receipt {
  commitment: string;
  amountTier: number;
  pda?: string;
}

const DEBUG = true;
const dlog = (...args: any[]) => { if (DEBUG) console.log('[DonateSol]', ...args); };

const TIER_BENEFITS = [
  { tier: 0, name: 'Bronze (Tier 0 >0.10 SOL)',   color: '#94a3b8', copy: '1 pooled vote for a charity to receive a FundRaisely subscription.' },
  { tier: 1, name: 'Silver (Tier 1 >0.25 SOL)' ,   color: '#3b82f6', copy: '2 pooled votes + 1 roadmap (feature) vote.' },
  { tier: 2, name: 'Gold (Tier 2 >0.50 SOL)',     color: '#8b5cf6', copy: '3 pooled votes + 2 roadmap (feature) votes.' },
  { tier: 3, name: 'Platinum (Tier 3 >1.00 SOL)', color: '#f59e0b', copy: 'Directly select a charity to receive a subscription once funded.' },
];

const CLUSTER = (import.meta.env.VITE_SOLANA_CLUSTER as 'mainnet' | 'devnet' | 'testnet') || 'devnet';
const clusterSuffix = CLUSTER === 'mainnet' ? '' : `?cluster=${CLUSTER}`;
const txExplorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}${clusterSuffix}`;
const accountExplorerUrl = (addr: string) => `https://explorer.solana.com/address/${addr}${clusterSuffix}`;

const TIPJAR_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_TIPJAR_PROGRAM_ID || '7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q'
);

const RECEIPT_DATA_SIZE = 49;
const toHex = (u8: Uint8Array) => Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');

async function findReceiptPdaByCommitment(conn: Connection, programId: PublicKey, commitmentHex: string): Promise<string | undefined> {
  try {
    const accounts = await conn.getProgramAccounts(programId, { filters: [{ dataSize: RECEIPT_DATA_SIZE }] });
    for (const { pubkey, account } of accounts) {
      const data = account.data as Buffer | Uint8Array;
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      const got = toHex(u8.slice(9, 41));
      if (got === commitmentHex) return pubkey.toBase58();
    }
  } catch (e) {
    console.warn('[DonateSol] PDA lookup failed:', e);
  }
  return undefined;
}

const to4dp = (n: number) => Math.floor(n * 10_000) / 10_000;

const DonateSol: React.FC = () => {
  const recipient = import.meta.env.VITE_DONATION_SOL_ADDRESS as string;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const [reference, setReference] = useState<Keypair>();
  const [amount, setAmount] = useState<string>('');
  const [txSig, setTxSig] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [glitchActive, setGlitchActive] = useState(false);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  useEffect(() => {
    setReference(Keypair.generate());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const effectiveAmount = amount?.trim();
  const amountNum = Number(effectiveAmount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  const handleSubmitReceipt = async (
    sigOverride?: string,
    lamportsOverride?: number,
    isPrivate: boolean = true
  ) => {
    setError(null);
    setLoading(true);
    setReceipt(null);
    try {
      const sigToUse = sigOverride || txSig.trim();
      const amt = Number(effectiveAmount || '0');
      const amt4 = to4dp(amt);
      const lamportsToUse = lamportsOverride ?? Math.round(amt4 * LAMPORTS_PER_SOL);

      const res = await fetch(`${apiUrl}/arcium/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txSig: sigToUse,
          reference: reference?.publicKey.toBase58(),
          minLamports: lamportsToUse,
          isPrivate,
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const json = await res.json();
      dlog('API Response:', json);

      let payload: Receipt | null = null;

      if (json.receiptCommitment) {
        payload = { commitment: json.receiptCommitment, amountTier: json.amountTier, pda: json.receiptPda };
        setReceipt(payload);
        localStorage.setItem('fr_last_receipt', JSON.stringify(payload));
      } else if (json.status === 'queued') {
        payload = { commitment: 'PENDING', amountTier: -1 };
        setReceipt(payload);
      }

      if (payload && payload.commitment && payload.commitment !== 'PENDING' && !payload.pda) {
        const pda = await findReceiptPdaByCommitment(connection, TIPJAR_PROGRAM_ID, payload.commitment);
        if (pda) {
          const enriched = { ...payload, pda };
          setReceipt(enriched);
          localStorage.setItem('fr_last_receipt', JSON.stringify(enriched));
        }
      }
    } catch (err: any) {
      console.error('Receipt submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateDonate = () => {
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
        await handleSubmitReceipt(signature, lamports, true);
      } catch (err: any) {
        console.error('🔐 PRIVATE DONATION ERROR:', err);
        if (Array.isArray(err?.logs)) dlog('on-chain logs:', err.logs);
        if (Array.isArray(err?.value?.logs)) dlog('on-chain logs (value):', err.value.logs);
        if (typeof err?.message === 'string') dlog('error message:', err.message);
      }
    })();
  };

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
    <div className="min-h-screen bg-black text-cyan-100 relative">
      <div className="pointer-events-none absolute inset-0 hidden lg:block opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(168,85,247,0.06) 1px, transparent 0), radial-gradient(circle at 1px 1px, rgba(34,211,238,0.04) 1px, transparent 0)',
          backgroundSize: '24px 24px, 48px 48px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="mb-10">
          <h1 className={`text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 ${glitchActive ? 'animate-pulse' : ''}`}>
            Privacy-Protecting Fundraising
          </h1>
          <p className="mt-3 md:mt-4 text-cyan-300/90 max-w-3xl">
            Give privately. Unlock perks with a receipt that proves your tier, without revealing your exact amount in public UIs.
          </p>
        </div>

        {/* Balanced two-column stacks on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT STACK: Donate + Quick notes */}
          <div className="flex flex-col gap-8">
            {/* Donate card */}
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-b from-[#0c0c16] to-black p-6 md:p-7 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Donate Privately</h2>
                  <p className="text-xs md:text-sm text-cyan-300/80">Amount-private tier receipt • Powered by Arcium</p>
                </div>
                <div className="w-full sm:w-auto">
                  <WalletMultiButton className="!w-full !bg-black !border-2 !border-purple-500 !text-cyan-200 hover:!bg-purple-900 hover:!text-cyan-100 !transition-all !font-mono !text-sm !py-2.5 !rounded" />
                </div>
              </div>

              {/* Amount */}
              <div className="mt-6">
                <label className="text-xs font-mono mb-2 text-cyan-300 block">DONATION (SOL):</label>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Please enter donation amount >>> see tiers below"
                  className="w-full bg-black/50 border border-purple-500/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-cyan-100 font-mono rounded-lg px-3 py-2.5 placeholder-cyan-700 transition"
                />
                {!amountValid && amount !== '' && (
                  <div className="mt-1 text-[11px] text-red-400 font-mono">Enter a valid positive amount (up to 4 decimals).</div>
                )}
              </div>

              {/* TX Signature */}
              <div className="mt-5">
                <label className="text-xs font-mono mb-2 text-cyan-300 block">TX_SIGNATURE:</label>
                <input
                  type="text"
                  value={txSig}
                  onChange={(e) => setTxSig(e.target.value)}
                  placeholder="PASTE_TX_SIG_HERE (auto-populates after you donate)"
                  className="w-full bg-black/50 border border-purple-500/60 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-cyan-100 font-mono rounded-lg px-3 py-2.5 placeholder-cyan-700 transition"
                />
                {txSig && (
                  <div className="mt-2">
                    <a href={txExplorerUrl(txSig)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono underline text-cyan-300 hover:text-cyan-200">
                      {'>> '}View on Explorer
                    </a>
                  </div>
                )}
              </div>

              {/* Donate button */}
              <div className="mt-6">
                <button
                  onClick={handlePrivateDonate}
                  disabled={buttonsDisabled}
                  className={`w-full sm:w-auto px-5 py-3 rounded-lg text-sm font-mono border-2 transition-all ${
                    buttonsDisabled
                      ? 'bg-gray-900 text-gray-600 border-gray-700 cursor-not-allowed'
                      : 'bg-purple-600 text-cyan-100 border-purple-400 hover:shadow-lg hover:bg-purple-700 font-bold'
                  }`}
                >
                  {connected ? (loading ? 'Processing…' : '[Private & Secure Donate]') : '[WALLET REQUIRED]'}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-500/70 rounded text-sm font-mono text-red-300">
                  ERROR: {error}
                </div>
              )}

              {/* Receipt */}
              {receipt && (
                <div className="mt-6 rounded-xl border border-cyan-500/40 bg-black/60 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-green-400 font-bold font-mono">
                      STATUS: {receipt.commitment === 'PENDING' ? 'QUEUED' : 'VERIFIED'}
                    </div>
                    {receipt.pda && (
                      <a href={accountExplorerUrl(receipt.pda)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono underline text-cyan-300 hover:text-cyan-200">
                        Open Receipt PDA
                      </a>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                    <div className="break-all">
                      <div className="text-cyan-400/80">RECEIPT ID</div>
                      <div className="text-cyan-200">{receipt.commitment}</div>
                    </div>
                    <div>
                      <div className="text-cyan-400/80">TIER</div>
                      <div className="text-cyan-200">
                        {receipt.amountTier === -1 ? 'COMPUTING…' : receipt.amountTier}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={copyReceipt} className="inline-flex items-center justify-center px-3 py-2 rounded border-2 border-purple-500 text-cyan-200 hover:bg-purple-900">
                      [COPY ID]
                    </button>
                    {receipt.commitment !== 'PENDING' && (
                      <button onClick={downloadReceipt} className="inline-flex items-center justify-center px-3 py-2 rounded border-2 border-purple-500 text-cyan-200 hover:bg-purple-900">
                        [DOWNLOAD RECEIPT.JSON]
                      </button>
                    )}
                    {receipt.commitment !== 'PENDING' && (
                      <a
                        href={claimUrl || '#'}
                        aria-disabled={!claimUrl}
                        className={`inline-flex items-center justify-center px-3 py-2 rounded border-2 font-mono text-sm ${
                          claimUrl ? 'border-purple-500 text-cyan-200 hover:bg-purple-900' : 'border-gray-700 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        [CLAIM BENEFITS]
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Fine print */}
              <div className="mt-4 text-center text-[11px] text-cyan-600 font-mono">
                NO_DATA_COLLECTION // IRREVERSIBLE_TX // PRIVACY_FOCUSED
              </div>
            </div>

            {/* Quick notes */}
            <div className="rounded-2xl border border-cyan-500/30 bg-black/50 p-5">
              <h4 className="font-bold mb-2">Quick notes</h4>
              <ul className="text-sm text-cyan-300/90 space-y-1.5">
                <li>• Exact amounts are not revealed in public UIs (tier-only).</li>
                <li>• Receipts are portable (ID/QR) and redeemable for perks.</li>
                <li>• Impact Dashboard shows tier counts, redemptions & pool progress.</li>
              </ul>
              <div className="mt-4 flex gap-2">
                <a href="/dashboard" className="inline-flex items-center px-3 py-2 rounded border border-purple-500/70 text-cyan-200 hover:bg-purple-900/40 text-xs">
                  [Impact Dashboard]
                </a>
                <a href="/claim" className="inline-flex items-center px-3 py-2 rounded border border-cyan-500/70 text-cyan-200 hover:bg-cyan-900/30 text-xs">
                  [Claim Perks]
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT STACK: Explainer + Tiers */}
          <div className="flex flex-col gap-8">
            {/* Explainer */}
            <div
              className="rounded-2xl border-2 border-purple-500 bg-gradient-to-r from-purple-600/20 via-cyan-500/10 to-purple-600/20 p-6 md:p-7 relative overflow-hidden"
              style={{ boxShadow: '0 0 22px rgba(168,85,247,0.25)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse" />
              <div className="relative">
                <div className="text-m font-mono text-yellow-300 mb-2 font-bold tracking-wider">
                  HOW THIS WORKS (AMOUNT-PRIVATE)
                </div>
                <p className="text-sm md:text-[15px] leading-relaxed text-purple-200/90">
                  • Your SOL donation funds a <span className="text-cyan-100 font-semibold">1-year Founding Partners Subscription</span> for a school, club, community group, or charity, <span className="text-cyan-100 font-semibold">no crypto setup</span> needed for them. <br />
                  • We verify your payment and compute your <span className="text-cyan-100 font-semibold">tier off-chain</span>, so the <span className="text-cyan-100 font-semibold">exact amount stays private</span> (only the tier is revealed for benefits). <br />
                  • The on-chain <em>receipt account</em> stores <span className="text-cyan-100 font-semibold">tier + commitment + timestamp</span> — <em>not</em> your amount or identity (standard Solana transfers remain visible on-chain).
                </p>
                <div className="mt-3 text-[11px] font-mono text-cyan-200/90">
                  <span className="px-2 py-1 rounded border border-cyan-400/40 bg-black/40">
                    Amount hidden (tier-only) • Private verification
                  </span>
                </div>
                <div className="mt-3">
                  <a href="/how-it-works" className="text-xs font-mono underline text-cyan-300 hover:text-cyan-100">
                    {'>> '}Learn how it works
                  </a>
                </div>
              </div>
            </div>

            {/* Tiers */}
            <div className="rounded-2xl border border-purple-500/40 bg-black/60 p-6 md:p-7">
              <h3 className="text-lg md:text-xl font-bold mb-3">Tier Benefits</h3>
              <div className="space-y-3">
                {TIER_BENEFITS.map(t => (
                  <div key={t.tier} className="flex items-start gap-3">
                    <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    <div>
                      <div className="font-mono text-cyan-100 text-sm md:text-[15px]">{t.name}</div>
                      <div className="text-xs md:text-sm text-cyan-300/90">{t.copy}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-cyan-400/80">
                Bronze/Silver/Gold pool together; Platinum can directly sponsor a subscription.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonateSol;








