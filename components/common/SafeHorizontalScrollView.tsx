import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

interface SafeHorizontalScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
}

export const SafeHorizontalScrollView: React.FC<SafeHorizontalScrollViewProps> = ({
  children,
  ...props
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
      scrollEventThrottle={16}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

export default SafeHorizontalScrollView;
