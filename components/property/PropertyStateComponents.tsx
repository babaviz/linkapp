/**
 * PropertyStateComponents - Comprehensive loading, error, and empty state components
 * For property-related operations with proper UI feedback
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');

// Property List Skeleton Loader
export const PropertyListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.skeletonContainer}>
    {Array.from({ length: count }, (_, index) => (
      <View key={index} style={styles.propertySkeletonItem}>
        <View style={styles.skeletonImagePlaceholder} />
        <View style={styles.skeletonContent}>
          <View style={[styles.skeletonLine, styles.skeletonTitle]} />
          <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
          <View style={styles.skeletonRow}>
            <View style={[styles.skeletonLine, styles.skeletonPrice]} />
            <View style={[styles.skeletonLine, styles.skeletonLocation]} />
          </View>
          <View style={styles.skeletonTags}>
            <View style={styles.skeletonTag} />
            <View style={styles.skeletonTag} />
            <View style={styles.skeletonTag} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

// Property Details Skeleton Loader
export const PropertyDetailsSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {/* Image Gallery Skeleton */}
    <View style={styles.gallerySkeletonContainer}>
      <View style={styles.skeletonMainImage} />
      <View style={styles.skeletonImageThumbnails}>
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={styles.skeletonThumbnail} />
        ))}
      </View>
    </View>
    
    {/* Content Skeleton */}
    <View style={styles.skeletonDetailsContent}>
      <View style={[styles.skeletonLine, styles.skeletonMainTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonPrice]} />
      <View style={[styles.skeletonLine, styles.skeletonLocation]} />
      
      {/* Features skeleton */}
      <View style={styles.skeletonFeatures}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={styles.skeletonFeature} />
        ))}
      </View>
      
      {/* Description skeleton */}
      <View style={styles.skeletonDescriptionContainer}>
        <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
        {Array.from({ length: 4 }, (_, index) => (
          <View key={index} style={[styles.skeletonLine, styles.skeletonDescriptionLine]} />
        ))}
      </View>
    </View>
  </View>
);

