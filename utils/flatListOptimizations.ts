import { FlatListProps, Platform } from 'react-native';
import { InteractionManager } from 'react-native';

// Optimized FlatList configuration for maximum performance
export const getOptimizedFlatListProps = <T>(customProps?: Partial<FlatListProps<T>>): Partial<FlatListProps<T>> => {
  const isIOS = Platform.OS === 'ios';
  
  return {
    // Performance optimizations
    removeClippedSubviews: Platform.OS === 'android', // Only for Android, can cause issues on iOS
    maxToRenderPerBatch: 5, // Reduce from default 10 to render less items per batch
    updateCellsBatchingPeriod: 50, // Increase batching period
    initialNumToRender: 10, // Initial items to render
    windowSize: 10, // Number of screens to keep in memory
    
    // Scroll optimizations
    scrollEventThrottle: 16, // 60 FPS
    decelerationRate: isIOS ? 'normal' : 0.985, // Better scroll feel
    
    // Memory optimizations
    maintainVisibleContentPosition: undefined, // Disable to save memory
    
    // Layout optimizations
    getItemLayout: undefined, // Should be provided by consumer for fixed-size items
    
    // Keyboard handling
    keyboardShouldPersistTaps: 'handled',
    keyboardDismissMode: 'on-drag',
    
    // Additional optimizations
    directionalLockEnabled: true,
    automaticallyAdjustContentInsets: false,
    automaticallyAdjustKeyboardInsets: false,
    showsVerticalScrollIndicator: false,
    
    // Merge with custom props
    ...customProps,
  };
};

// Helper for fixed-size items
export const getItemLayout = (itemHeight: number, separatorHeight: number = 0) => (
  data: any,
  index: number
) => ({
  length: itemHeight,
  offset: (itemHeight + separatorHeight) * index,
  index,
});

// Defer heavy operations until after interactions
export const runAfterInteractions = (callback: () => void) => {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
};

// Optimized keyExtractor
export const defaultKeyExtractor = <T extends { id: string | number }>(item: T) => String(item.id);

// Helper to prevent unnecessary re-renders in list items
export const areEqual = (prevProps: any, nextProps: any) => {
  // Custom comparison logic - customize based on your needs
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.updated_at !== nextProps.item.updated_at) return false;
  if (prevProps.index !== nextProps.index) return false;
  
  // Add more comparisons as needed
  return true;
};

// Batch update helper
export class BatchUpdateManager {
  private updates: any[] = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private batchSize: number;
  private delay: number;
  private onBatchUpdate: (updates: any[]) => void;

  constructor(onBatchUpdate: (updates: any[]) => void, batchSize = 10, delay = 100) {
    this.onBatchUpdate = onBatchUpdate;
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(update: any) {
    this.updates.push(update);
    
    if (this.updates.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.updates.length > 0) {
      const updates = [...this.updates];
      this.updates = [];
      this.onBatchUpdate(updates);
    }
  }

  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    this.updates = [];
  }
}

// ScrollView optimizations for contentInsetAdjustmentBehavior
export const getOptimizedScrollViewProps = () => ({
  contentInsetAdjustmentBehavior: 'automatic' as const,
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  scrollEventThrottle: 16,
  decelerationRate: Platform.OS === 'ios' ? 'normal' : 0.985,
  directionalLockEnabled: true,
  automaticallyAdjustContentInsets: false,
  bounces: true,
  overScrollMode: 'auto' as const,
});
