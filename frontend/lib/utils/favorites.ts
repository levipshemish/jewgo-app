'use client';

import * as React from 'react';

import { Restaurant } from '@/lib/types/restaurant';

const FAVORITES_STORAGE_KEY = 'jewgo_favorites';


export interface FavoriteRestaurant {
  id: string;
  name: string;
  addedAt: string;
  lastVisited?: string;
  visitCount: number;
  notes?: string;
  tags?: string[];
}

export interface FavoritesData {
  restaurants: FavoriteRestaurant[];
  lastUpdated: string;
  version: string;
}

class FavoritesManager {
  private static instance: FavoritesManager;
  private favorites: Map<string, FavoriteRestaurant> = new Map();
  private listeners: Set<(favorites: FavoriteRestaurant[]) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): FavoritesManager {
    if (!FavoritesManager.instance) {
      FavoritesManager.instance = new FavoritesManager();
    }
    return FavoritesManager.instance;
  }

  // Load favorites from localStorage
  private loadFromStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const data: FavoritesData = JSON.parse(stored);
        this.favorites.clear();
        data.restaurants.forEach(fav => {
          this.favorites.set(fav.id, fav);
        });
      }
    } catch {
      // // console.error('Error loading favorites from storage:', error);
      this.favorites.clear();
    }
  }

  // Save favorites to localStorage
  private saveToStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const data: FavoritesData = {
        restaurants: Array.from(this.favorites.values()),
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // // console.error('Error saving favorites to storage:', error);
    }
  }

  // Notify listeners of changes
  private notifyListeners(): void {
    const favorites = Array.from(this.favorites.values());
    this.listeners.forEach(listener => {
      try {
        listener(favorites);
      } catch {
        // // console.error('Error in favorites listener:', error);
      }
    });
  }

  // Add a restaurant to favorites
  addFavorite(restaurant: Restaurant, notes?: string, tags?: string[]): boolean {
    try {
      const favorite: FavoriteRestaurant = {
        id: restaurant.id.toString(),
        name: restaurant.name,
        addedAt: new Date().toISOString(),
        visitCount: 0,
        notes,
        tags: tags || []
      };

      this.favorites.set(restaurant.id.toString(), favorite);
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch {
      // // console.error('Error adding favorite:', error);
      return false;
    }
  }

  // Remove a restaurant from favorites
  removeFavorite(restaurantId: string): boolean {
    try {
      const removed = this.favorites.delete(restaurantId);
      if (removed) {
        this.saveToStorage();
        this.notifyListeners();
      }
      return removed;
    } catch {
      // // console.error('Error removing favorite:', error);
      return false;
    }
  }

  // Check if a restaurant is favorited
  isFavorite(restaurantId: string): boolean {
    return this.favorites.has(restaurantId);
  }

  // Get all favorites
  getFavorites(): FavoriteRestaurant[] {
    return Array.from(this.favorites.values()).sort((a, b) => 
      new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }

  // Get favorite by ID
  getFavorite(restaurantId: string): FavoriteRestaurant | undefined {
    return this.favorites.get(restaurantId);
  }

  // Update favorite notes
  updateNotes(restaurantId: string, notes: string): boolean {
    try {
      const favorite = this.favorites.get(restaurantId);
      if (favorite) {
        favorite.notes = notes;
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      // // console.error('Error updating notes:', error);
      return false;
    }
  }

  // Add tags to favorite
  addTags(restaurantId: string, tags: string[]): boolean {
    try {
      const favorite = this.favorites.get(restaurantId);
      if (favorite) {
        const existingTags = new Set(favorite.tags || []);
        tags.forEach(tag => existingTags.add(tag));
        favorite.tags = Array.from(existingTags);
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      // // console.error('Error adding tags:', error);
      return false;
    }
  }

  // Remove tags from favorite
  removeTags(restaurantId: string, tags: string[]): boolean {
    try {
      const favorite = this.favorites.get(restaurantId);
      if (favorite) {
        const existingTags = new Set(favorite.tags || []);
        tags.forEach(tag => existingTags.delete(tag));
        favorite.tags = Array.from(existingTags);
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      // // console.error('Error removing tags:', error);
      return false;
    }
  }

  // Increment visit count
  incrementVisitCount(restaurantId: string): boolean {
    try {
      const favorite = this.favorites.get(restaurantId);
      if (favorite) {
        favorite.visitCount += 1;
        favorite.lastVisited = new Date().toISOString();
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      // // console.error('Error incrementing visit count:', error);
      return false;
    }
  }

  // Get favorites by tag
  getFavoritesByTag(tag: string): FavoriteRestaurant[] {
    return this.getFavorites().filter(favorite => 
      favorite.tags?.includes(tag)
    );
  }

  // Get all unique tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.favorites.forEach(favorite => {
      favorite.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  // Search favorites
  searchFavorites(query: string): FavoriteRestaurant[] {
    const lowerQuery = query.toLowerCase();
    return this.getFavorites().filter(favorite =>
      favorite.name.toLowerCase().includes(lowerQuery) ||
      favorite.notes?.toLowerCase().includes(lowerQuery) ||
      favorite.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Get recently added favorites
  getRecentFavorites(limit: number = 10): FavoriteRestaurant[] {
    return this.getFavorites().slice(0, limit);
  }

  // Get most visited favorites
  getMostVisitedFavorites(limit: number = 10): FavoriteRestaurant[] {
    return this.getFavorites()
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit);
  }

  // Clear all favorites
  clearAll(): boolean {
    try {
      this.favorites.clear();
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch {
      // // console.error('Error clearing favorites:', error);
      return false;
    }
  }

  // Export favorites data
  exportData(): string {
    try {
      const data: FavoritesData = {
        restaurants: this.getFavorites(),
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      return JSON.stringify(data, null, 2);
    } catch {
      // // console.error('Error exporting favorites:', error);
      return '';
    }
  }

  // Import favorites data
  importData(jsonData: string): boolean {
    try {
      const data: FavoritesData = JSON.parse(jsonData);
      if (data.restaurants && Array.isArray(data.restaurants)) {
        this.favorites.clear();
        data.restaurants.forEach(fav => {
          this.favorites.set(fav.id, fav);
        });
        this.saveToStorage();
        this.notifyListeners();
        return true;
      }
      return false;
    } catch {
      // // console.error('Error importing favorites:', error);
      return false;
    }
  }

  // Subscribe to favorites changes
  subscribe(listener: (favorites: FavoriteRestaurant[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current favorites
    listener(this.getFavorites());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get favorites count
  getCount(): number {
    return this.favorites.size;
  }

  // Check if storage is available
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const favoritesManager = FavoritesManager.getInstance();

// React hook for using favorites
export const useFavorites = () => {
  const [favorites, setFavorites] = React.useState<FavoriteRestaurant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = favoritesManager.subscribe((newFavorites) => {
      setFavorites(newFavorites);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return {
    favorites,
    isLoading,
    addFavorite: favoritesManager.addFavorite.bind(favoritesManager),
    removeFavorite: favoritesManager.removeFavorite.bind(favoritesManager),
    isFavorite: favoritesManager.isFavorite.bind(favoritesManager),
    updateNotes: favoritesManager.updateNotes.bind(favoritesManager),
    addTags: favoritesManager.addTags.bind(favoritesManager),
    removeTags: favoritesManager.removeTags.bind(favoritesManager),
    incrementVisitCount: favoritesManager.incrementVisitCount.bind(favoritesManager),
    searchFavorites: favoritesManager.searchFavorites.bind(favoritesManager),
    getFavoritesByTag: favoritesManager.getFavoritesByTag.bind(favoritesManager),
    getAllTags: favoritesManager.getAllTags.bind(favoritesManager),
    clearAll: favoritesManager.clearAll.bind(favoritesManager),
    exportData: favoritesManager.exportData.bind(favoritesManager),
    importData: favoritesManager.importData.bind(favoritesManager),
  };
};

// Utility functions
export const toggleFavorite = (restaurant: Restaurant): boolean => {
  if (favoritesManager.isFavorite(restaurant.id.toString())) {
    return favoritesManager.removeFavorite(restaurant.id.toString());
  } else {
    return favoritesManager.addFavorite(restaurant);
  }
};

export const getFavoriteCount = (): number => {
  return favoritesManager.getCount();
};

export const isStorageAvailable = (): boolean => {
  return favoritesManager.isStorageAvailable();
}; 