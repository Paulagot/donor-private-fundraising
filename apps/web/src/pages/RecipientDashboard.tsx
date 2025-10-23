import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ---- Safe env shim (prevents TS “import.meta.env” errors) ----
const env = (import.meta as any)?.env || {};

// --- Config (env overrides with sensible defaults) ---
const PROGRAM_ID = new PublicKey(
  env.VITE_TIPJAR_PROGRAM_ID || '7YaPMHgDfdBxc3jBXKUDGk87yZ3VjAaA57FoiRy5VG7q'
);
const RPC_URL: string = env.VITE_SOLANA_RPC || 'https://api.devnet.solana.com';
const RECIPIENT_WALLET = new PublicKey(
  env.VITE_DONATION_SOL_ADDRESS || '7koYv1dqqHWh4PQ5bVh8CyLBTxqAHeARPiuazzF2FhCY'
);

const TIER_COLORS = ['#94a3b8', '#3b82f6', '#8b5cf6', '#f59e0b'];
const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum'];

// Mock list (used for leaderboard + fillers)
const MOCK_CHARITIES = [
  'Hope for All','Green Streets Initiative','Young Minds Ireland','Tech4Schools','Community Food Bank',
  'Shelter & Warmth','Parkside Animal Rescue','Books for Every Kid','Clean Coasts Project','Girls in Sport',
  'Senior Support Network','Neighborhood Gardeners','Music for Inclusion','STEM for Everyone',
  'Arts Access Collective','Kickstart Sports Club','Health on Wheels','Safe Nights Shelter',
  'Coastal Cleanup Crew','Bright Futures Trust',
];

// ---------- Types ----------
interface Receipt {
  pda: string;
  tier: number;
  timestamp: number;
  commitment: string;
  date: string;
}
interface Stats {
  totalDonations: number;
  tierBreakdown: number[]; // length 4
}
interface ChartData {
  name: string;
  count: number;
  tier: number;
}
type LeaderboardEntry = { name: string; votes: number };

// ---------- Helpers ----------
const formatSOL = (n: number) => `${n.toFixed(2)} SOL`;
function seededHash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededLeaderboard(seedStr: string): LeaderboardEntry[] {
  const seed = seededHash(seedStr || 'seed');
  return MOCK_CHARITIES.map((name, i) => {
    const r = Math.abs(Math.sin(seed + i) * 1000);
    const votes = 10 + Math.floor(r % 111); // 10..120
    return { name, votes };
  });
}
function safeLocalStorageKeys(prefix: string) {
  try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); }
  catch { return []; }
}

