import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from 'react';
import {
  Image as RNImage,
  ImageProps as RNImageProps,
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  FadeIn 
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to import expo-image, fall back to React Native Image if not available
let Image: any = RNImage;
let ImageContentFit: any;
let AnimatedImage: any = Animated.createAnimatedComponent(RNImage);

try {
  const ExpoImage = require('expo-image');
  Image = ExpoImage.Image;
  ImageContentFit = ExpoImage.ImageContentFit;
  AnimatedImage = Animated.createAnimatedComponent(ExpoImage.Image);
} catch (error) {
  if (__DEV__) console.warn('expo-image not available, using React Native Image');
  // Define ImageContentFit for fallback
  ImageContentFit = {
    cover: 'cover',
    contain: 'contain',
    fill: 'stretch',
    none: 'center',
    scaleDown: 'contain',
  };
}

// Default blurhash for placeholder
const DEFAULT_BLURHASH = '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

interface OptimizedImageProps {
  source: { uri: string } | number;
  fallbackSource?: { uri: string } | number;
  style?: ImageStyle | ViewStyle;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scaleDown';
  enableCache?: boolean;
  placeholder?: string | boolean;
  placeholderColor?: string;
  priority?: 'high' | 'low' | 'normal';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error?: any) => void;
  thumbnailSource?: { uri: string };
  blurRadius?: number;
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  lazy?: boolean;
  recyclingKey?: string;
  allowDownscaling?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

interface ImageCacheEntry {
  uri: string;
  timestamp: number;
  size?: number;
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private memoryCache: Map<string, ImageCacheEntry> = new Map();
  private cacheSize: number = 0;
  private readonly maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  private readonly maxCacheAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  private constructor() {
    this.loadCacheMetadata();
  }
  
  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }
  
  private async loadCacheMetadata() {
    try {
      const metadata = await AsyncStorage.getItem('@image_cache_metadata');
      if (metadata) {
        const parsed = JSON.parse(metadata);
        this.memoryCache = new Map(Object.entries(parsed.cache));
        this.cacheSize = parsed.size || 0;
      }
    } catch (error) {
      
    }
  }
  
  private async saveCacheMetadata() {
    try {
      const metadata = {
        cache: Object.fromEntries(this.memoryCache),
        size: this.cacheSize,
      };
      await AsyncStorage.setItem('@image_cache_metadata', JSON.stringify(metadata));
    } catch (error) {
      
    }
  }
  
  async getCachedImage(uri: string): Promise<string | null> {
    const entry = this.memoryCache.get(uri);
    
    if (entry) {
      const age = Date.now() - entry.timestamp;
      if (age > this.maxCacheAge) {
        // Cache expired
        await this.removeCachedImage(uri);
        return null;
      }
      
      try {
        const cachedData = await AsyncStorage.getItem(`@image_cache_${uri}`);
        if (cachedData) {
          // Update timestamp on access
          entry.timestamp = Date.now();
          this.memoryCache.set(uri, entry);
          return cachedData;
        }
      } catch (error) {
        
      }
    }
    
    return null;
  }
  
  async cacheImage(uri: string, data: string, size: number = 0) {
    // Check if we need to clear cache
    if (this.cacheSize + size > this.maxCacheSize) {
      await this.clearOldestEntries(size);
    }
    
    try {
      await AsyncStorage.setItem(`@image_cache_${uri}`, data);
      
      const entry: ImageCacheEntry = {
        uri,
        timestamp: Date.now(),
        size,
      };
      
      this.memoryCache.set(uri, entry);
      this.cacheSize += size;
      
      await this.saveCacheMetadata();
    } catch (error) {
      
    }
  }
  
  private async clearOldestEntries(requiredSpace: number) {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    let freedSpace = 0;
    
    for (const [uri, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      await this.removeCachedImage(uri);
      freedSpace += entry.size || 0;
    }
  }
  
  private async removeCachedImage(uri: string) {
    const entry = this.memoryCache.get(uri);
    if (entry) {
      try {
        await AsyncStorage.removeItem(`@image_cache_${uri}`);
        this.cacheSize -= entry.size || 0;
        this.memoryCache.delete(uri);
        await this.saveCacheMetadata();
      } catch (error) {
        
      }
    }
  }
  
  async clearCache() {
    const keys = Array.from(this.memoryCache.keys());
    
    for (const uri of keys) {
      await this.removeCachedImage(uri);
    }
    
    this.memoryCache.clear();
    this.cacheSize = 0;
    await this.saveCacheMetadata();
  }
  
  getCacheInfo() {
    return {
      entries: this.memoryCache.size,
      sizeBytes: this.cacheSize,
      sizeMB: Math.round(this.cacheSize / 1024 / 1024 * 100) / 100,
    };
  }
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  source,
  fallbackSource,
  style,
  contentFit = 'cover',
  enableCache = true,
  placeholder = DEFAULT_BLURHASH,
  placeholderColor = '#E0E0E0',
  priority = 'normal',
  onLoadStart,
  onLoadEnd,
  onError,
  thumbnailSource,
  blurRadius,
  transition = 300,
  cachePolicy = 'memory-disk',
  lazy = true,
  recyclingKey,
  allowDownscaling = true,
  accessibilityLabel,
  testID,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSource, setImageSource] = useState(source);
  const [displayThumbnail, setDisplayThumbnail] = useState(!!thumbnailSource);
  const opacity = useSharedValue(0);
  const isMounted = useRef(true);
  const cacheManager = ImageCacheManager.getInstance();
  
  // Use expo-image for better caching and performance
  const isLocalImage = typeof source === 'number';
  const placeholderValue = placeholder === true ? DEFAULT_BLURHASH : (placeholder || undefined);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (typeof source === 'object' && 'uri' in source && enableCache) {
      loadCachedImage();
    }
  }, [source]);
  
  const loadCachedImage = async () => {
    if (typeof source === 'object' && 'uri' in source) {
      const cachedUri = await cacheManager.getCachedImage(source.uri);
      
      if (cachedUri && isMounted.current) {
        setImageSource({ uri: cachedUri });
        setLoading(false);
      }
    }
  };
  
  const handleLoadStart = () => {
    setLoading(true);
    onLoadStart?.();
  };
  
  const handleLoadEnd = async () => {
    if (!isMounted.current) return;
    
    setLoading(false);
    setDisplayThumbnail(false);
    
    // Cache the image if enabled
    if (enableCache && typeof source === 'object' && 'uri' in source) {
      // In production, you would fetch and cache the actual image data
      // For now, we'll just store the URI
      await cacheManager.cacheImage(source.uri, source.uri, 100000); // Estimate 100KB
    }
    
    onLoadEnd?.();
  };
  
  const handleError = () => {
    if (!isMounted.current) return;
    
    setLoading(false);
    setError(true);
    
    if (fallbackSource) {
      setImageSource(fallbackSource);
      setError(false);
    }
    
    onError?.();
  };
  
  const imageStyle = useMemo(() => {
    return StyleSheet.flatten([style]);
  }, [style]);
  
  const containerStyle = useMemo(() => {
    const flatStyle = StyleSheet.flatten(style);
    return {
      width: flatStyle.width,
      height: flatStyle.height,
      backgroundColor: placeholder ? placeholderColor : undefined,
    };
  }, [style, placeholder, placeholderColor]);
  
  // Optimize image loading based on priority
  const getImageProps = useMemo(() => {
    const imageProps: any = {
      style: imageStyle,
      source: imageSource,
      onLoadStart: handleLoadStart,
      onLoadEnd: handleLoadEnd,
      onError: handleError,
    };
    
    if (Platform.OS === 'android') {
      // Android-specific optimizations
      imageProps.fadeDuration = priority === 'high' ? 0 : 300;
      imageProps.resizeMethod = priority === 'high' ? 'resize' : 'auto';
    }
    
    if (blurRadius && displayThumbnail) {
      imageProps.blurRadius = blurRadius;
    }
    
    return imageProps;
  }, [imageSource, priority, displayThumbnail, blurRadius]);
  
  // Check if we're using expo-image or React Native Image
  const isExpoImage = Image !== RNImage;
  
  const renderImage = () => {
    if (isExpoImage) {
      // Use expo-image specific props
      return (
        <Image
          {...getImageProps}
          contentFit={contentFit}
          placeholder={placeholderValue}
          cachePolicy={cachePolicy}
          priority={priority}
          recyclingKey={recyclingKey}
          allowDownscaling={allowDownscaling}
          transition={transition}
        />
      );
    } else {
      // Use React Native Image with resizeMode
      const resizeMode = 
        contentFit === 'cover' ? 'cover' :
        contentFit === 'contain' ? 'contain' :
        contentFit === 'fill' ? 'stretch' :
        contentFit === 'none' ? 'center' :
        'contain';
      
      return (
        <RNImage
          {...getImageProps}
          resizeMode={resizeMode}
        />
      );
    }
  };
  
  return (
    <View style={containerStyle}>
      {displayThumbnail && thumbnailSource && (
        <RNImage
          source={thumbnailSource}
          style={[styles.absoluteFill, imageStyle as ImageStyle]}
          blurRadius={blurRadius || 10}
          resizeMode="cover"
        />
      )}
      
      {renderImage()}
      
      {loading && placeholder && (
        <View style={[styles.absoluteFill, styles.placeholder]}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Export cache manager for direct access if needed
export { ImageCacheManager };

// Export utility to preload images
export const preloadImages = async (urls: string[]) => {
  const cacheManager = ImageCacheManager.getInstance();
  
  const promises = urls.map(async (url) => {
    try {
      // Use RNImage.prefetch which works for both
      await RNImage.prefetch(url);
      // In production, you would fetch and cache the actual image data
      await cacheManager.cacheImage(url, url, 100000); // Estimate 100KB
    } catch (error) {
      // Silently ignore prefetch errors
    }
  });
  
  await Promise.all(promises);
};

// Export utility to clear image cache
export const clearImageCache = async () => {
  const cacheManager = ImageCacheManager.getInstance();
  await cacheManager.clearCache();
};

// Export utility to get cache info
export const getImageCacheInfo = () => {
  const cacheManager = ImageCacheManager.getInstance();
  return cacheManager.getCacheInfo();
};

const styles = StyleSheet.create({
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default OptimizedImage;
