export interface WatchedName {
  name: string;
  addedAt: Date;
  notes?: string;
  alerts: {
    expiryAlert: boolean;
    transferAlert: boolean;
    priceAlert: boolean;
  };
}

/**
 * Service for managing watched ENS names, alerts, and notes
 */
export class NameWatchingService {
  private readonly STORAGE_KEY = 'ens_watched_names';

  /**
   * Get all watched names
   */
  getWatchedNames(): WatchedName[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
      }));
    } catch (error) {
      console.error('Error loading watched names:', error);
      return [];
    }
  }

  /**
   * Check if a name is being watched
   */
  isWatched(name: string): boolean {
    const watched = this.getWatchedNames();
    return watched.some(w => w.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Get notes for a specific name
   */
  getNotes(name: string): string | null {
    const watched = this.getWatchedNames();
    const item = watched.find(w => w.name.toLowerCase() === name.toLowerCase());
    return item?.notes || null;
  }

  /**
   * Add a name to watchlist
   */
  addToWatchlist(name: string, alerts: WatchedName['alerts'] = {
    expiryAlert: true,
    transferAlert: false,
    priceAlert: false,
  }): void {
    const watched = this.getWatchedNames();
    
    // Check if already exists
    if (watched.some(w => w.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    watched.push({
      name,
      addedAt: new Date(),
      alerts,
    });

    this.saveWatchedNames(watched);
  }

  /**
   * Remove from watchlist
   */
  removeFromWatchlist(name: string): void {
    const watched = this.getWatchedNames();
    const filtered = watched.filter(w => w.name.toLowerCase() !== name.toLowerCase());
    this.saveWatchedNames(filtered);
  }

  /**
   * Update notes for a name
   */
  updateNotes(name: string, notes: string): void {
    const watched = this.getWatchedNames();
    const item = watched.find(w => w.name.toLowerCase() === name.toLowerCase());
    
    if (item) {
      item.notes = notes;
      this.saveWatchedNames(watched);
    } else {
      // Add new entry with notes
      watched.push({
        name,
        addedAt: new Date(),
        notes,
        alerts: {
          expiryAlert: false,
          transferAlert: false,
          priceAlert: false,
        },
      });
      this.saveWatchedNames(watched);
    }
  }

  /**
   * Update alerts for a name
   */
  updateAlerts(name: string, alerts: Partial<WatchedName['alerts']>): void {
    const watched = this.getWatchedNames();
    const item = watched.find(w => w.name.toLowerCase() === name.toLowerCase());
    
    if (item) {
      item.alerts = { ...item.alerts, ...alerts };
      this.saveWatchedNames(watched);
    }
  }

  /**
   * Save watched names to localStorage
   */
  private saveWatchedNames(names: WatchedName[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(names));
    } catch (error) {
      console.error('Error saving watched names:', error);
    }
  }
}

export const nameWatchingService = new NameWatchingService();

