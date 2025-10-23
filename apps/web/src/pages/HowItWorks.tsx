// src/pages/HowItWorks.tsx
import React from 'react';

const TIERS = [
  { name: 'Bronze',   sol: '0.10 SOL',  color: '#94a3b8', perks: ['1 pooled vote toward the next subscription grant'] },
  { name: 'Silver',   sol: '0.25 SOL',  color: '#3b82f6', perks: ['2 pooled votes', 'Access to Supporters Corner'] },
  { name: 'Gold',     sol: '0.50 SOL',  color: '#8b5cf6', perks: ['3 pooled votes', '2 roadmap (feature) votes'] },
  { name: 'Platinum', sol: '1.00 SOL+', color: '#f59e0b', perks: ['Directly select a charity to receive a subscription (once funded)'] },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-black to-[#0b0b14] text-cyan-100">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30 blur-3xl bg-gradient-to-tr from-purple-700/40 via-cyan-600/30 to-purple-700/40" />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10 relative">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300">
            Privacy-Protecting Fundraising Portal
          </h1>
          <p className="mt-4 text-cyan-300/90 max-w-3xl">
            Give with confidence. Unlock perks and prove impact without broadcasting who you are or how much you gave.
            Your exact donation amount stays private (we only reveal your <span className="font-semibold text-cyan-100">tier</span> for benefits). Impact remains verifiable.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/donate/sol" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [DONATE NOW (SOL Devnet)]
            </a>
           <a href="/claim" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
              Claim Perks →
            </a>
            <a href="/dashboard" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [Impact Dashboard]
            </a>
          </div>

          {/* Key privacy callout */}
          <div className="mt-6 rounded-xl border border-cyan-500/40 bg-black/50 p-4 max-w-3xl">
            <p className="text-sm text-cyan-200/90">
              <span className="font-bold text-cyan-100">Privacy first:</span> We never publish donor identities in receipts and we don’t reveal exact amounts.
              Your perk eligibility is proven by a <span className="font-semibold text-cyan-100">tier receipt</span> that you control.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24">
        {/* Problem */}
        <section className="mt-2">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            The problem
          </h2>
          <p className="text-sm text-cyan-300/90 max-w-3xl">
            On-chain donations are transparent by default: wallet, time, and amount are publicly visible forever. That can deter people who prefer to give quietly
            and makes it awkward to run tiered perks without doxxing donors. We want the operability of tiered benefits and verifiable impact, without forcing donors to overshare.
          </p>
        </section>

        {/* Our solution */}
        <section className="mt-10">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            Our solution
          </h2>
          <p className="text-sm text-cyan-300/90 max-w-3xl">
            A streamlined donation flow that issues a <span className="font-semibold text-cyan-100">privacy-preserving receipt</span> proving your <em>tier</em> (Bronze/Silver/Gold/Platinum) —
            enough to unlock benefits, without revealing your exact amount or tying the receipt to your identity in public UIs. Organisers get aggregate insights in the
            <span className="font-semibold text-cyan-100"> Impact Dashboard</span>; donors redeem benefits via a simple <span className="font-semibold text-cyan-100">Claims Portal</span>.
          </p>
        </section>

        {/* How it works (updated) */}
        <section className="mt-10">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-6">
            How it works
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                title: '1) Donate',
                body: 'Enter your donation amount (4 decimal places) and pay the recipient wallet (QR / wallet flow). The page captures the transaction signature for private verification.',
              },
              {
                title: '2) Private verification',
                body: 'We privately check that your payment met a configured threshold. Only the highest tier you qualify for is returned — not your exact amount.',
              },
              {
                title: '3) Receive a tier receipt',
                body: 'You get a portable receipt (ID/QR). It proves your tier without exposing your identity or the exact amount in public UIs.',
              },
              {
                title: '4) Claim your perks',
                body: 'Open the Claims Portal, paste or scan your receipt, and redeem benefits (e.g., pooled votes, supporters space, roadmap votes).',
              },
              {
                title: '5) Track the impact',
                body: 'The Impact Dashboard shows tier counts, recent verified donations, redemptions, and pool progress — no donor identities, no exact amounts.',
              },
              {
                title: '6) Pooled outcomes',
                body: 'Bronze/Silver/Gold pool together. When the pool reaches a target (e.g., 1 SOL per subscription), a subscription grant is triggered. Platinum can directly sponsor a subscription.',
              },
            ].map(card => (
              <div
                key={card.title}
                className="rounded-xl border border-purple-500/40 bg-gradient-to-b from-[#0c0c16] to-black p-5 shadow-[0_0_25px_rgba(168,85,247,0.15)]"
              >
                <h3 className="text-lg font-bold text-cyan-100 mb-2">{card.title}</h3>
                <p className="text-sm text-cyan-300/90">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why this matters */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            Why this matters
          </h2>
          <ul className="text-sm text-cyan-300/90 space-y-2 max-w-3xl">
            <li>• <span className="text-cyan-100 font-semibold">Respect for donors:</span> give quietly, still get benefits.</li>
            <li>• <span className="text-cyan-100 font-semibold">Operational simplicity:</span> tiers, claims, and dashboards without doxxing wallets or amounts.</li>
            <li>• <span className="text-cyan-100 font-semibold">Verifiable impact:</span> pools, grants, and redemptions are auditable at the aggregate level.</li>
            <li>• <span className="text-cyan-100 font-semibold">Frictionless UX:</span> one donation field, clear receipts, simple claims.</li>
          </ul>
        </section>

        {/* What's included */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            What’s included
          </h2>
          <ul className="text-sm text-cyan-300/90 space-y-2 max-w-3xl">
            <li>• Private donation flow with tier receipts (portable ID/QR).</li>
            <li>• Claims Portal for donors to unlock benefits using their receipt.</li>
            <li>• Impact Dashboard for organisers (tier counts, recent verified donations, claims, pool snapshot).</li>
            <li>• Exports for reporting (CSV/PDF of commitment, tier, timestamps, perk type).</li>
          </ul>
        </section>

        {/* Roadmap */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            Roadmap
          </h2>
          <ul className="text-sm text-cyan-300/90 space-y-2 max-w-3xl">
            <li>• <span className="text-cyan-100 font-semibold">Open source:</span> we’ll keep the core privacy-protecting portal open for the community.</li>
            <li>• <span className="text-cyan-100 font-semibold">Embeddable widget:</span> a configurable drop-in for clubs, community groups, and charities to use on their own sites.</li>
            <li>• Full sender-privacy layers (relayers/mixers) once recipient KYC/compliance paths are finalised.</li>
            <li>• Cross-chain + fiat on-ramps; reusable donor badges; granular receipt policies (expiry, revocation, multi-threshold perks).</li>
          </ul>
        </section>

               {/* Sample campaign: how we’re using this with FundRaisely */}
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-3">
            Sample campaign: powering subscriptions with FundRaisely
          </h2>
          <p className="text-sm text-cyan-300/90 max-w-3xl">
            We’re running a demo campaign where every <span className="text-cyan-100 font-semibold">1 SOL</span> funds a
            <span className="text-cyan-100 font-semibold"> 1-year FundRaisely subscription</span> for a school, club, community group, or charity.
            <span className="block mt-2" />
            <span className="text-cyan-100 font-semibold">Bronze/Silver/Gold</span> donations pool together. When the pool reaches 1 SOL, the next subscription is granted and logged in the Impact Dashboard.
            <span className="text-cyan-100 font-semibold"> Platinum</span> (1.0 SOL+) can directly sponsor a subscription and nominate a recipient.
          </p>
          <ul className="text-sm text-cyan-300/90 space-y-2 mt-4">
            <li>• Donors keep privacy; only tiers appear in public UI.</li>
            <li>• Organisers see tier counts, pool progress, and redemption stats in the dashboard.</li>
            <li>• Claims Portal issues perks like pooled votes, supporters space access, and roadmap votes.</li>
          </ul>

           {/* Tiers (SOL-based) */}
        <section className="mt-12">
          <h2 className="text-1xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-cyan-200 to-purple-300 mb-6">
            Tiers & perks in sample campaign
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
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/donate/sol" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [DONATE NOW (SOL Devnet)]
            </a>
              <a href="https://fundraisely.co.uk/founding-partners" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
            Subscription Benefits →
          </a>
            <a href="/dashboard" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
              [Impact Dashboard]
            </a>
            <a href="/claim" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
              Claim Perks →
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
                a: 'No. We handle crypto end-to-end. Clubs simply receive a funded subscription to FundRaisely.',
              },
              {
                q: 'Is my identity hidden?',
                a: 'We do not write donor identities into receipts, and the dashboard shows only tier counts.',
              },
              {
                q: 'Is my exact amount hidden?',
                a: 'Yes. We reveal only the tier you qualify for, not the exact amount.',
              },
              {
                q: 'What if I lose my receipt?',
                a: 'You can copy the ID, download a JSON receipt, and we also store it locally in your browser.',
              },
              {
                q: 'How does the pool work?',
                a: 'Bronze/Silver/Gold pool together toward 1 SOL per subscription. Platinum can directly sponsor one.',
              },
              {
                q: 'Can I get full sender privacy?',
                a: 'That’s on the roadmap alongside compliance-ready options. For now, public UIs hide donor identity and exact amount.',
              },
            ].map(item => (
              <div key={item.q} className="rounded-xl border border-purple-600/30 bg-black/40 p-6">
                <h3 className="font-bold text-cyan-100 mb-2">{item.q}</h3>
                <p className="text-sm text-cyan-300/90">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-10 flex flex-wrap gap-3">
          <a href="/donate/sol" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
           [DONATE NOW (SOL Devnet)]
          </a>
        
          <a href="/dashboard" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-purple-500 bg-black hover:bg-purple-900/30 transition shadow-[0_0_25px_rgba(168,85,247,0.25)] font-semibold">
            [Impact Dashboard]
          </a>
            <a href="/claim" className="inline-flex items-center px-5 py-3 rounded-lg border-2 border-cyan-400/60 hover:border-cyan-300/90 bg-black/40 hover:bg-black/60 transition">
              Claim Perks →
            </a>
        </section>
      </div>
    </div>
  );
}


