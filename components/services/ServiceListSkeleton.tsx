import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SkeletonCard } from '../common/SkeletonLoader';
import { spacing } from '../../utils/responsive';

interface ServiceListSkeletonProps {
  count?: number;
  containerStyle?: ViewStyle;
  cardStyle?: ViewStyle;
}

export const ServiceListSkeleton = React.memo<ServiceListSkeletonProps>(
  ({ count = 5, containerStyle, cardStyle }) => {
    return (
      <View style={[{ padding: spacing.lg }, containerStyle]}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard
            key={`service-skeleton-${index}`}
            showAvatar={true}
            showImage={false}
            lines={3}
            style={{
              marginBottom: spacing.md,
              ...(cardStyle ?? {}),
            }}
          />
        ))}
      </View>
    );
  }
);

ServiceListSkeleton.displayName = 'ServiceListSkeleton';

export default ServiceListSkeleton;

