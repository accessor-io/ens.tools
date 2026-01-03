import { useState, useEffect, useRef } from 'react';

interface RotatingENSNamesProps {
  className?: string;
  scrollTrigger?: boolean;
}

const ENS_NAMES = [
  'example.eth',
  'vitalik.eth',
  'paradigm.eth',
  'uniswap.eth',
  'aave.eth',
  'compound.eth',
  'maker.eth',
  'opensea.eth',
  'ens.eth',
  'ethereum.eth',
  'defi.eth',
  'nft.eth',
  'dao.eth',
  'web3.eth',
  'crypto.eth',
  'metamask.eth',
  'coinbase.eth',
  'binance.eth',
  'chainlink.eth',
  'polygon.eth',
  'arbitrum.eth',
  'optimism.eth',
  'base.eth',
  'zora.eth',
  'farcaster.eth',
  'lens.eth',
  'mirror.eth',
  'snapshot.eth',
  'gitcoin.eth',
  'gnosis.eth',
  'consensys.eth',
  'infura.eth',
  'alchemy.eth',
  'quicknode.eth',
  'thegraph.eth',
  'ipfs.eth',
  'filecoin.eth',
  'starknet.eth',
  'zksync.eth',
  'celo.eth',
  'avalanche.eth',
  'fantom.eth',
  'cosmos.eth',
  'polkadot.eth',
  'solana.eth',
  'near.eth',
  'aptos.eth',
  'sui.eth',
  'immutable.eth',
  'magic.eth',
];

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export function RotatingENSNames({ className, scrollTrigger = true }: RotatingENSNamesProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const charIndexRef = useRef(0);
  const glitchTimeoutRef = useRef<NodeJS.Timeout>();

  const currentName = ENS_NAMES[currentIndex];

  useEffect(() => {
    if (!scrollTrigger) {
      // Auto-rotate if not scroll-triggered
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ENS_NAMES.length);
      }, 3000);
      return () => clearInterval(interval);
    }

    const handleScroll = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const scrollPosition = window.scrollY;
        const nameIndex = Math.floor(scrollPosition / 250) % ENS_NAMES.length;
        
        if (nameIndex !== currentIndex) {
          setCurrentIndex(nameIndex);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scrollTrigger, currentIndex]);

  // Typewriter effect with glitch
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (glitchTimeoutRef.current) {
      clearTimeout(glitchTimeoutRef.current);
    }

    setIsAnimating(true);
    setDisplayText('');
    charIndexRef.current = 0;

    const typeNextChar = () => {
      if (charIndexRef.current < currentName.length) {
        // Random glitch effect during typing (more frequent)
        if (Math.random() < 0.18 && charIndexRef.current > 0) {
          setGlitchActive(true);
          const glitchText = Array.from({ length: currentName.length }, () => 
            GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
          ).join('');
          setDisplayText(glitchText);
          
          glitchTimeoutRef.current = setTimeout(() => {
            setGlitchActive(false);
            setDisplayText(currentName.slice(0, charIndexRef.current));
          }, 50 + Math.random() * 100);
        } else {
          setDisplayText(currentName.slice(0, charIndexRef.current + 1));
        }
        
        charIndexRef.current++;
        const delay = glitchActive ? 80 : (20 + Math.random() * 15);
        timeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        setIsAnimating(false);
        // Hold the text for a moment before next transition
        timeoutRef.current = setTimeout(() => {
          // Fade out effect
          setIsAnimating(true);
          timeoutRef.current = setTimeout(() => {
            setDisplayText('');
            charIndexRef.current = 0;
          }, 100);
        }, 1200);
      }
    };

    // Start typing immediately
    timeoutRef.current = setTimeout(typeNextChar, 20);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current);
      }
    };
  }, [currentName]);

  return (
    <div 
      ref={containerRef} 
      className={`relative inline-block ${className}`}
      style={{ 
        minWidth: '180px',
        height: '1.5em',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <div className="relative w-full">
        {/* Main text with typewriter effect */}
        <span
          className="inline-block relative"
          style={{
            opacity: isAnimating && displayText === '' ? 0 : 1,
            transform: glitchActive ? `translateX(${(Math.random() - 0.5) * 4}px)` : 'translateX(0)',
            filter: glitchActive ? 'blur(0.5px)' : 'blur(0)',
            transition: glitchActive ? 'none' : 'all 0.1s ease-out',
            textShadow: glitchActive 
              ? `2px 0 0 rgba(107, 122, 143, 0.5), -2px 0 0 rgba(107, 122, 143, 0.3)`
              : 'none',
          }}
        >
          {displayText}
          {/* Cursor */}
          {displayText.length < currentName.length && (
            <span
              className="inline-block ml-0.5"
              style={{
                width: '2px',
                height: '1em',
                backgroundColor: 'currentColor',
                animation: 'blink 1s infinite',
                verticalAlign: 'baseline',
              }}
            />
          )}
        </span>

        {/* Glitch overlay layers */}
        {glitchActive && (
          <>
            <span
              className="absolute inset-0 inline-block text-red-500 opacity-70"
              style={{
                clipPath: 'inset(0 0 50% 0)',
                transform: `translateX(${Math.random() * 3 - 1.5}px)`,
                pointerEvents: 'none',
              }}
            >
              {displayText}
            </span>
            <span
              className="absolute inset-0 inline-block text-blue-500 opacity-70"
              style={{
                clipPath: 'inset(50% 0 0 0)',
                transform: `translateX(${Math.random() * 3 - 1.5}px)`,
                pointerEvents: 'none',
              }}
            >
              {displayText}
            </span>
          </>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
