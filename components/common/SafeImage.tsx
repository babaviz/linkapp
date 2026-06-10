/**
 * SafeImage Component
 * 
 * An Image component that gracefully handles loading failures by showing a fallback.
 * Specifically designed for profile pictures in the Date Mi feature.
 */

import React, { useState } from 'react';
import { Image, ImageProps, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const FALLBACK_PROFILE_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE2MCIgcj0iNjAiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyMCAzMDBDMTIwIDI2MC44IDI2MC44IDI0MCAzMDAgMjQwQzMzOS4yIDI0MCAzNjAgMjYwLjggMzYwIDMwMEgxMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';

interface SafeImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  source: { uri: string } | number;
  fallbackSource?: { uri: string } | number;
  showPlaceholder?: boolean;
  placeholderIcon?: keyof typeof MaterialIcons.glyphMap;
  placeholderText?: string;
  onImageLoad?: () => void;
  onImageError?: (error: any) => void;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  source,
  fallbackSource,
  showPlaceholder = true,
  placeholderIcon = 'person',
  placeholderText = 'No Image',
  style,
  onImageLoad,
  onImageError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSource, setCurrentSource] = useState(source);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onImageLoad?.();
  };

  const handleImageError = (error: any) => {
    
    setIsLoading(false);
    
    // Try fallback source if available and not already tried
    if (fallbackSource && currentSource !== fallbackSource) {
      setCurrentSource(fallbackSource);
      return;
    }
    
    // If no fallback or fallback also failed, try the default avatar
    const fallbackUri = { uri: FALLBACK_PROFILE_AVATAR };
    if (typeof currentSource === 'object' && 'uri' in currentSource && currentSource.uri !== FALLBACK_PROFILE_AVATAR) {
      setCurrentSource(fallbackUri);
      return;
    }
    
    // All sources failed, show placeholder
    setHasError(true);
    onImageError?.(error);
  };

  const imageStyles = Array.isArray(style) ? style : [style];
  const containerStyle = StyleSheet.flatten(imageStyles) || {};

  // If all images failed and we should show placeholder
  if (hasError && showPlaceholder) {
    return (
      <View style={[styles.placeholder, containerStyle]}>
        <MaterialIcons 
          name={placeholderIcon} 
          size={(containerStyle.width as number) * 0.4 || 40} 
          color="#9CA3AF" 
        />
        {placeholderText && (
          <Text style={[styles.placeholderText, { 
            fontSize: (containerStyle.width as number) * 0.1 || 12 
          }]}>
            {placeholderText}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={currentSource}
      style={style}
      onLoad={handleImageLoad}
      onError={handleImageError}
      onLoadStart={() => setIsLoading(true)}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SafeImage;
