import './polyfills';  
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DonateSol from './pages/DonateSol';               // ⬅️ use DonateSol directly
import RecipientDashboard from './pages/RecipientDashboard';
import ClaimBenefits from './pages/ClaimPage';
import HowItWorks from './pages/HowItWorks';
import HomeIntro from './pages/HomeIntro';               // ⬅️ new
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

const Root: React.FC = () => {
  const network = 'devnet';
  const endpoint = import.meta.env.VITE_RPC_URL || clusterApiUrl(network);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Routes>
              {/* Root: show intro, then redirect to /how-it-works */}
              <Route path="/" element={<HomeIntro />} />

              {/* Donation route goes straight to DonateSol (no intro) */}
              <Route path="/donate/sol" element={<DonateSol />} />

              <Route path="/dashboard" element={<RecipientDashboard />} />
              <Route path="/claim" element={<ClaimBenefits />} />
              <Route path="/how-it-works" element={<HowItWorks />} />

              {/* Fallback now goes to /how-it-works */}
              <Route path="*" element={<Navigate to="/how-it-works" replace />} />
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