// ---------- Component ----------
export default function RecipientDashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalDonations: 0, tierBreakdown: [0, 0, 0, 0] });
  const [walletSol, setWalletSol] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ----- Fetch on-chain receipts + wallet balance -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connection = new Connection(RPC_URL, 'confirmed');

      // Receipts: 49 bytes (8 discriminator + 1 tier + 32 commitment + 8 ts)
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: 49 }],
      });

      const parsed: Receipt[] = accounts.map(({ pubkey, account }) => {
        const tier = account.data[8];
        const timestamp = Number(account.data.readBigInt64LE(41));
        const commitment = account.data.slice(9, 41).toString('hex');
        return {
          pda: pubkey.toBase58(),
          tier,
          timestamp,
          commitment,
          date: new Date(timestamp * 1000).toLocaleDateString(),
        };
      });

      parsed.sort((a, b) => b.timestamp - a.timestamp);

      const tierBreakdown = [0, 0, 0, 0];
      parsed.forEach(r => { if (r.tier >= 0 && r.tier <= 3) tierBreakdown[r.tier]++; });

      setReceipts(parsed);
      setStats({ totalDonations: parsed.length, tierBreakdown });

      // Live wallet balance
      const lamports = await connection.getBalance(RECIPIENT_WALLET, 'confirmed');
      setWalletSol(lamports / LAMPORTS_PER_SOL);

      setLastUpdated(new Date());
    } catch (e: any) {
      console.error('Error fetching receipts/balance:', e);
      setError(e?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ----- Voting snapshot (mock/aggregate) -----
  const votingSnapshot = useMemo<LeaderboardEntry[]>(() => {
    const lbKeys = safeLocalStorageKeys('fr_lb_');
    if (lbKeys.length === 0) return seededLeaderboard('dashboard');
    const aggregate = new Map<string, number>();
    lbKeys.forEach(k => {
      try {
        const rows = JSON.parse(localStorage.getItem(k) || '[]') as LeaderboardEntry[];
        rows.forEach(r => aggregate.set(r.name, (aggregate.get(r.name) || 0) + (r.votes || 0)));
      } catch {}
    });
    const merged = MOCK_CHARITIES.map(name => ({ name, votes: aggregate.get(name) || 0 }));
    const sum = merged.reduce((s, r) => s + r.votes, 0);
    return sum > 0 ? merged : seededLeaderboard('dashboard');
  }, []);

  // ---------- Pool math (1 SOL = 1 subscription) ----------
  const platinumCount = stats.tierBreakdown[3] || 0;
  const pooledSOLRaw = Math.max(0, walletSol - platinumCount * 1);
  const pooledFundedCount = Math.floor(pooledSOLRaw);
  const poolRemainderSOL = pooledSOLRaw - pooledFundedCount; // 0.. <1
  const poolPct = Math.round(poolRemainderSOL * 100);

  // ---------- Charities Granted ----------
  const platinumGrants = useMemo(() => {
    const keys = safeLocalStorageKeys('fr_grant_');
    const items: string[] = [];
    keys.forEach(k => {
      try { const val = localStorage.getItem(k); if (val) items.push(val); } catch {}
    });
    return Array.from(new Set(items));
  }, []);

  const [poolGrants, setPoolGrants] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('fr_pool_grants');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      if (poolGrants.length >= pooledFundedCount) return;
      const already = new Set([...poolGrants, ...platinumGrants]);
      const sorted = votingSnapshot.slice().sort((a, b) => b.votes - a.votes).map(r => r.name);

      const next: string[] = [];
      for (const name of sorted) {
        if (!already.has(name)) { next.push(name); already.add(name); }
        if (poolGrants.length + next.length >= pooledFundedCount) break;
      }
      if (poolGrants.length + next.length < pooledFundedCount) {
        for (const name of MOCK_CHARITIES) {
          if (!already.has(name)) { next.push(name); already.add(name); }
          if (poolGrants.length + next.length >= pooledFundedCount) break;
        }
      }
      if (next.length > 0) {
        const updated = [...poolGrants, ...next];
        setPoolGrants(updated);
        localStorage.setItem('fr_pool_grants', JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to update pool grants', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pooledFundedCount, votingSnapshot, platinumGrants.length]);

  const allGranted = useMemo(() => ({ pool: poolGrants, platinum: platinumGrants }), [poolGrants, platinumGrants]);

  // ---------- Charts ----------
  const tierChartData: ChartData[] = [
    { name: 'Bronze (0.1–0.25)', count: stats.tierBreakdown[0], tier: 0 },
    { name: 'Silver (0.25–0.5)', count: stats.tierBreakdown[1], tier: 1 },
    { name: 'Gold (0.5–1.0)', count: stats.tierBreakdown[2], tier: 2 },
    { name: 'Platinum (1.0+)', count: stats.tierBreakdown[3], tier: 3 },
  ];
  const pieData = tierChartData.filter(d => d.count > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-indigo-200">Loading receipts & wallet balance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-black dark:via-black dark:to-black text-gray-900 dark:text-white">
      {/* Brand header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 blur-2xl bg-gradient-to-tr from-indigo-300 via-purple-300 to-cyan-300 dark:from-purple-900/40 dark:via-cyan-900/30 dark:to-indigo-900/30" />
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-3 relative">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-indigo-700 via-purple-600 to-cyan-500 text-transparent bg-clip-text">
              FundRaisely • Impact Dashboard
            </span>
          </h1>
          <p className="mt-2 text-gray-700/90 dark:text-gray-300">
            Privacy-preserving analytics & live snapshots (wallet-driven pool calculation).
          </p>
        </div>
      </div>

      {/* ACTION BAR (Donate / How it works / Claim + Refresh) */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/70 backdrop-blur border-b border-indigo-200/60 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-2">
            <a href="/donate/sol" aria-label="Donate privately" className="inline-flex items-center px-4 py-2 rounded-lg border border-purple-500/70 text-purple-100 bg-purple-700 hover:bg-purple-600 text-sm font-semibold">Donate</a>
            <a href="/how-it-works" aria-label="How it works" className="inline-flex items-center px-4 py-2 rounded-lg border border-cyan-500/70 text-cyan-100 bg-cyan-700 hover:bg-cyan-600 text-sm font-semibold">How it works</a>
            <a href="/claim" aria-label="Claim perks" className="inline-flex items-center px-4 py-2 rounded-lg border border-indigo-500/70 text-indigo-100 bg-indigo-700 hover:bg-indigo-600 text-sm font-semibold">Claim perks</a>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-600 dark:text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</span>
            )}
            <button onClick={fetchData} aria-label="Refresh data" className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-400/40 hover:border-gray-300 text-xs text-gray-700 dark:text-gray-200 hover:bg-white/10">
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {/* Error banner */}
        {error && (
          <div className="mt-6 mb-4 rounded-lg border border-red-500/40 bg-red-900/20 text-red-200 px-4 py-3">
            <strong className="mr-2">Data error:</strong>{error}
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 mt-6">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <div className="text-gray-500 text-sm mb-1">Total Donations</div>
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.totalDonations}</div>
            <div className="text-xs text-gray-500 mt-1">Count of on-chain receipts</div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <div className="text-gray-500 text-sm mb-1">Total Received</div>
            <div className="text-3xl font-extrabold">{formatSOL(walletSol)}</div>
            <div className="text-xs text-gray-500 mt-1">Live: recipient wallet balance</div>
          </div>

          {stats.tierBreakdown.map((count, tier) => (
            <div key={tier} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
              <div className="text-gray-500 text-sm mb-1">{TIER_NAMES[tier]}</div>
              <div className="text-3xl font-extrabold" style={{ color: TIER_COLORS[tier] }}>{count}</div>
            </div>
          ))}
        </div>

        {/* Pool snapshot + Grants + Voting snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <h2 className="text-lg font-bold mb-2">Pooled Fund (Bronze/Silver/Gold)</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              1 SOL = 1 subscription. We subtract {platinumCount} SOL for Platinum grants to isolate pooled funds.
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div className="flex items-center justify-between"><span className="font-medium">Funded (pool)</span><span>{pooledFundedCount} subs</span></div>
              <div className="flex items-center justify-between"><span className="font-medium">Current remainder</span><span>{poolRemainderSOL.toFixed(2)} / 1.00 SOL</span></div>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden mb-1">
              <div className="h-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500" style={{ width: `${poolPct}%`, transition: 'width .4s ease' }} />
            </div>
            <div className="text-xs text-gray-500">{poolPct}% to next subscription</div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <h2 className="text-lg font-bold mb-2">Charities Granted</h2>
            <div className="mb-2 text-xs text-gray-500">Pooled subscriptions:</div>
            {allGranted.pool.length === 0 ? (
              <div className="text-sm text-gray-500 mb-3">No pooled grants yet.</div>
            ) : (
              <ul className="space-y-1 mb-3">
                {allGranted.pool.map((c) => (
                  <li key={`pool-${c}`} className="text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ background: '#8b5cf6' }} />
                      {c}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mb-2 text-xs text-gray-500">Platinum selections:</div>
            {allGranted.platinum.length === 0 ? (
              <div className="text-sm text-gray-500">No platinum grants yet.</div>
            ) : (
              <ul className="space-y-1">
                {allGranted.platinum.map((c) => (
                  <li key={`plat-${c}`} className="text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ background: '#f59e0b' }} />
                      {c}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-xs text-gray-500 mt-3">
              Pool grants are auto-awarded to top-voted charities when the pooled remainder reaches 1 SOL.
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <h2 className="text-lg font-bold mb-2">Current Voting Snapshot</h2>
            <div className="text-xs text-gray-500 mb-3">Aggregated locally (mock) — for illustration only.</div>
            {votingSnapshot
              .slice()
              .sort((a, b) => b.votes - a.votes)
              .slice(0, 5)
              .map((row, idx) => {
                const total = votingSnapshot.reduce((s, r) => s + r.votes, 0) || 1;
                const pct = Math.round((row.votes / total) * 100);
                return (
                  <div key={row.name} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{idx + 1}.</span>
                        <span className="text-gray-900 dark:text-gray-100">{row.name}</span>
                      </div>
                      <span className="text-gray-500">{row.votes} pts · {pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                      <div className="h-2" style={{ width: `${pct}%`, background: '#8b5cf6' }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Tier charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4">Tier Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-15} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} />
                <Bar dataKey="count" fill="#3b82f6">
                  {tierChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg p-6 border border-indigo-200/60 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4">Tier Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData as any}   // satisfy recharts typing
                  cx="50%"
                  cy="50%"
                  dataKey="count"
                  labelLine={false}
                  label={(props: any) =>
                    `${(props?.payload?.name ?? '').split(' ')[0]}: ${((props?.percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Privacy blurb */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🔒</span>
            <div>
              <h3 className="font-bold text-blue-300 mb-1">Privacy-Preserving Analytics</h3>
              <p className="text-sm text-blue-100/90">
                We compute pooled progress from wallet balance minus Platinum grants. No donor identities are stored or shown.
              </p>
            </div>
          </div>
        </div>

        {/* Recent receipts */}
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur rounded-lg border border-indigo-200/60 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-indigo-200/40 dark:border-gray-800">
            <h2 className="text-xl font-bold">Recent Donations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-900/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commitment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt PDA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-200/40 dark:divide-gray-800">
                {receipts.slice(0, 10).map((receipt) => (
                  <tr key={receipt.pda} className="hover:bg-indigo-50/60 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{receipt.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: `${TIER_COLORS[receipt.tier]}20`, color: TIER_COLORS[receipt.tier] }}
                      >
                        {TIER_NAMES[receipt.tier]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                      {receipt.commitment.slice(0, 16)}…
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <a
                        href={`https://explorer.solana.com/address/${receipt.pda}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-400 font-mono"
                        aria-label={`Open receipt ${receipt.pda} on Solana explorer`}
                      >
                        {receipt.pda.slice(0, 8)}…
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {receipts.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-1">No receipts found</p>
              <p className="text-sm">Receipts will appear here after donations are made.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


