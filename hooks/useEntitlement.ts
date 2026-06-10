import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../redux/hooks';
import entitlementService from '../services/entitlementService';
import { UserEntitlement } from '../types/entitlement';

interface UseEntitlementReturn {
  entitlement: UserEntitlement;
  isLoading: boolean;
  refresh: (options?: { forceRefresh?: boolean }) => Promise<UserEntitlement>;
}

const FREE_ENTITLEMENT: UserEntitlement = {
  state: 'FREE',
  effectiveTier: 'free',
};

export default function useEntitlement(): UseEntitlementReturn {
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [entitlement, setEntitlement] = useState<UserEntitlement>(FREE_ENTITLEMENT);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef<Promise<UserEntitlement> | null>(null);

  const refresh = useCallback(
    async (options?: { forceRefresh?: boolean }): Promise<UserEntitlement> => {
      if (!userId) {
        setEntitlement(FREE_ENTITLEMENT);
        return FREE_ENTITLEMENT;
      }

      if (inFlightRef.current) {
        return await inFlightRef.current;
      }

      const run = (async () => {
        setIsLoading(true);
        try {
          const next = await entitlementService.getUserEntitlement(userId, options);
          setEntitlement(next);
          return next;
        } finally {
          setIsLoading(false);
        }
      })();

      inFlightRef.current = run;
      try {
        return await run;
      } finally {
        inFlightRef.current = null;
      }
    },
    [userId]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh({ forceRefresh: true });
    }, [refresh])
  );

  const stableEntitlement = useMemo(() => entitlement, [entitlement]);

  return {
    entitlement: stableEntitlement,
    isLoading,
    refresh,
  };
}
