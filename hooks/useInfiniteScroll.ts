import { useState, useCallback, useRef } from 'react';
import { getUserFacingErrorMessage } from '../utils/userFacingError';

interface UseInfiniteScrollProps<T> {
  fetchData: (page: number) => Promise<{
    data: T[];
    hasMore: boolean;
    totalResults: number;
  }>;
  initialData?: T[];
  pageSize?: number;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
  totalResults: number;
}

export function useInfiniteScroll<T>({
  fetchData,
  initialData = [],
  pageSize = 20,
}: UseInfiniteScrollProps<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  
  const currentPage = useRef(1);
  const isLoadingRef = useRef(false);

  const fetchPage = useCallback(async (page: number, isRefresh = false) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setError(null);
    
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await fetchData(page);
      
      setData(prevData => {
        if (isRefresh || page === 1) {
          return result.data;
        } else {
          return [...prevData, ...result.data];
        }
      });
      
      setHasMore(result.hasMore);
      setTotalResults(result.totalResults);
      currentPage.current = page;
      
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'load results' }));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [fetchData]);

  const refresh = useCallback(async () => {
    currentPage.current = 1;
    setHasMore(true);
    await fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoadingRef.current) {
      await fetchPage(currentPage.current + 1);
    }
  }, [hasMore, fetchPage]);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setIsLoadingMore(false);
    setHasMore(true);
    setError(null);
    setTotalResults(0);
    currentPage.current = 1;
    isLoadingRef.current = false;
  }, [initialData]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    reset,
    totalResults,
  };
}

/**
 * Hook for handling FlatList onEndReached with debouncing
 */
export function useInfiniteScrollFlatList<T>(infiniteScroll: UseInfiniteScrollReturn<T>) {
  const onEndReachedCalledDuringMomentum = useRef(false);

  const handleEndReached = useCallback(() => {
    if (!onEndReachedCalledDuringMomentum.current && infiniteScroll.hasMore && !infiniteScroll.isLoadingMore) {
      infiniteScroll.loadMore();
      onEndReachedCalledDuringMomentum.current = true;
    }
  }, [infiniteScroll]);

  const handleMomentumScrollBegin = useCallback(() => {
    onEndReachedCalledDuringMomentum.current = false;
  }, []);

  return {
    onEndReached: handleEndReached,
    onMomentumScrollBegin: handleMomentumScrollBegin,
    onEndReachedThreshold: 0.1,
  };
}
