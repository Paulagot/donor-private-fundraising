import * as React from 'react';

type TierInfo = {
  tier: 0 | 1 | 2 | 3;
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  color: string;     // accent (button/progress)
  tint: string;      // subtle background tint
  votes: number;     // pooled votes for tiers 0–2
  description: string;
};

export const TIER_BENEFITS: TierInfo[] = [
  {
    tier: 0,
    name: 'Bronze',
    color: '#64748b',           // slate-500-ish
    tint: 'rgba(100,116,139,0.08)',
    votes: 1,
    description:
      '1 vote toward a pooled subscription for the top-voted charity (tiers 0–2 only).',
  },
  {
    tier: 1,
    name: 'Silver',
    color: '#4f46e5',           // indigo-600
    tint: 'rgba(79,70,229,0.09)',
    votes: 2,
    description:
      '2 pooled votes for charity + 1 feature vote to guide our roadmap.',
  },
  {
    tier: 2,
    name: 'Gold',
    color: '#8b5cf6',           // violet-500
    tint: 'rgba(139,92,246,0.10)',
    votes: 3,
    description:
      '3 pooled votes for charity + 2 feature votes — maximum influence in pooled tiers.',
  },
  {
    tier: 3,
    name: 'Platinum',
    color: '#f59e0b',           // amber-500
    tint: 'rgba(245,158,11,0.10)',
    votes: 0,
    description:
      'Directly select a charity to receive a subscription (not counted in the pooled fund).',
  },
];

// Mock 20 charities (replace with API later)
const MOCK_CHARITIES = [
  'Hope for All',
  'Green Streets Initiative',
  'Young Minds Ireland',
  'Tech4Schools',
  'Community Food Bank',
  'Shelter & Warmth',
  'Parkside Animal Rescue',
  'Books for Every Kid',
  'Clean Coasts Project',
  'Girls in Sport',
  'Senior Support Network',
  'Neighborhood Gardeners',
  'Music for Inclusion',
  'STEM for Everyone',
  'Arts Access Collective',
  'Kickstart Sports Club',
  'Health on Wheels',
  'Safe Nights Shelter',
  'Coastal Cleanup Crew',
  'Bright Futures Trust',
];

type Props = {
  tier: number;           // 0..3
  receiptPda: string;
  walletAddress: string;

  // OPTIONAL: live pool stats (tiers 0–2 only; platinum excluded)
  pool?: {
    amount: number;            // e.g. 620
    subscriptionCost: number;  // e.g. 1000
    currencySymbol?: string;   // default '€'
    lastUpdatedISO?: string;   // optional "Updated…" text
  };

  // OPTIONAL: wire your backend later without touching UI
  onSubmitVotes?: (payload: { receiptPda: string; wallet: string; charities: string[]; featureVotes: number }) => Promise<void>;
  onGrantPlatinum?: (payload: { receiptPda: string; wallet: string; charity: string; note?: string }) => Promise<void>;
};

type ClaimState =
  | { status: 'idle' }
  | { status: 'voted'; votes: string[]; featureVotes?: number }
  | { status: 'granted'; charity: string };

// --- Leaderboard types/helpers ---
type LeaderboardEntry = { name: string; votes: number };

function seededHash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildSeededLeaderboard(seedStr: string): LeaderboardEntry[] {
  const seed = seededHash(seedStr || 'seed');
  // Deterministic pseudo-random counts between 10 and 120
  return MOCK_CHARITIES.map((name, i) => {
    const r = Math.abs(Math.sin(seed + i) * 1000);
    const votes = 10 + Math.floor((r % 111)); // 10..120
    return { name, votes };
  });
}

