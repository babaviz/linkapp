import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from '../common/SkeletonLoader';
import { colors } from '../../theme';
import { useAppSelector } from '../../redux/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PropertyListSkeletonProps {
  count?: number;
  viewMode?: 'list' | 'grid';
}

const PropertyListSkeleton: React.FC<PropertyListSkeletonProps> = ({ 
  count = 5, 
  viewMode = 'list' 
}) => {
  const { theme } = useAppSelector(state => state.user);
  const isDarkMode = theme === 'dark';

  const renderListSkeleton = () => (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.cardContainer,
            { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface },
          ]}
        >
          {/* Image skeleton */}
          <SkeletonLoader
            width="100%"
            height={200}
            borderRadius={0}
            shimmerColors={isDarkMode 
              ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
              : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
            }
          />
          
          <View style={styles.contentContainer}>
            {/* Price skeleton */}
            <View style={styles.priceRow}>
              <SkeletonLoader
                width={100}
                height={24}
                borderRadius={4}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
              <SkeletonLoader
                width={80}
                height={20}
                borderRadius={12}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
            </View>
            
            {/* Title skeleton */}
            <SkeletonLoader
              width="85%"
              height={20}
              borderRadius={4}
              style={{ marginBottom: 8 }}
              shimmerColors={isDarkMode 
                ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
              }
            />
            
            {/* Location skeleton */}
            <View style={styles.locationRow}>
              <SkeletonLoader
                width={16}
                height={16}
                borderRadius={8}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
              <SkeletonLoader
                width="60%"
                height={16}
                borderRadius={4}
                style={{ marginLeft: 8 }}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
            </View>
            
            {/* Features skeleton */}
            <View style={styles.featuresRow}>
              {[1, 2, 3].map((item) => (
                <SkeletonLoader
                  key={item}
                  width={60}
                  height={28}
                  borderRadius={8}
                  shimmerColors={isDarkMode 
                    ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                    : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                  }
                />
              ))}
            </View>
            
            {/* Footer skeleton */}
            <View style={styles.footerRow}>
              <SkeletonLoader
                width={80}
                height={14}
                borderRadius={4}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
              <SkeletonLoader
                width={100}
                height={14}
                borderRadius={4}
                shimmerColors={isDarkMode 
                  ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                  : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
                }
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderGridSkeleton = () => (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.gridCardContainer,
            { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface },
          ]}
        >
          {/* Image skeleton */}
          <SkeletonLoader
            width="100%"
            height={140}
            borderRadius={0}
            shimmerColors={isDarkMode 
              ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
              : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
            }
          />
          
          <View style={styles.gridContentContainer}>
            {/* Price skeleton */}
            <SkeletonLoader
              width={80}
              height={18}
              borderRadius={4}
              style={{ marginBottom: 6 }}
              shimmerColors={isDarkMode 
                ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
              }
            />
            
            {/* Title skeleton */}
            <SkeletonLoader
              width="90%"
              height={14}
              borderRadius={4}
              style={{ marginBottom: 6 }}
              shimmerColors={isDarkMode 
                ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
              }
            />
            
            {/* Location skeleton */}
            <SkeletonLoader
              width="70%"
              height={12}
              borderRadius={4}
              shimmerColors={isDarkMode 
                ? ['#2A2A2A', '#3A3A3A', '#2A2A2A'] 
                : ['#E0E0E0', '#F5F5F5', '#E0E0E0']
              }
            />
          </View>
        </View>
      ))}
    </View>
  );

  return viewMode === 'grid' ? renderGridSkeleton() : renderListSkeleton();
};

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentContainer: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  gridCardContainer: {
    width: (SCREEN_WIDTH - 36) / 2,
    borderRadius: 12,
    marginHorizontal: 6,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridContentContainer: {
    padding: 10,
  },
});

export default React.memo(PropertyListSkeleton);
