/**
 * FullScreenImageGallery Component
 * Full-screen modal image gallery with swipe navigation
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FullScreenImageGalleryProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

const FullScreenImageGallery: React.FC<FullScreenImageGalleryProps> = ({
  images,
  initialIndex = 0,
  visible,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle scroll to update current index
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / screenWidth);
    setCurrentIndex(index);
  };

  // Go to specific image
  const goToImage = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
    setCurrentIndex(index);
  };

  // Navigate to previous image (wrap from first to last)
  const goToPrevious = () => {
    if (!images || images.length === 0) {
      return;
    }
    const nextIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    goToImage(nextIndex);
  };

  // Navigate to next image (wrap from last to first)
  const goToNext = () => {
    if (!images || images.length === 0) {
      return;
    }
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    goToImage(nextIndex);
  };

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * screenWidth,
          animated: false
        });
        setCurrentIndex(initialIndex);
      }, 100);
    }
  }, [visible, initialIndex]);

  if (!visible || !images || images.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar hidden={true} />
      <View style={styles.style1}>
        {/* Header */}
        <SafeAreaView>
          <View style={styles.style2}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.style3}
            >
              <Text style={styles.style4}>✕</Text>
            </TouchableOpacity>

            {/* Image Counter */}
            <Text style={styles.style5}>
              {currentIndex + 1} of {images.length}
            </Text>

            {/* Spacer for symmetry */}
            <View style={styles.style6} />
          </View>
        </SafeAreaView>

        {/* Image Gallery */}
        <View style={styles.style7}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.style8}
          >
            {images.map((imageUri, index) => (
              <View key={index} style={{ width: screenWidth, height: '100%' }}>
                <View style={styles.style9}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: screenWidth,
                      height: screenHeight * 0.7
                    }}
                    resizeMode="contain"
                    onError={() => {
                      
                    }}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Navigation Arrows (if more than one image) */}
          {images.length > 1 && (
            <>
              {/* Previous Button */}
              {currentIndex > 0 && (
                <TouchableOpacity
                  onPress={goToPrevious}
                  style={[styles.style10, { marginTop: -24 }]}
                >
                  <Text style={styles.style11}>‹</Text>
                </TouchableOpacity>
              )}

              {/* Next Button */}
              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  onPress={goToNext}
                  style={[styles.style12, { marginTop: -24 }]}
                >
                  <Text style={styles.style11}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Thumbnail Strip (for multiple images) */}
        {images.length > 1 && (
          <SafeAreaView>
            <View style={styles.style13}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  alignItems: 'center'
                }}
              >
                {images.map((imageUri, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => goToImage(index)}
                    style={[
                      styles.thumbnailButton,
                      index === currentIndex ? styles.activeThumbnail : styles.inactiveThumbnail
                    ]}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.style14}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        )}

        {/* Page Indicators (for few images) */}
        {images.length > 1 && images.length <= 5 && (
          <View style={styles.style15}>
            {images.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => goToImage(index)}
                style={[
                  styles.pageIndicator,
                  index === currentIndex ? styles.activePageIndicator : styles.inactivePageIndicator
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#000000'
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 8
},
  style3: {
  'width': 40,
  'height': 40,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style4: {
  'color': '#FFFFFF',
  'fontSize': 24
},
  style5: {
  'color': '#FFFFFF',
  'fontSize': 16,
  'fontWeight': '500'
},
  style6: {
  'width': 40,
  'height': 40
},
  style7: {
  'flex': 1,
  'justifyContent': 'center'
},
  style8: {
  'flex': 1
},
  style9: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style10: {
  'position': 'absolute',
  'left': 16,
  'width': 48,
  'height': 48,
  'backgroundColor': '#000000',
  'opacity': 0.5,
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style11: {
  'color': '#FFFFFF',
  'fontSize': 20
},
  style12: {
  'position': 'absolute',
  'right': 16,
  'width': 48,
  'height': 48,
  'backgroundColor': '#000000',
  'opacity': 0.5,
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style13: {
  'paddingBottom': 16
},
  style14: {
  'width': 48,
  'height': 48,
  'borderRadius': 4
},
  style15: {
  'position': 'absolute',
  'left': 0,
  'right': 0,
  'flexDirection': 'row',
  'justifyContent': 'center'
},
  thumbnailButton: {
    marginRight: 8,
    borderRadius: 4,
  },
  activeThumbnail: {
    borderWidth: 2,
    borderColor: 'white',
  },
  inactiveThumbnail: {
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  pageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activePageIndicator: {
    backgroundColor: 'white',
  },
  inactivePageIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default FullScreenImageGallery;