export default function FundRaiselyBenefitClaim({
  tier,
  receiptPda,
  walletAddress,
  pool,
  onSubmitVotes,
  onGrantPlatinum,
}: Props) {
  const tierInfo = TIER_BENEFITS.find((t) => t.tier === (tier as 0 | 1 | 2 | 3));

  // --- Pooled fund state (non-breaking: falls back to localStorage/mock) ---
  const [pooledAmount, setPooledAmount] = React.useState<number>(() => {
    if (pool?.amount != null) return pool.amount;
    const stored = localStorage.getItem('fr_pool_amount');
    return stored ? Number(stored) || 620 : 620; // mock €620
  });
  const subscriptionCost = React.useMemo<number>(() => {
    if (pool?.subscriptionCost != null) return pool.subscriptionCost;
    const stored = localStorage.getItem('fr_pool_target');
    return stored ? Number(stored) || 1000 : 1000; // mock €1,000 target
  }, [pool?.subscriptionCost]);
  const currencySymbol = pool?.currencySymbol ?? '€';

  // --- UI + claim state ---
  const [selectedCharities, setSelectedCharities] = React.useState<string[]>([]);
  const [platinumSelection, setPlatinumSelection] = React.useState<string>(MOCK_CHARITIES[0]);
  const [platinumNote, setPlatinumNote] = React.useState<string>('');
  const [claiming, setClaiming] = React.useState(false);
  const [featureVotes, setFeatureVotes] = React.useState<number>(0); // Silver/Gold only
  const [error, setError] = React.useState<string>('');
  const [claimed, setClaimed] = React.useState<ClaimState>({ status: 'idle' });

  // localStorage keys to keep repeated claims in check (client-side guard only)
  const voteKey = React.useMemo(() => `fr_votes_${receiptPda}`, [receiptPda]);
  const featKey = React.useMemo(() => `fr_feat_${receiptPda}`, [receiptPda]);
  const grantKey = React.useMemo(() => `fr_grant_${receiptPda}`, [receiptPda]);

  // --- Leaderboard state (stable per receipt) ---
  const lbKey = React.useMemo(() => `fr_lb_${receiptPda}`, [receiptPda]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>(() => {
    const fromLS = localStorage.getItem(lbKey);
    if (fromLS) {
      try { return JSON.parse(fromLS) as LeaderboardEntry[]; } catch {}
    }
    return buildSeededLeaderboard(receiptPda);
  });
  React.useEffect(() => {
    try { localStorage.setItem(lbKey, JSON.stringify(leaderboard)); } catch {}
  }, [lbKey, leaderboard]);

  React.useEffect(() => {
    // load prior local claim state
    const priorVotes = localStorage.getItem(voteKey);
    const priorFeat = localStorage.getItem(featKey);
    const priorGrant = localStorage.getItem(grantKey);
    if (priorVotes) {
      try {
        const parsed = JSON.parse(priorVotes) as string[];
        setClaimed({ status: 'voted', votes: parsed, featureVotes: Number(priorFeat || 0) });
        setSelectedCharities(parsed);
        setFeatureVotes(Number(priorFeat || 0));
      } catch {}
    }
    if (priorGrant) {
      setClaimed({ status: 'granted', charity: priorGrant });
      setPlatinumSelection(priorGrant);
    }
  }, [voteKey, featKey, grantKey]);

  if (!tierInfo) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <p className="text-red-300 text-sm">Unknown tier. Please contact support.</p>
      </div>
    );
  }

  const isPooledTier = tierInfo.tier <= 2;
  const canVoteCount = tierInfo.votes;

  const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const progress = clamp(pooledAmount / Math.max(1, subscriptionCost));
  const percent = Math.round(progress * 100);

  const formatMoney = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // --- interactions ---
  const toggleCharitySelection = (name: string) => {
    if (!isPooledTier) return;
    if (claimed.status !== 'idle') return;
    setSelectedCharities((prev) => {
      const exists = prev.includes(name);
      if (exists) return prev.filter((c) => c !== name);
      if (prev.length >= canVoteCount) return prev; // cap at votes allowed
      return [...prev, name];
    });
  };

  const handleCastVotes = async () => {
    setError('');
    if (!isPooledTier) return;
    if (selectedCharities.length !== canVoteCount) {
      setError(
        `Please select exactly ${canVoteCount} ${canVoteCount === 1 ? 'charity' : 'charities'} before submitting.`
      );
      return;
    }
    try {
      setClaiming(true);

      // If parent provided a backend hook, use it; else mock.
      if (onSubmitVotes) {
        await onSubmitVotes({
          receiptPda,
          wallet: walletAddress,
          charities: selectedCharities,
          featureVotes,
        });
      } else {
        // MOCK: simulate network & bump pooled amount to give feedback
        await new Promise((r) => setTimeout(r, 700));
        const bump = Math.min(80, 20 * canVoteCount); // small illustrative bump
        setPooledAmount((p) => Math.min(subscriptionCost, p + bump));
      }

      localStorage.setItem(voteKey, JSON.stringify(selectedCharities));
      localStorage.setItem(featKey, String(featureVotes));
      setClaimed({ status: 'voted', votes: selectedCharities, featureVotes });

      // Reflect your votes in the mock leaderboard immediately
      setLeaderboard((rows) =>
        rows.map((r) =>
          selectedCharities.includes(r.name) ? { ...r, votes: r.votes + Math.max(3, canVoteCount * 2) } : r
        )
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit votes.');
    } finally {
      setClaiming(false);
    }
  };

  const handleGrantPlatinum = async () => {
    setError('');
    if (tierInfo.tier !== 3) return;
    if (!platinumSelection) {
      setError('Please select a charity to grant the subscription to.');
      return;
    }
    try {
      setClaiming(true);

      if (onGrantPlatinum) {
        await onGrantPlatinum({
          receiptPda,
          wallet: walletAddress,
          charity: platinumSelection,
          note: platinumNote || undefined,
        });
      } else {
        // MOCK: simulate network
        await new Promise((r) => setTimeout(r, 700));
      }

      localStorage.setItem(grantKey, platinumSelection);
      setClaimed({ status: 'granted', charity: platinumSelection });

      // Optional: tag platinum pick in leaderboard subtly
      setLeaderboard((rows) =>
        rows.map((r) => (r.name === platinumSelection ? { ...r, votes: r.votes + 2 } : r))
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to grant subscription.');
    } finally {
      setClaiming(false);
    }
  };

  // --- UI subcomponents ---
  const Header = () => (
    <div
      className="rounded-lg p-4 border mb-4"
      style={{ borderColor: tierInfo.color + '66', background: tierInfo.tint }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎉</span>
        <div>
          <h3 className="font-bold text-xl" style={{ color: tierInfo.color }}>
            {tierInfo.name} Tier — FundRaisely Benefits
          </h3>
          <p className="text-sm text-gray-300">{tierInfo.description}</p>
        </div>
      </div>
    </div>
  );

  const PooledFundCard = () => (
    <div className="mb-6 rounded-lg border bg-gray-900/60 border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-300">Pooled Subscriptions Fund</p>
        <p className="text-sm text-gray-400">
          {formatMoney(pooledAmount)} / {formatMoney(subscriptionCost)} ({percent}%)
        </p>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-3"
          style={{ width: `${percent}%`, backgroundColor: tierInfo.color, transition: 'width .4s ease' }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Top-voted charity receives a subscription once fully funded.</span>
        <span className="opacity-80">Platinum excluded</span>
      </div>
      {pool?.lastUpdatedISO && (
        <div className="mt-1 text-[11px] text-gray-500">
          Updated {new Date(pool.lastUpdatedISO).toLocaleString()}
        </div>
      )}
    </div>
  );

  const Leaderboard = () => (
    <div className="mb-6 rounded-lg border bg-gray-900/60 border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-300">Top Charities (Mock Leaderboard)</p>
        <p className="text-xs text-gray-400">Community signal — not final</p>
      </div>

      {leaderboard
        .slice()
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 6)
        .map((row, idx) => {
          const total = leaderboard.reduce((s, e) => s + e.votes, 0) || 1;
          const pct = Math.round((row.votes / total) * 100);
          const youVoted = selectedCharities.includes(row.name) || (claimed.status === 'voted' && claimed.votes.includes(row.name));
          return (
            <div key={row.name} className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{idx + 1}.</span>
                  <span className="text-gray-200">{row.name}</span>
                  {youVoted && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 border border-white/20 text-gray-100">
                      you voted
                    </span>
                  )}
                </div>
                <span className="text-gray-400">{row.votes} pts · {pct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-2"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: tierInfo.color,
                    transition: 'width .3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      <div className="mt-2 text-[11px] text-gray-500">
        Votes from Bronze/Silver/Gold pool; Platinum grants are separate.
      </div>
    </div>
  );

  return (
    <div className="bg-white/70 dark:bg-gray-900/80 border border-indigo-200/60 dark:border-gray-800 rounded-xl p-6">
      <Header />

      {/* On-chain proof + wallet */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Receipt PDA (On-Chain Proof)</p>
          <a
            href={`https://explorer.solana.com/address/${receiptPda}?cluster=devnet`}
            className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all"
            target="_blank"
            rel="noreferrer"
          >
            {receiptPda}
          </a>
        </div>
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">Verified Wallet</p>
          <p className="font-mono text-xs text-gray-200 break-all">{walletAddress}</p>
        </div>
      </div>

      {/* Pool + Leaderboard */}
      <PooledFundCard />
      <Leaderboard />

      {/* Action Panel */}
      {isPooledTier ? (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="font-semibold mb-2">Cast Your Votes</h4>
          <p className="text-sm text-gray-400 mb-3">
            Select <strong>{canVoteCount}</strong> {canVoteCount === 1 ? 'charity' : 'charities'}. When the pool reaches{' '}
            {formatMoney(subscriptionCost)}, the <em>top-voted</em> charity is awarded a subscription.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {MOCK_CHARITIES.map((c) => {
              const selected = selectedCharities.includes(c);
              const disabled = claimed.status !== 'idle';
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCharitySelection(c)}
                  disabled={disabled}
                  className={[
                    'text-left px-3 py-2 rounded border transition',
                    selected
                      ? 'border-white/70 bg-white/10'
                      : 'border-gray-700 bg-gray-900 hover:bg-gray-900/70',
                    disabled ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <span className="text-sm">{c}</span>
                  {selected && <span className="ml-2 text-xs opacity-70">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Feature votes (Silver/Gold) — mocked counter */}
          {(tierInfo.tier === 1 || tierInfo.tier === 2) && claimed.status === 'idle' && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">
                Feature votes available: <strong>{tierInfo.tier === 1 ? 1 : 2}</strong>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded bg-gray-900 border border-gray-700 hover:bg-gray-900/70 text-sm"
                  onClick={() => setFeatureVotes((x) => Math.max(0, x - 1))}
                >
                  −
                </button>
                <span className="text-sm w-8 text-center">{featureVotes}</span>
                <button
                  className="px-3 py-2 rounded bg-gray-900 border border-gray-700 hover:bg-gray-900/70 text-sm"
                  onClick={() => setFeatureVotes((x) => Math.min(x + 1, tierInfo.tier === 1 ? 1 : 2))}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Status / Actions */}
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

          {claimed.status === 'idle' ? (
            <button
              className="mt-4 w-full py-3 rounded font-semibold transition"
              style={{ backgroundColor: tierInfo.color }}
              onClick={handleCastVotes}
              disabled={claiming}
            >
              {claiming ? 'Submitting votes…' : `Cast ${canVoteCount} Vote${canVoteCount === 1 ? '' : 's'}`}
            </button>
          ) : (
            <div className="mt-4 p-3 rounded border border-green-700 bg-green-900/20 text-green-200 text-sm">
              ✅ Votes recorded for: {Array.isArray(claimed.votes) ? claimed.votes.join(', ') : ''}
              {typeof claimed.featureVotes === 'number' && claimed.featureVotes > 0 && (
                <span className="block opacity-80">+ Feature votes noted: {claimed.featureVotes}</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="font-semibold mb-2">Select a Charity (Platinum)</h4>
          <p className="text-sm text-gray-400 mb-3">
            Platinum donations fund a full subscription for your selected charity. This is fulfilled separately and{' '}
            <strong>not</strong> counted in the pooled fund above.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Charity</label>
              <select
                value={platinumSelection}
                onChange={(e) => setPlatinumSelection(e.target.value)}
                disabled={claimed.status !== 'idle'}
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
              >
                {MOCK_CHARITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
              <input
                value={platinumNote}
                onChange={(e) => setPlatinumNote(e.target.value)}
                placeholder="e.g., local branch / contact"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none"
                disabled={claimed.status !== 'idle'}
              />
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

          {claimed.status === 'idle' ? (
            <button
              className="mt-4 w-full py-3 rounded font-semibold transition"
              style={{ backgroundColor: tierInfo.color }}
              onClick={handleGrantPlatinum}
              disabled={claiming}
            >
              {claiming ? 'Granting…' : 'Grant Subscription to Selected Charity'}
            </button>
          ) : (
            <div className="mt-4 p-3 rounded border border-green-700 bg-green-900/20 text-green-200 text-sm">
              ✅ Subscription earmarked for: {claimed.charity}
            </div>
          )}
        </div>
      )}

      {/* After-claim next steps (mocked) */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded p-4 text-sm text-blue-100">
        <p className="font-semibold mb-1">What happens next?</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>We aggregate donations from Bronze/Silver/Gold tiers to fund subscriptions.</li>
          <li>When fully funded, the top-voted charity receives a subscription.</li>
          <li>Platinum selections are fulfilled separately (direct grants), not counted in the pool.</li>
          <li>You’ll receive updates and a verifiable receipt when we fulfill.</li>
        </ul>
      </div>
    </div>
  );
}


