import React, { useState, useEffect } from 'react';

interface RevealTransitionProps {
  onComplete: () => void;
}

// Simple Gamepad2 SVG icon to replace lucide-react dependency
const Gamepad2Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="6" y1="11" x2="10" y2="11" />
    <line x1="8" y1="9" x2="8" y2="13" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
    <line x1="18" y1="10" x2="18.01" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
);

const RevealTransition: React.FC<RevealTransitionProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'initial' | 'glitch' | 'dark' | 'complete'>('initial');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Show initial text
    const textTimer = setTimeout(() => setShowText(true), 500);

    // Start glitch effect
    const glitchTimer = setTimeout(() => {
      setStage('glitch');
    }, 2500);

    // Transition to dark
    const darkTimer = setTimeout(() => {
      setStage('dark');
    }, 3500);

    // Complete transition - increased to 7500ms to give more time to read
    const completeTimer = setTimeout(() => {
      setStage('complete');
      onComplete();
    }, 7500);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(glitchTimer);
      clearTimeout(darkTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (stage === 'complete') return null;

  const isDarkOrComplete = stage === 'dark' ;

  return (
    <div className={`fixed inset-0 z-[9999] transition-all duration-1000 ${
      stage === 'initial' ? 'bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100' :
      stage === 'glitch' ? 'bg-gradient-to-br from-purple-900 via-gray-900 to-black' :
      'bg-black'
    }`}>
      <style>{`
        @keyframes heavyScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes verticalScanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
        @keyframes glitchShake {
          0%, 100% { transform: translate(0, 0) scale(1); }
          10% { transform: translate(-5px, 5px) scale(1.01); }
          20% { transform: translate(5px, -5px) scale(0.99); }
          30% { transform: translate(-5px, -5px) scale(1.02); }
          40% { transform: translate(5px, 5px) scale(0.98); }
          50% { transform: translate(-5px, 0) scale(1.01); }
          60% { transform: translate(5px, 0) scale(0.99); }
          70% { transform: translate(0, -5px) scale(1.01); }
          80% { transform: translate(0, 5px) scale(0.99); }
          90% { transform: translate(-2px, 2px) scale(1); }
        }
        @keyframes textGlitch {
          0%, 100% { transform: translate(0); opacity: 1; }
          20% { transform: translate(-3px, 3px); opacity: 0.8; }
          40% { transform: translate(3px, -3px); opacity: 0.9; }
          60% { transform: translate(-2px, -2px); opacity: 0.7; }
          80% { transform: translate(2px, 2px); opacity: 0.85; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .heavy-scanline {
          animation: heavyScanline 3s linear infinite;
        }
        .vertical-scanline {
          animation: verticalScanline 4s linear infinite;
        }
        .glitch-shake {
          animation: glitchShake 0.5s infinite;
        }
        .text-glitch {
          animation: textGlitch 0.3s infinite;
        }
        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .cyber-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
        }
      `}</style>

      {/* Multiple scanlines for enhanced effect */}
      {stage !== 'initial' && (
        <>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="heavy-scanline absolute w-full h-8 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent blur-sm" style={{ animationDelay: '0s' }} />
            <div className="heavy-scanline absolute w-full h-8 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent blur-md" style={{ animationDelay: '1s' }} />
            <div className="heavy-scanline absolute w-full h-12 bg-gradient-to-b from-transparent via-purple-400/25 to-transparent blur-sm" style={{ animationDelay: '2s' }} />
          </div>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="vertical-scanline absolute h-full w-6 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent blur-sm" style={{ animationDelay: '0.5s' }} />
            <div className="vertical-scanline absolute h-full w-8 bg-gradient-to-r from-transparent via-purple-400/15 to-transparent blur-md" style={{ animationDelay: '1.5s' }} />
          </div>
        </>
      )}

      {/* Grid pattern overlay */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${
        stage === 'initial' ? 'grid-pattern opacity-100' :
        stage === 'glitch' ? 'cyber-grid opacity-50' :
        'cyber-grid opacity-30'
      }`} />

      {/* Radial gradient overlays */}
      {stage === 'initial' && (
        <>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </>
      )}

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        {/* Logo and initial branding */}
        <div className={`flex flex-col items-center transition-all duration-1000 ${
          stage === 'glitch' ? 'glitch-shake' : ''
        } ${stage === 'dark' ? 'text-glitch' : ''}`}>
          <div className={`flex items-center gap-3 mb-6 transition-all duration-700 ${
            showText ? 'fade-in-up opacity-100' : 'opacity-0'
          }`}>
            <div className={`transition-all duration-1000 ${
              stage === 'initial' ? 'text-indigo-600' :
              stage === 'glitch' ? 'text-purple-500' :
              'text-cyan-400'
            }`}>
              <Gamepad2Icon />
            </div>
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold transition-all duration-1000 ${
              stage === 'initial' ? 'bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent' :
              stage === 'glitch' ? 'text-purple-500' :
              'text-cyan-400 font-mono'
            }`}>
              FundRaisely
            </h1>
          </div>

          {/* Transition text */}
          <div className={`text-center transition-all duration-700 ${
            showText ? 'fade-in-up opacity-100' : 'opacity-0'
          }`} style={{ animationDelay: '0.3s' }}>
            <p className={`text-xl sm:text-2xl md:text-3xl font-semibold mb-4 transition-all duration-1000 ${
              stage === 'initial' ? 'text-indigo-800' :
              stage === 'glitch' ? 'text-purple-400' :
              'text-cyan-400 font-mono'
            }`}>
              {stage === 'initial' ? 'GOES PRIVATE' : stage === 'glitch' ? 'GOES PRIVATE' : '>> GOES_PRIVATE'}
            </p>
          </div>

          {/* Reveal message */}
          {isDarkOrComplete && (
            <div className="fade-in-up text-center mt-8">
              <p className="text-lg sm:text-xl text-cyan-400 font-mono mb-2">
                {'>> '}INITIALIZING PRIVACY MODE{' <<'}
              </p>
              <p className="text-sm sm:text-base text-cyan-600 font-mono">
                PRIVACY_PRESERVING_DONATIONS_PROTOCOL: ACTIVE // CYPHERPUNK_MODE: ENABLED
              </p>
            </div>
          )}
        </div>

        {/* Color transition bars */}
        {stage === 'glitch' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-cyan-400 to-purple-600 animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-600 to-cyan-400 animate-pulse" />
            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-purple-600 via-cyan-400 to-purple-600 animate-pulse" />
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-cyan-400 via-purple-600 to-cyan-400 animate-pulse" />
          </div>
        )}

        {/* Dark mode particles */}
        {isDarkOrComplete && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-40 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Noise texture overlay */}
      {stage !== 'initial' && (
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
          }}
        />
      )}
    </div>
  );
};

export default RevealTransition;