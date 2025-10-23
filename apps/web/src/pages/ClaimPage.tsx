import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import FundRaiselyBenefitClaim, { TIER_BENEFITS } from '../components/FundRaiselyBenefitClaim';

import { Buffer as _Buffer } from 'buffer';
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = _Buffer;
}

const TIPJAR_PROGRAM_ID = new PublicKey('7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q');
const RPC_URL = 'https://api.devnet.solana.com';

type VerifyResult = { tier: number; receiptPda: string };

export default function ClaimBenefitsPage() {
  const { publicKey, signMessage } = useWallet();
  const [commitment, setCommitment] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const verifyRef = useRef<HTMLDivElement>(null);

  // Prefill commitment from ?commitment= or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qCommit = params.get('commitment');
    if (qCommit && /^[a-f0-9]{64}$/i.test(qCommit)) {
      setCommitment(qCommit);
      return;
    }
    const ls = localStorage.getItem('fr_last_receipt');
    if (ls) {
      try {
        const { commitment: c } = JSON.parse(ls);
        if (c && /^[a-f0-9]{64}$/i.test(c)) setCommitment(c);
      } catch {}
    }
  }, []);

  const scrollToVerify = () => verifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  async function handleVerify() {
    if (!commitment || !publicKey || !signMessage) {
      setError('Please connect a wallet and enter your receipt commitment.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setResult(null);

      if (!/^[a-f0-9]{64}$/i.test(commitment)) {
        throw new Error('Invalid commitment format. Expected 64 hex characters.');
      }

      // Prove wallet ownership
      const msg = new TextEncoder().encode(`Claiming benefits for commitment: ${commitment}`);
      const signature = await signMessage(msg);
      console.log('✅ Verified wallet:', bs58.encode(signature));

      // Derive PDA + fetch account
      const [receiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('receipt'), Buffer.from(commitment, 'hex')],
        TIPJAR_PROGRAM_ID
      );
      const accountInfo = await new Connection(RPC_URL, 'confirmed').getAccountInfo(receiptPda);
      if (!accountInfo) throw new Error('Receipt not found on-chain (invalid or not yet written).');

      const tier = accountInfo.data[8];
      setResult({ tier, receiptPda: receiptPda.toBase58() });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  const TierCard = ({
    name, desc, accent,
  }: { name: string; desc: string; accent: string }) => (
    <div
      className="p-4 rounded-lg border bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-gray-900/40 dark:to-gray-900/10"
      style={{ borderColor: accent + '55' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <h3 className="font-bold" style={{ color: accent }}>{name}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{desc}</p>
    </div>
  );

  // short, benefit-forward copy
  const heroCopy = useMemo(() => ([
    {
      name: 'Bronze',
      desc: '1 vote into the community pool. When funded, the top-voted charity gets a FundRaisely subscription.',
      accent: '#94a3b8',
    },
    {
      name: 'Silver',
      desc: '2 pool votes + 1 feature vote to steer what we build next.',
      accent: '#3b82f6',
    },
    {
      name: 'Gold',
      desc: '3 pool votes + 2 feature votes — real influence on roadmap.',
      accent: '#8b5cf6',
    },
    {
      name: 'Platinum',
      desc: 'Pick a charity directly. When funds clear, your selection receives the subscription.',
      accent: '#f59e0b',
    },
  ]), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-black dark:via-black dark:to-black text-gray-900 dark:text-white">
      {/* Brand Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 blur-2xl bg-gradient-to-tr from-indigo-300 via-purple-300 to-cyan-300 dark:from-purple-900/40 dark:via-cyan-900/30 dark:to-indigo-900/30" />
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 relative">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-cyan-500 text-transparent bg-clip-text">
              Claim Your FundRaisely Benefits
            </span>
          </h1>
          <p className="mt-3 text-lg text-gray-700/90 dark:text-gray-300 font-sans">
            Donate. Vote. Fund impact. Bronze/Silver/Gold pool their votes to award subscriptions; Platinum can
            select a charity directly.
          </p>

          {/* Benefits upfront (can’t be missed) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {heroCopy.map((t) => (
              <TierCard key={t.name} name={t.name} desc={t.desc} accent={t.accent} />
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="/donate/sol"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Make a Donation
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg font-semibold border border-indigo-300 bg-white/70 hover:bg-white transition dark:bg-gray-900/50 dark:border-gray-700"
            >
              Visit Impact Dashboard
            </a>
                <a
              href="/how-it-works"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              How it Works
            </a>
          </div>
        </div>
      </header>

      {/* Verify Box */}
      <main ref={verifyRef} className="max-w-5xl mx-auto px-4 pb-16">
        <div className="mt-8 bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-xl border border-indigo-200/50 dark:border-gray-800 p-6">
          {/* Wallet */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">Step 1: Connect Wallet</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Prove you control the wallet that made the donation.
              </p>
            </div>
            <WalletMultiButton className="!bg-black !border-2 !border-purple-500 !text-cyan-300 hover:!bg-purple-900 hover:!text-cyan-200 !font-mono !text-sm !px-4 !py-2" />
          </div>

          {/* Commitment */}
          <div className="mt-5">
            <h3 className="font-semibold">Step 2: Enter Your Receipt Commitment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Paste the 64-char ID you received after donating. (We’ll re-verify on-chain.)
            </p>
            <input
              value={commitment}
              onChange={(e) => setCommitment(e.target.value.trim())}
              placeholder="3e316701e54706b8f4921593c8a849843b88182cb3eb9bc70a1584602acc7d42"
              className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-800 border-indigo-200/60 dark:border-gray-700 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              disabled={!publicKey}
            />
            <button
              onClick={handleVerify}
              disabled={!publicKey || !commitment || loading}
              className="mt-3 w-full sm:w-auto px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded border border-red-600/30 bg-red-900/20 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* After verify → show full claim module */}
        {result && publicKey && (
          <div className="mt-6">
            <FundRaiselyBenefitClaim
              tier={result.tier}
              receiptPda={result.receiptPda}
              walletAddress={publicKey.toBase58()}
            />
          </div>
        )}

        {/* Privacy strip */}
        <div className="mt-6 text-xs text-gray-600 dark:text-gray-400 font-mono text-center">
          NO_DATA_COLLECTION // PRIVACY_FOCUSED // VERIFIABLE_RECEIPTS
        </div>
      </main>
    </div>
  );
}

