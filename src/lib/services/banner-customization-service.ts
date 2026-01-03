/**
 * Banner Customization Service
 * Manages user preferences for the banner (height, colors, etc.)
 * Uses localStorage for persistence
 */

export interface BannerCustomization {
  height: number; // Height in pixels or viewport units
  heightUnit: 'px' | 'vh' | 'rem';
  backgroundColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  opacity?: number;
  showBanner: boolean;
}

const DEFAULT_CUSTOMIZATION: BannerCustomization = {
  height: 100,
  heightUnit: 'vh',
  backgroundColor: undefined,
  gradientStart: undefined,
  gradientEnd: undefined,
  opacity: 0.2,
  showBanner: true,
};

const STORAGE_KEY = 'ens_banner_customization';

class BannerCustomizationService {
  /**
   * Get current banner customization
   */
  getCustomization(): BannerCustomization {
    if (typeof window === 'undefined') {
      return DEFAULT_CUSTOMIZATION;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CUSTOMIZATION, ...parsed };
      }
    } catch (error) {
      console.warn('Error loading banner customization:', error);
    }

    return DEFAULT_CUSTOMIZATION;
  }

  /**
   * Save banner customization
   */
  saveCustomization(customization: Partial<BannerCustomization>): BannerCustomization {
    if (typeof window === 'undefined') {
      return DEFAULT_CUSTOMIZATION;
    }

    try {
      const current = this.getCustomization();
      const updated = { ...current, ...customization };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('bannerCustomizationChanged'));
      
      return updated;
    } catch (error) {
      console.error('Error saving banner customization:', error);
      return this.getCustomization();
    }
  }

  /**
   * Reset to default customization
   */
  resetCustomization(): BannerCustomization {
    if (typeof window === 'undefined') {
      return DEFAULT_CUSTOMIZATION;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_CUSTOMIZATION;
    } catch (error) {
      console.error('Error resetting banner customization:', error);
      return DEFAULT_CUSTOMIZATION;
    }
  }

  /**
   * Get computed height value
   */
  getHeightValue(customization?: BannerCustomization): string {
    const config = customization || this.getCustomization();
    if (config.heightUnit === 'vh') {
      return `${config.height}vh`;
    } else if (config.heightUnit === 'rem') {
      return `${config.height}rem`;
    } else {
      return `${config.height}px`;
    }
  }
}

export const bannerCustomizationService = new BannerCustomizationService();
