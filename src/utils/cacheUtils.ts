import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache duration presets (in milliseconds)
 */
export const CACHE_DURATIONS = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

/**
 * Store data in cache with timestamp
 */
export const setCacheData = async <T>(key: string, data: T): Promise<void> => {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error(`Error setting cache for key "${key}":`, error);
  }
};

/**
 * Get data from cache if it exists and hasn't expired
 */
export const getCacheData = async <T>(
  key: string,
  duration: number = CACHE_DURATIONS.MEDIUM
): Promise<T | null> => {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - cacheItem.timestamp;

    // Check if cache has expired
    if (age > duration) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.error(`Error getting cache for key "${key}":`, error);
    return null;
  }
};

/**
 * Clear specific cache entry
 */
export const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing cache for key "${key}":`, error);
  }
};

/**
 * Clear all cache entries with a specific prefix
 */
export const clearCacheByPrefix = async (prefix: string): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToDelete = keys.filter(key => key.startsWith(prefix));
    await AsyncStorage.multiRemove(keysToDelete);
  } catch (error) {
    console.error(`Error clearing cache with prefix "${prefix}":`, error);
  }
};

/**
 * Debounce function to limit API calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit API calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
