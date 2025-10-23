import { PublicClient, formatEther } from 'viem';
import { ETH_REGISTRAR_CONTROLLER_ABI } from '../ens/ens-contracts';
import { ENS_ADDRESSES } from '../ens/ens-addresses';

export interface PremiumPriceInfo {
  base: string; // ETH
  premium: string; // ETH
  total: string; // ETH
  hasPremium: boolean;
}

/**
 * Service for fetching ENS premium auction prices
 */
export class PremiumPriceService {
  /**
   * Get premium price for a domain name
   */
  async getPremiumPrice(
    publicClient: PublicClient,
    name: string,
    duration: number = 31536000 // 1 year in seconds
  ): Promise<PremiumPriceInfo | null> {
    try {
      const label = name.split('.')[0];
      
      const result = await publicClient.readContract({
        address: ENS_ADDRESSES.ETH_REGISTRAR_CONTROLLER,
        abi: ETH_REGISTRAR_CONTROLLER_ABI,
        functionName: 'rentPrice',
        args: [label, BigInt(duration)],
      });

      const [base, premium] = result as [bigint, bigint];
      
      const baseEth = formatEther(base);
      const premiumEth = formatEther(premium);
      const totalEth = formatEther(base + premium);

      return {
        base: baseEth,
        premium: premiumEth,
        total: totalEth,
        hasPremium: premium > 0n,
      };
    } catch (error) {
      console.error('Error fetching premium price:', error);
      return null;
    }
  }

  /**
   * Format ETH price for display
   */
  formatPrice(price: string): string {
    const num = parseFloat(price);
    if (num === 0) return 'Free';
    if (num < 0.001) return '< 0.001 ETH';
    if (num < 1) return num.toFixed(4) + ' ETH';
    return num.toFixed(3) + ' ETH';
  }
}

export const premiumPriceService = new PremiumPriceService();

