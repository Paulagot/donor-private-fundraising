// src/pages/HowItWorks.tsx
import React from 'react';

const TIERS = [
  { name: 'Bronze',   sol: '0.10 SOL',  color: '#94a3b8', perks: ['1 pooled vote toward the next subscription grant'] },
  { name: 'Silver',   sol: '0.25 SOL',  color: '#3b82f6', perks: ['2 pooled votes', 'Access to Supporters Corner'] },
  { name: 'Gold',     sol: '0.50 SOL',  color: '#8b5cf6', perks: ['3 pooled votes', '2 roadmap (feature) votes'] },
  { name: 'Platinum', sol: '1.00 SOL+', color: '#f59e0b', perks: ['Directly select a charity to receive a subscription (once funded)'] },
];

function FlowDiagramSVG() {
  return (
    <svg
      viewBox="0 0 1100 520"
      role="img"
      aria-label="Protocol flow: donor -> verification (Arcium MPC) -> on-chain receipt -> dashboards/claim"
      className="w-full h-auto rounded-lg border border-cyan-500/30 bg-black/30"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Donor */}
      <rect x="40" y="60" width="220" height="90" rx="12" fill="#0b0b14" stroke="#a855f7" />
      <text x="150" y="105" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">Donor (Wallet)</text>
      <text x="150" y="125" textAnchor="middle" fill="#93c5fd" fontSize="12">SOL transfer (public)</text>

      {/* Arrow to API */}
      <line x1="260" y1="105" x2="350" y2="105" stroke="url(#g1)" strokeWidth="3" />
      <polygon points="350,105 338,100 338,110" fill="#22d3ee" />

      {/* API box */}
      <rect x="350" y="30" width="360" height="180" rx="12" fill="#0b0b14" stroke="#22d3ee" />
      <text x="530" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">/arcium/verify (API)</text>
      <text x="530" y="95" textAnchor="middle" fill="#93c5fd" fontSize="12">1) Verify tx & reference</text>
      <text x="530" y="115" textAnchor="middle" fill="#93c5fd" fontSize="12">2) Compute Tier from Amount</text>
      <text x="530" y="135" textAnchor="middle" fill="#93c5fd" fontSize="12">• Uses Arcium MPC when available</text>
      <text x="530" y="155" textAnchor="middle" fill="#93c5fd" fontSize="12">• Falls back to local computation</text>

      {/* Arrow to Arcium */}
      <line x1="470" y1="210" x2="470" y2="300" stroke="url(#g1)" strokeWidth="3" />
      <polygon points="470,300 465,288 475,288" fill="#22d3ee" />

      {/* Arcium MPC */}
      <rect x="350" y="300" width="240" height="160" rx="12" fill="#0b0b14" stroke="#a855f7" />
      <text x="470" y="340" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">Arcium MPC</text>
      <text x="470" y="365" textAnchor="middle" fill="#93c5fd" fontSize="12">Encrypted amount → Tier</text>
      <text x="470" y="385" textAnchor="middle" fill="#93c5fd" fontSize="12">Nodes compute collaboratively</text>
      <text x="470" y="405" textAnchor="middle" fill="#93c5fd" fontSize="12">No node sees raw amount</text>

      {/* Arrow from API to receipts */}
      <line x1="710" y1="120" x2="840" y2="120" stroke="url(#g1)" strokeWidth="3" />
      <polygon points="840,120 828,115 828,125" fill="#22d3ee" />

      {/* On-chain receipts */}
      <rect x="840" y="60" width="220" height="120" rx="12" fill="#0b0b14" stroke="#22d3ee" />
      <text x="950" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">
        Receipt PDA (on-chain)
      </text>
      <text x="950" y="120" textAnchor="middle" fill="#93c5fd" fontSize="12">
        tier + commitment + timestamp
      </text>
      <text x="950" y="140" textAnchor="middle" fill="#93c5fd" fontSize="12">
        (no donor address)
      </text>

      {/* Arrows from receipts to dashboards */}
      <line x1="950" y1="180" x2="950" y2="260" stroke="url(#g1)" strokeWidth="3" />
      <polygon points="950,260 945,248 955,248" fill="#22d3ee" />

      {/* Dashboards */}
      <rect x="820" y="260" width="260" height="90" rx="12" fill="#0b0b14" stroke="#a855f7" />
      <text x="950" y="300" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">
        Recipient Dashboard
      </text>
      <text x="950" y="320" textAnchor="middle" fill="#93c5fd" fontSize="12">
        Aggregates by tier (no identities, no amounts)
      </text>

      <rect x="820" y="370" width="260" height="90" rx="12" fill="#0b0b14" stroke="#a855f7" />
      <text x="950" y="410" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">
        Donor Claim Page
      </text>
      <text x="950" y="430" textAnchor="middle" fill="#93c5fd" fontSize="12">
        Present commitment → prove tier → get perks
      </text>
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-[#0b0b14] text-cyan-100">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30 blur-3xl bg-gradient-to-tr from-purple-700/40 via-cyan-600/30 to-purple-700/40" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10 relative">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300">
            How It Works
          </h1>
          <p className="mt-4 text-cyan-300/90 max-w-3xl">
            Your crypto donation powers a <span className="text-cyan-100 font-semibold">1-year FundRaisely subscription</span> for a school, club, community group, or charity—without them touching crypto rails. <span className="font-semibold text-cyan-100">Your exact donation amount stays private (tier only)</span>. The impact is verifiable on-chain.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/donate" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [SECURE DONATE]
            </a>
            <a href="https://fundraisely.co.uk/founding-partners" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
              Subscription Benefits →
            </a>
            <a href="/dashboard" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [Impact Dashboard]
            </a>
          </div>

          {/* Key privacy callout */}
          <div className="mt-6 rounded-xl border border-cyan-500/40 bg-black/50 p-4 max-w-3xl">
            <p className="text-sm text-cyan-200/90">
              <span className="font-bold text-cyan-100">Clarity:</span> Standard SOL transfers mean the <span className="underline">donor wallet is visible on-chain</span>. We deliberately do <em>not</em> write donor identities into receipts. The **amount itself** is kept private by computing only the **tier** off-chain (via Arcium MPC, with local fallback). If you want full payment privacy (hide sender <em>and</em> amount on-chain), that’s a planned Phase-2 with Elusiv.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        {/* 60-second version */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {[
            { title: '1) Choose your tier', body: 'Pick Bronze, Silver, Gold, or Platinum. SOL-based amounts with perks.' },
            { title: '2) Donate', body: 'Connect your wallet and send SOL. We attach a reference to the transfer.' },
            { title: '3) Amount → Tier (private)', body: 'We compute your tier from the amount off-chain with Arcium MPC (or local fallback). We do not store your raw amount.' },
            { title: '4) Get a receipt', body: 'You receive a Receipt ID and a link to its on-chain receipt account (no identities recorded).' },
            { title: '5) Claim perks', body: 'Present the commitment to claim benefits (votes, feature input, supporters space).' },
            { title: '6) Track impact', body: 'See pool progress and granted subscriptions on the dashboard.' },
          ].map(card => (
            <div key={card.title} className="rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#0c0c16] to-black p-5 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
              <h3 className="text-lg font-bold text-cyan-100 mb-2">{card.title}</h3>
              <p className="text-sm text-cyan-300/90">{card.body}</p>
            </div>
          ))}
        </section>

        {/* Where your donation goes */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            Where your donation goes
          </h2>
          <p className="text-sm text-cyan-300/90 max-w-3xl">
            Every donation moves us closer to funding a <span className="text-cyan-100 font-semibold">1-year subscription</span> for a school, club, community group, or charity. <span className="text-cyan-100 font-semibold">Platinum</span> (1.0 SOL+) can directly sponsor a subscription. <span className="text-cyan-100 font-semibold">Bronze/Silver/Gold</span> (0.10 / 0.25 / 0.50 SOL) pool together—when the pool reaches the target, a subscription is granted automatically.
          </p>
        </section>

        {/* Tiers (SOL-based) */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-6">
            Tiers & perks (SOL)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {TIERS.map(t => (
              <div
                key={t.name}
                className="rounded-2xl border bg-black/50 p-6"
                style={{ borderColor: `${t.color}55`, boxShadow: `0 0 18px ${t.color}25` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  <h3 className="text-lg font-bold">{t.name}</h3>
                </div>
                <div className="text-cyan-200 font-semibold mb-4">{t.sol}</div>
                <ul className="text-sm text-cyan-300/90 space-y-2">
                  {t.perks.map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-cyan-300/80">
            Early supporters can also join our{' '}
            <a className="underline hover:text-cyan-100" href="https://fundraisely.co.uk/founding-partners" target="_blank" rel="noopener noreferrer">
              Founding Partners
            </a>{' '}program for extra benefits.
          </div>
        </section>

        {/* What you'll see when you donate */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            What you’ll see when you donate
          </h2>
          <ul className="text-sm text-cyan-300/90 space-y-2">
            <li>• A single <span className="text-cyan-100 font-semibold">[SECURE DONATE]</span> button (wallet required)</li>
            <li>• Your <span className="text-cyan-100 font-semibold">Receipt ID</span> + a link to open its <em>receipt account</em> on the explorer</li>
            <li>• Buttons to <span className="text-cyan-100 font-semibold">Copy</span> the ID or <span className="text-cyan-100 font-semibold">Download</span> a JSON receipt</li>
            <li>• A <span className="text-cyan-100 font-semibold">Claim Perks</span> button that carries your Receipt ID</li>
          </ul>
          <div className="mt-5">
            <a href="/donate" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [SECURE DONATE]
            </a>
          </div>
        </section>

        {/* FAQ (non-technical) */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            FAQ (non-technical)
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: 'Do clubs need to accept crypto?',
                a: 'No. We handle crypto end-to-end. Clubs just receive a funded subscription to FundRaisely.',
              },
              {
                q: 'Is my identity hidden?',
                a: 'With standard SOL transfers, your wallet address is visible on-chain (normal for Solana). We do not write donor identities into receipts, and our dashboard shows only tier counts.',
              },
              {
                q: 'Is my amount hidden?',
                a: 'Yes—the exact amount is not revealed. We compute and publish only the donation tier (0.10 / 0.25 / 0.50 / 1.0+ SOL).',
              },
              {
                q: 'What if I lose my receipt?',
                a: 'You can copy the ID, download a JSON receipt, and we also store it locally in your browser.',
              },
              {
                q: 'How does the pool work?',
                a: 'Bronze/Silver/Gold pool together. When the pool hits the target (1 SOL per subscription), a subscription is granted. Platinum can directly sponsor a subscription.',
              },
              {
                q: 'Can I get full payment privacy?',
                a: 'Not yet. Full sender+amount privacy would be added via Elusiv in a later phase.',
              },
            ].map(item => (
              <div key={item.q} className="rounded-xl border border-purple-600/30 bg-black/40 p-6">
                <h3 className="font-bold text-cyan-100 mb-2">{item.q}</h3>
                <p className="text-sm text-cyan-300/90">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TECHNICAL: collapsible for judges */}
        <section className="mt-14">
          <details className="group rounded-xl border border-cyan-500/40 bg-black/50">
            <summary className="cursor-pointer select-none px-5 py-4 text-lg font-extrabold text-cyan-100 flex items-center justify-between">
              Technical Details (for judges)
              <span className="ml-3 text-xs font-mono text-cyan-300 group-open:hidden">[expand]</span>
              <span className="ml-3 text-xs font-mono text-cyan-300 hidden group-open:inline">[collapse]</span>
            </summary>

            <div className="px-5 pb-6 space-y-8 text-sm text-cyan-300/90">
              {/* Protocol flow */}
              <div>
                <h3 className="text-cyan-100 font-bold mb-2">Protocol Flow</h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li><strong>Transfer:</strong> Donor signs a <em>SystemProgram.transfer</em> to the recipient. We attach a <em>reference</em> key.</li>
                  <li><strong>Verify:</strong> API (<code>/arcium/verify</code>) confirms the transaction, reference, and a minimum lamports threshold.</li>
                  <li><strong>Compute Tier (Amount Privacy):</strong> Amount → Tier is computed off-chain using <strong>Arcium MPC</strong> (active) with a graceful local fallback. The raw amount is not written anywhere public.</li>
                  <li><strong>Commit:</strong> API derives a <strong>commitment</strong> and writes a <strong>Receipt PDA</strong> on-chain with {`{ tier, commitment, timestamp }`} only.</li>
                  <li><strong>Use:</strong> Donor receives the commitment, can open the receipt PDA on explorer, and uses the commitment to claim tier-based perks.</li>
                </ol>
              </div>

              {/* Diagram */}
              <div>
                <h3 className="text-cyan-100 font-bold mb-3">Architecture Diagram</h3>
                <FlowDiagramSVG />
              </div>

              {/* What is public vs private */}
              <div>
                <h3 className="text-cyan-100 font-bold mb-2">Privacy Model — What’s Public vs Private</h3>
                <div className="rounded-lg bg-black/40 border border-purple-600/30 p-4 text-xs md:text-sm">
                  <ul className="space-y-1">
                    <li>• <strong>Public (on-chain):</strong> the recipient transfer (thus donor wallet is observable), and a receipt account with <em>tier, commitment, timestamp</em>.</li>
                    <li>• <strong>Private (not revealed):</strong> the <em>exact amount</em> (published only as a tier), and any binding link between receipt and donor identity.</li>
                    <li>• <strong>Off-chain:</strong> Arcium MPC computes tier from the (encrypted) amount; if MPC is temporarily unavailable, a local compute fallback is used with the same data minimisation.</li>
                  </ul>
                </div>
              </div>

              {/* Receipt account structure */}
              <div>
                <h3 className="text-cyan-100 font-bold mb-2">Receipt Account Structure (49 bytes)</h3>
                <div className="rounded-lg bg-black/40 border border-purple-600/30 p-4">
                  <ul className="space-y-1">
                    <li>• <code>0..7</code>: Anchor discriminator (8)</li>
                    <li>• <code>8</code>: Tier (u8: 0=Bronze, 1=Silver, 2=Gold, 3=Platinum)</li>
                    <li>• <code>9..40</code>: Commitment (32 bytes, hex-encoded in UI)</li>
                    <li>• <code>41..48</code>: Timestamp (LE, seconds)</li>
                  </ul>
                  <p className="mt-2 text-xs text-cyan-400/80">No donor address or amount is stored in the receipt PDA.</p>
                </div>
              </div>

              {/* Explorer & Dev Notes */}
              <div>
                <h3 className="text-cyan-100 font-bold mb-2">Explorer & Dev Notes</h3>
                <ul className="space-y-2">
                  <li>• Donor UI links both the transaction (tx signature) and the <strong>Receipt PDA</strong>.</li>
                  <li>• Recipient Dashboard enumerates receipts via <code>getProgramAccounts</code> (<code>dataSize=49</code>) and aggregates by tier.</li>
                  <li>• Env: <code>VITE_SOLANA_CLUSTER</code> (default devnet), <code>VITE_TIPJAR_PROGRAM_ID</code>, <code>VITE_DONATION_SOL_ADDRESS</code>.</li>
                  <li>• Future: optional Elusiv integration would hide sender <em>and</em> amount at the payment layer for full privacy.</li>
                </ul>
              </div>
            </div>
          </details>
        </section>

        {/* Final CTA */}
        <section className="mt-10 flex flex-wrap gap-3">
          <a href="/donate" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
            [SECURE DONATE]
          </a>
          <a href="https://fundraisely.co.uk/founding-partners" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
            Subscription Benefits →
          </a>
          <a href="/dashboard" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
            [Impact Dashboard]
          </a>
        </section>
      </div>
    </div>
  );
}

