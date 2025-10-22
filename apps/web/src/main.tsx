import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DonationWithReveal from './pages/DonationWithReveal';
import RecipientDashboard from './pages/RecipientDashboard';
import ClaimBenefits from './pages/ClaimPage';  // ADD THIS LINE
import HowItWorks from './pages/HowItWorks';
import './index.css';

// Wallet adapter imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

// A wrapper component to provide wallet context and routing
const Root: React.FC = () => {
  // Use devnet by default; fall back to the Vite RPC URL if provided
  const network = 'devnet';
  const endpoint = import.meta.env.VITE_RPC_URL || clusterApiUrl(network);
  const wallets = useMemo(() => {
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/donate/sol" element={<DonationWithReveal />} />
              <Route path="/dashboard" element={<RecipientDashboard />} />
              <Route path="/claim" element={<ClaimBenefits />} />  {/* ADD THIS LINE */}
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="*" element={<Navigate to="/donate/sol" replace />} />
            </Routes>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);