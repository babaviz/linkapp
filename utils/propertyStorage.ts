import AsyncStorage from '@react-native-async-storage/async-storage';
import { Property } from '../types/property';

const FAVORITES_KEY = '@LinkApp:favoriteProperties';
const SEARCH_HISTORY_KEY = '@LinkApp:searchHistory';
const VIEWED_PROPERTIES_KEY = '@LinkApp:viewedProperties';

export class PropertyStorageService {
  /**
   * Save favorite properties to AsyncStorage
   */
  static async saveFavoriteProperties(properties: Property[]): Promise<void> {
    try {
      const json = JSON.stringify(properties);
      await AsyncStorage.setItem(FAVORITES_KEY, json);
    } catch (error) {
      
    }
  }

  /**
   * Load favorite properties from AsyncStorage
   */
  static async loadFavoriteProperties(): Promise<Property[]> {
    try {
      const json = await AsyncStorage.getItem(FAVORITES_KEY);
      if (json) {
        return JSON.parse(json);
      }
      return [];
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Add a property to favorites
   */
  static async addFavoriteProperty(property: Property): Promise<Property[]> {
    try {
      const favorites = await this.loadFavoriteProperties();
      const exists = favorites.find(p => p.id === property.id);
      
      if (!exists) {
        favorites.unshift(property); // Add to beginning
        await this.saveFavoriteProperties(favorites);
      }
      
      return favorites;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Remove a property from favorites
   */
  static async removeFavoriteProperty(propertyId: string): Promise<Property[]> {
    try {
      const favorites = await this.loadFavoriteProperties();
      const filtered = favorites.filter(p => p.id !== propertyId);
      await this.saveFavoriteProperties(filtered);
      return filtered;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Check if a property is favorited
   */
  static async isFavorited(propertyId: string): Promise<boolean> {
    try {
      const favorites = await this.loadFavoriteProperties();
      return favorites.some(p => p.id === propertyId);
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Save search history
   */
  static async saveSearchHistory(searches: string[]): Promise<void> {
    try {
      // Keep only last 10 searches
      const recentSearches = searches.slice(0, 10);
      const json = JSON.stringify(recentSearches);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, json);
    } catch (error) {
      
    }
  }

  /**
   * Load search history
   */
  static async loadSearchHistory(): Promise<string[]> {
    try {
      const json = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (json) {
        return JSON.parse(json);
      }
      return [];
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Add to search history
   */
  static async addSearchHistory(search: string): Promise<string[]> {
    try {
      const history = await this.loadSearchHistory();
      // Remove duplicate if exists
      const filtered = history.filter(s => s !== search);
      // Add to beginning
      filtered.unshift(search);
      // Keep only 10
      const limited = filtered.slice(0, 10);
      await this.saveSearchHistory(limited);
      return limited;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Save viewed properties
   */
  static async saveViewedProperties(properties: Property[]): Promise<void> {
    try {
      // Keep only last 20 viewed
      const recent = properties.slice(0, 20);
      const json = JSON.stringify(recent);
      await AsyncStorage.setItem(VIEWED_PROPERTIES_KEY, json);
    } catch (error) {
      
    }
  }

  /**
   * Load viewed properties
   */
  static async loadViewedProperties(): Promise<Property[]> {
    try {
      const json = await AsyncStorage.getItem(VIEWED_PROPERTIES_KEY);
      if (json) {
        return JSON.parse(json);
      }
      return [];
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Add to viewed properties
   */
  static async addViewedProperty(property: Property): Promise<Property[]> {
    try {
      const viewed = await this.loadViewedProperties();
      // Remove duplicate if exists
      const filtered = viewed.filter(p => p.id !== property.id);
      // Add to beginning
      filtered.unshift(property);
      // Keep only 20
      const limited = filtered.slice(0, 20);
      await this.saveViewedProperties(limited);
      return limited;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Clear all property data
   */
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        FAVORITES_KEY,
        SEARCH_HISTORY_KEY,
        VIEWED_PROPERTIES_KEY
      ]);
    } catch (error) {
      
    }
  }
}

export default PropertyStorageService;
