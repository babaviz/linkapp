import React, { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  ListRenderItem,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationHistoryItem } from '../../types/notifications';
import NotificationCard from './NotificationCard';
import {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationListFooter,
  NotificationSkeletonList,
} from './NotificationStates';
import { colors, spacing } from '../../theme';

interface NotificationListProps {
  notifications: NotificationHistoryItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onNotificationPress: (notification: NotificationHistoryItem) => void;
  onMarkAsRead: (notification: NotificationHistoryItem) => void;
  onDeleteNotification: (notification: NotificationHistoryItem) => void;
}

const CARD_HEIGHT = 90;
const CARD_MARGIN = 10;
const ITEM_HEIGHT = CARD_HEIGHT + CARD_MARGIN;

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  refreshing,
  error,
  hasMore,
  onRefresh,
  onLoadMore,
  onNotificationPress,
  onMarkAsRead,
  onDeleteNotification,
}) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      try {
        await onLoadMore();
      } finally {
        setLoadingMore(false);
      }
    }
  }, [hasMore, loadingMore, loading, onLoadMore]);

  const MemoizedNotificationCard = useMemo(() => React.memo(NotificationCard), []);

  const renderItem: ListRenderItem<NotificationHistoryItem> = useCallback(
    ({ item }) => (
      <MemoizedNotificationCard
        key={`${item.id}-${item.isRead}`}
        notification={item}
        onPress={onNotificationPress}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDeleteNotification}
      />
    ),
    [MemoizedNotificationCard, onNotificationPress, onMarkAsRead, onDeleteNotification]
  );

  const keyExtractor = useCallback(
    (item: NotificationHistoryItem, index: number) => `${item.id}-${index}`,
    []
  );

  const renderListFooter = useCallback(
    () => <NotificationListFooter loading={loadingMore} />,
    [loadingMore]
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: spacing[2],
      paddingBottom: insets.bottom + spacing[6],
      flexGrow: 1,
    }),
    [insets.bottom]
  );

  if (loading && notifications.length === 0) {
    return <NotificationSkeletonList count={6} />;
  }

  if (error && notifications.length === 0) {
    return <NotificationErrorState error={error} onRetry={onRefresh} />;
  }

  if (!loading && notifications.length === 0) {
    return <NotificationEmptyState onRefresh={onRefresh} />;
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={renderListFooter}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressBackgroundColor={colors.card}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
      style={styles.list}
      removeClippedSubviews
      maxToRenderPerBatch={screenWidth > 768 ? 15 : 10}
      windowSize={screenWidth > 768 ? 15 : 10}
      initialNumToRender={screenWidth > 768 ? 12 : 8}
      getItemLayout={getItemLayout}
      updateCellsBatchingPeriod={100}
      keyboardShouldPersistTaps="handled"
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.secondary[100],
  },
});

export default NotificationList;
