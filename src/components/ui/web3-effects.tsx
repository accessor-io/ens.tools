/**
 * Web3-specific visual effects and animations
 * Premium blockchain-inspired UI elements
 */

import { useEffect, useRef } from 'react';

/**
 * Animated blockchain link effect
 */
export function BlockchainLink({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-glow-purple" />
      </div>
    </div>
  );
}

/**
 * Transaction status indicator with pulse animation
 */
export function TransactionStatus({ 
  status, 
  className 
}: { 
  status: 'pending' | 'confirmed' | 'failed';
  className?: string;
}) {
  const statusColors = {
    pending: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    confirmed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    failed: 'bg-red-500/20 border-red-500/30 text-red-400',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColors[status]} ${className}`}>
      <div className={`h-2 w-2 rounded-full ${status === 'pending' ? 'bg-amber-400 animate-pulse' : status === 'confirmed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <span className="text-xs font-semibold capitalize">{status}</span>
    </div>
  );
}

/**
 * Animated gradient orb for backgrounds
 */
export function GradientOrb({ 
  color = 'purple',
  size = 200,
  className = ''
}: {
  color?: 'purple' | 'pink' | 'cyan' | 'blue';
  size?: number;
  className?: string;
}) {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orb = orbRef.current;
    if (!orb) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = orb.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      orb.style.setProperty('--mouse-x', `${x}px`);
      orb.style.setProperty('--mouse-y', `${y}px`);
    };

    orb.addEventListener('mousemove', handleMouseMove);
    return () => orb.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const colorClasses = {
    purple: 'from-purple-500/30 via-pink-500/20 to-purple-500/30',
    pink: 'from-pink-500/30 via-purple-500/20 to-pink-500/30',
    cyan: 'from-cyan-500/30 via-blue-500/20 to-cyan-500/30',
    blue: 'from-blue-500/30 via-cyan-500/20 to-blue-500/30',
  };

  return (
    <div
      ref={orbRef}
      className={`absolute rounded-full blur-3xl opacity-50 animate-pulse ${colorClasses[color]} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${colorClasses[color]})`,
        transition: 'background 0.3s ease',
      }}
    />
  );
}

/**
 * Web3 connection indicator
 */
export function Web3ConnectionIndicator({ 
  connected,
  chainId 
}: { 
  connected: boolean;
  chainId?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse shadow-glow' : 'bg-red-400'}`} />
      <span className="text-xs text-secondary font-mono">
        {connected ? `Chain ${chainId || 'Unknown'}` : 'Disconnected'}
      </span>
    </div>
  );
}
