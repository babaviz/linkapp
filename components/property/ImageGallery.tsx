/**
 * ImageGallery Component
 * Displays property images with swipe functionality and indicators
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Text,
  StyleSheet
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface ImageGalleryProps {
  images: string[];
  onImagePress?: (imageIndex: number) => void;
  height?: number;
  showIndicators?: boolean;
  style?: any;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImagePress,
  height = 200,
  showIndicators = true,
  style
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle scroll to update current index
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const imageWidth = screenWidth - 32; // Account for margins
    const index = Math.round(contentOffset.x / imageWidth);
    setCurrentIndex(index);
  };

  // Handle image press
  const handleImagePress = (index: number) => {
    onImagePress?.(index);
  };

  // Fallback for no images
  if (!images || images.length === 0) {
    return (
      <View 
        style={[styles.fallbackContainer, { height }, style]}
      >
        <Text style={styles.fallbackIcon}>🏠</Text>
        <Text style={styles.fallbackText}>No photos available</Text>
      </View>
    );
  }

  // Single image - no need for scroll
  if (images.length === 1) {
    return (
      <TouchableOpacity
        onPress={() => handleImagePress(0)}
        activeOpacity={0.8}
        style={[{ height }, style]}
      >
        <Image
          source={{ uri: images[0] }}
          style={styles.fullImage}
          resizeMode="cover"
          defaultSource={require('../../assets/icon.png')} // Fallback image
        />
      </TouchableOpacity>
    );
  }

  // Multiple images - scrollable gallery
  return (
    <View style={[{ height }, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {images.map((imageUri, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleImagePress(index)}
            activeOpacity={0.8}
            style={{ width: screenWidth - 32, height }}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.fullImage}
              resizeMode="cover"
              onError={() => {
                
              }}
              defaultSource={require('../../assets/icon.png')} // Fallback image
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Image Indicators */}
      {showIndicators && images.length > 1 && (
        <View style={styles.indicatorsContainer}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                const imageWidth = screenWidth - 32;
                scrollViewRef.current?.scrollTo({
                  x: index * imageWidth,
                  animated: true
                });
                setCurrentIndex(index);
              }}
              style={[
                styles.indicator,
                index === currentIndex ? styles.activeIndicator : styles.inactiveIndicator
              ]}
            />
          ))}
        </View>
      )}

      {/* Image Counter (Alternative to dots for many images) */}
      {images.length > 5 && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  fallbackText: {
    color: '#6B7280',
    fontSize: 14,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  indicatorsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  inactiveIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  counterContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ImageGallery;
