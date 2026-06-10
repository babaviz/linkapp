import { useState, useEffect, useCallback } from 'react';
import { categoryCountService, CategoryCountCache } from '../services/categoryCountService';
import { getJobCategoryVariants } from '../utils/jobCategoryMapping';

interface UseCategoryCountsReturn {
  counts: CategoryCountCache;
  isLoading: boolean;
  error: string | null;
  refreshCounts: () => Promise<void>;
  getCount: (category: string) => number;
  formatCount: (category: string) => string;
}

export function usePropertyCategoryCounts(): UseCategoryCountsReturn {
  const [counts, setCounts] = useState<CategoryCountCache>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryCountService.getPropertyCountsByCategory();
      setCounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counts');
      setCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const getCount = useCallback((category: string): number => {
    return counts[category] || 0;
  }, [counts]);

  const formatCount = useCallback((category: string): string => {
    const count = counts[category] || 0;
    if (count === 0) return 'No listings';
    if (count === 1) return '1 property';
    return `${count}+ properties`;
  }, [counts]);

  return {
    counts,
    isLoading,
    error,
    refreshCounts: fetchCounts,
    getCount,
    formatCount
  };
}

export function useJobCategoryCounts(): UseCategoryCountsReturn {
  const [counts, setCounts] = useState<CategoryCountCache>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryCountService.getJobCountsByCategory();
      setCounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counts');
      setCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const getCount = useCallback((category: string): number => {
    const variants = getJobCategoryVariants(category);
    return variants.reduce((total, variant) => total + (counts[variant] || 0), 0);
  }, [counts]);

  const formatCount = useCallback((category: string): string => {
    const count = getCount(category);
    if (count === 0) return 'No Jobs';
    if (count === 1) return '1 Job';
    return `${count}+ Jobs`;
  }, [getCount]);

  return {
    counts,
    isLoading,
    error,
    refreshCounts: fetchCounts,
    getCount,
    formatCount
  };
}

export function useServiceCategoryCounts(): UseCategoryCountsReturn {
  const [counts, setCounts] = useState<CategoryCountCache>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryCountService.getServiceCountsByCategory();
      setCounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counts');
      setCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const getCount = useCallback((category: string): number => {
    return counts[category] || 0;
  }, [counts]);

  const formatCount = useCallback((category: string): string => {
    const count = counts[category] || 0;
    if (count === 0) return 'No Services';
    if (count === 1) return '1 Service';
    return `${count}+ Services`;
  }, [counts]);

  return {
    counts,
    isLoading,
    error,
    refreshCounts: fetchCounts,
    getCount,
    formatCount
  };
}
