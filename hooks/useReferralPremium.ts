import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

interface UseReferralPremiumReturn {
  hasAccess: boolean;
  activePeriod?: undefined;
  history: [];
  loading: boolean;
  error?: any;
  refresh: () => Promise<void>;
}

/**
 * @deprecated This hook is deprecated as premium access is no longer granted via referrals.
 * Returns default/empty values for backwards compatibility.
 * 
 * Premium access for other sources (purchases, admin grants) should use a different hook.
 */
export default function useReferralPremium(): UseReferralPremiumReturn {
  const userId = useSelector((s: RootState) => s.auth.user?.id) as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(undefined);

  const load = useCallback(async () => {
    // No-op: Premium access no longer granted via referrals
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Always return false for hasAccess since referrals don't grant premium anymore
  return { 
    hasAccess: false, 
    activePeriod: undefined, 
    history: [], 
    loading: false, 
    error: undefined, 
    refresh: load 
  };
}