// Form Skeleton Loader
export const PropertyFormSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    {Array.from({ length: 6 }, (_, sectionIndex) => (
      <View key={sectionIndex} style={styles.skeletonFormSection}>
        <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
        {Array.from({ length: 2 }, (_, fieldIndex) => (
          <View key={fieldIndex} style={styles.skeletonFormField}>
            <View style={[styles.skeletonLine, styles.skeletonFieldLabel]} />
            <View style={styles.skeletonFieldInput} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

// Generic Loading Component
export const PropertyLoadingSpinner: React.FC<{ message?: string; size?: 'small' | 'large' }> = ({ 
  message = 'Loading properties...', 
  size = 'large' 
}) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator 
      size={size} 
      color={colors.primary[600]} 
      style={styles.loadingSpinner}
    />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// Error State Component
export const PropertyErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  showRetry?: boolean;
  type?: 'network' | 'generic' | 'notFound' | 'permission';
}> = ({ 
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  showRetry = true,
  type = 'generic'
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: 'wifi-off',
          defaultTitle: 'Connection Error',
          defaultMessage: 'Please check your internet connection and try again.',
          iconColor: colors.warning[500]
        };
      case 'notFound':
        return {
          icon: 'search',
          defaultTitle: 'No Properties Found',
          defaultMessage: 'We couldn\'t find any properties matching your criteria.',
          iconColor: colors.info[500]
        };
      case 'permission':
        return {
          icon: 'lock',
          defaultTitle: 'Access Denied',
          defaultMessage: 'You don\'t have permission to access this content.',
          iconColor: colors.error[500]
        };
      default:
        return {
          icon: 'error-outline',
          defaultTitle: 'Something went wrong',
          defaultMessage: 'Please try again. If it keeps happening, restart the app.',
          iconColor: colors.error[500]
        };
    }
  };

  const errorConfig = getErrorConfig();

  return (
    <View style={styles.errorContainer}>
      <Icon 
        name={errorConfig.icon as any} 
        size={64} 
        color={errorConfig.iconColor}
        style={styles.errorIcon}
      />
      <Text style={styles.errorTitle}>
        {title || errorConfig.defaultTitle}
      </Text>
      <Text style={styles.errorMessage}>
        {message || errorConfig.defaultMessage}
      </Text>
      {showRetry && onRetry && (
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Icon name="refresh" size={20} color={colors.white} />
          <Text style={styles.retryButtonText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Empty State Component
export const PropertyEmptyState: React.FC<{
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  showAction?: boolean;
  type?: 'noProperties' | 'noFavorites' | 'noInquiries' | 'noResults';
}> = ({ 
  title,
  message,
  actionText = 'Get Started',
  onAction,
  showAction = false,
  type = 'noProperties'
}) => {
  const getEmptyConfig = () => {
    switch (type) {
      case 'noFavorites':
        return {
          icon: 'favorite-border',
          defaultTitle: 'No Saved Properties',
          defaultMessage: 'Properties you save will appear here for easy access.',
          iconColor: colors.primary[400]
        };
      case 'noInquiries':
        return {
          icon: 'inbox',
          defaultTitle: 'No Inquiries Yet',
          defaultMessage: 'Property inquiries will appear here when you receive them.',
          iconColor: colors.info[400]
        };
      case 'noResults':
        return {
          icon: 'search',
          defaultTitle: 'No Results Found',
          defaultMessage: 'Try adjusting your search criteria or filters.',
          iconColor: colors.secondary[400]
        };
      default:
        return {
          icon: 'home',
          defaultTitle: 'No Properties Listed',
          defaultMessage: 'Start by adding your first property listing.',
          iconColor: colors.primary[400]
        };
    }
  };

  const emptyConfig = getEmptyConfig();

  return (
    <View style={styles.emptyContainer}>
      <Icon 
        name={emptyConfig.icon as any} 
        size={80} 
        color={emptyConfig.iconColor}
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyTitle}>
        {title || emptyConfig.defaultTitle}
      </Text>
      <Text style={styles.emptyMessage}>
        {message || emptyConfig.defaultMessage}
      </Text>
      {showAction && onAction && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Search Loading State
export const PropertySearchLoading: React.FC<{ query?: string }> = ({ query }) => (
  <View style={styles.searchLoadingContainer}>
    <ActivityIndicator size="large" color={colors.primary[600]} />
    <Text style={styles.searchLoadingTitle}>Searching Properties...</Text>
    {query && (
      <Text style={styles.searchLoadingQuery}>"{query}"</Text>
    )}
  </View>
);

// Submission Loading Overlay
export const PropertySubmissionLoading: React.FC<{ 
  visible: boolean; 
  message?: string;
  type?: 'creating' | 'updating' | 'deleting' | 'uploading';
}> = ({ visible, message, type = 'creating' }) => {
  if (!visible) return null;

  const getLoadingMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'updating': return 'Updating property...';
      case 'deleting': return 'Deleting property...';
      case 'uploading': return 'Uploading images...';
      default: return 'Creating property...';
    }
  };

  return (
    <View style={styles.submissionOverlay}>
      <View style={styles.submissionContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.submissionText}>{getLoadingMessage()}</Text>
      </View>
    </View>
  );
};

// Offline State Component
export const PropertyOfflineState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <View style={styles.offlineContainer}>
    <Icon name="cloud-off" size={48} color={colors.secondary[400]} />
    <Text style={styles.offlineTitle}>You're offline</Text>
    <Text style={styles.offlineMessage}>
      Check your internet connection to view properties.
    </Text>
    {onRetry && (
      <TouchableOpacity style={styles.offlineRetryButton} onPress={onRetry}>
        <Text style={styles.offlineRetryText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    padding: 16,
  },
  propertySkeletonItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
  },
  skeletonImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.secondary[200],
    marginRight: 16,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.secondary[200],
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 12,
    width: '60%',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skeletonPrice: {
    height: 14,
    width: '30%',
  },
  skeletonLocation: {
    height: 12,
    width: '40%',
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTag: {
    width: 60,
    height: 24,
    backgroundColor: colors.secondary[200],
    borderRadius: 12,
  },
  
  // Gallery Skeleton
  gallerySkeletonContainer: {
    marginBottom: 20,
  },
  skeletonMainImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.secondary[200],
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonImageThumbnails: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonThumbnail: {
    width: 60,
    height: 60,
    backgroundColor: colors.secondary[200],
    borderRadius: 8,
  },
  
  // Details Skeleton
  skeletonDetailsContent: {
    padding: 16,
  },
  skeletonMainTitle: {
    height: 24,
    width: '70%',
    marginBottom: 16,
  },
  skeletonSectionTitle: {
    height: 18,
    width: '40%',
    marginBottom: 12,
  },
  skeletonFeatures: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 20,
  },
  skeletonFeature: {
    width: 80,
    height: 40,
    backgroundColor: colors.secondary[200],
    borderRadius: 8,
  },
  skeletonDescriptionContainer: {
    marginTop: 20,
  },
  skeletonDescriptionLine: {
    height: 12,
    marginBottom: 6,
  },
  
  // Form Skeleton
  skeletonFormSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  skeletonFormField: {
    marginBottom: 20,
  },
  skeletonFieldLabel: {
    height: 14,
    width: '30%',
    marginBottom: 8,
  },
  skeletonFieldInput: {
    height: 44,
    backgroundColor: colors.secondary[200],
    borderRadius: 8,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  
  // Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  actionButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  
  // Search Loading Styles
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  searchLoadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 20,
    marginBottom: 8,
  },
  searchLoadingQuery: {
    fontSize: 16,
    color: colors.primary[600],
    fontStyle: 'italic',
  },
  
  // Submission Loading Styles
  submissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  submissionContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submissionText: {
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Offline State Styles
  offlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.secondary[50],
    borderRadius: 12,
    margin: 16,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  offlineMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  offlineRetryButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  offlineRetryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

