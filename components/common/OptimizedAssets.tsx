import React, { useState, useCallback, useEffect, memo } from 'react';
import { Image as RNImage, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PerformanceConfig } from '../../config/performance.config';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'high' | 'normal' | 'low';
  placeholder?: string;
  transition?: number;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export const OptimizedImage = memo(({
  source,
  style,
  contentFit = 'cover',
  priority = 'normal',
  placeholder,
  transition = 200,
  cachePolicy = PerformanceConfig.images.cachePolicy as any,
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [imageError, setImageError] = useState(false);

  const handleError = useCallback((error: any) => {
    setImageError(true);
    onError?.(error);
  }, [onError]);

  const handleLoad = useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  if (imageError) {
    return (
      <View style={[styles.fallback, style]}>
        <RNImage 
          source={require('../../assets/icon.png')} 
          style={styles.fallbackImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      priority={priority}
      placeholder={placeholder}
      transition={transition}
      cachePolicy={cachePolicy}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export const LazyImage = memo(({ 
  visible = true,
  ...props 
}: OptimizedImageProps & { visible?: boolean }) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (visible && !shouldLoad) {
      const timer = setTimeout(() => setShouldLoad(true), 50);
      return () => clearTimeout(timer);
    }
  }, [visible, shouldLoad]);

  if (!shouldLoad) {
    return <View style={props.style} />;
  }

  return <OptimizedImage {...props} />;
});

LazyImage.displayName = 'LazyImage';

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackImage: {
    width: '50%',
    height: '50%',
    opacity: 0.3,
  },
});
