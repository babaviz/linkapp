import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { setMyProfile } from '../redux/slices/datemiSlice';
import { DateMiProfileService } from '../services/dateMiService';
import { dateMiProfileCacheService } from '../services/dateMiProfileCacheService';
import { DateMiProfile } from '../redux/slices/datemiSlice';
import { validateProfileOnLoad, getProfileCompletionStatus, ProfileCompletionStatus } from '../utils/profileValidation';

interface UseProfileLoaderReturn {
  myProfile: DateMiProfile | null;
  isLoading: boolean;
  error: string | null;
  hasProfile: boolean;
  needsProfile: boolean;
  refetch: () => Promise<void>;
  completionStatus: ProfileCompletionStatus | null;
  isProfileValid: boolean;
}

/**
 * Custom hook to load and manage DateMi profile
 * 
 * This hook:
 * - Loads cached profile immediately for instant display
 * - Automatically loads user's profile from database on mount
 * - Refreshes in background if cache is stale
 * - Provides loading and error states
 * - Determines if user needs to create a profile
 * - Allows manual refetch of profile data
 * 
 * @returns Profile data, loading state, and utility functions
 */
export function useProfileLoader(): UseProfileLoaderReturn {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const myProfile = useSelector((state: RootState) => state.datemi.myProfile);
  
  // Start in a "checking" state when we have an authenticated user but haven't hydrated
  // their DateMi profile yet. This prevents a first-render flash of the "Create profile"
  // prompt during passcode → DateMi browse navigation.
  const [isLoading, setIsLoading] = useState(() => Boolean(user?.id && !myProfile));
  const [error, setError] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const hasLoadedCacheRef = useRef(false);
  
  // Load cached profile immediately on mount for instant display
  useEffect(() => {
    if (!user?.id || hasLoadedCacheRef.current || myProfile) return;
    
    const loadCachedProfile = async () => {
      try {
        const cached = await dateMiProfileCacheService.getCachedMyProfile();
        if (cached && cached.profile && isMountedRef.current && !myProfile) {
          // Only use cache if userId matches
          if (cached.profile.userId === user.id) {
            validateProfileOnLoad(cached.profile);
            dispatch(setMyProfile(cached.profile));
            
            const status = getProfileCompletionStatus(cached.profile);
            setCompletionStatus(status);
            setIsLoading(false);
            hasLoadedCacheRef.current = true;
          }
        }
      } catch {
        // Ignore cache errors, will fetch from network
      }
    };
    
    loadCachedProfile();
  }, [user?.id, myProfile, dispatch]);
  
  const loadProfile = async (skipCache = false) => {
    if (!user?.id) {
      if (isMountedRef.current) {
        setError(null);
        setCompletionStatus(null);
        setIsLoading(false);
      }
      return;
    }
    
    setError(null);
    
    try {
      // If we don't have a profile yet, optimistically hydrate from cache first.
      // This prevents blocking UI on slow networks.
      let cachedProfile: DateMiProfile | null = null;
      if (!skipCache && !myProfile) {
        const cached = await dateMiProfileCacheService.getCachedMyProfile();
        if (cached?.profile?.userId === user.id) {
          cachedProfile = cached.profile;
          validateProfileOnLoad(cachedProfile);
          dispatch(setMyProfile(cachedProfile));
          setCompletionStatus(getProfileCompletionStatus(cachedProfile));
        }
      }

      // Only show loading if we have nothing to display
      if (!myProfile && !cachedProfile) {
        setIsLoading(true);
      }

      // Fetch fresh profile from network (non-blocking if cache was applied)
      const profile = await DateMiProfileService.getProfileByUserId(user.id, {
        timeoutMs: 12000,
        throwOnError: false,
      });
      
      if (!isMountedRef.current) {
        return;
      }
      
      // Prefer fresh profile if available, otherwise keep cached (or null)
      const profileToUse = profile || cachedProfile;
      
      if (profileToUse) {
        // Validate profile on load for downstream use (non-blocking)
        validateProfileOnLoad(profileToUse);
        dispatch(setMyProfile(profileToUse));
        
        // Cache the profile for next time (only if it's fresh from network)
        if (profile) dateMiProfileCacheService.cacheMyProfile(profile);
        
        // Calculate completion status
        const status = getProfileCompletionStatus(profileToUse);
        setCompletionStatus(status);
        setError(null);
      } else {
        setCompletionStatus(null);
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      
      // If we have cached data and network fails, don't show error
      if (myProfile) {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      setCompletionStatus(null);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  useEffect(() => {
    if (!user?.id) {
      hasFetchedRef.current = false;
      hasLoadedCacheRef.current = false;
      if (isMountedRef.current) {
        setError(null);
        setCompletionStatus(null);
        setIsLoading(false);
      }
      return;
    }

    if (userIdRef.current !== user.id) {
      userIdRef.current = user.id;
      hasFetchedRef.current = false;
      hasLoadedCacheRef.current = false;
      if (isMountedRef.current) {
        setError(null);
        setCompletionStatus(null);
        if (!myProfile || myProfile.userId !== user.id) {
          setIsLoading(true);
        }
      }
    }
    
    // If we already have a fresh profile in Redux, mark as fetched
    if (myProfile && myProfile.userId === user.id) {
      hasFetchedRef.current = true;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      
      // Check if we should do a background refresh
      dateMiProfileCacheService.isMyProfileCacheFresh().then((isFresh) => {
        if (!isFresh && isMountedRef.current) {
          // Refresh in background without showing loading state
          loadProfile(false);
        }
      }).catch(() => {
        // Ignore cache check errors
      });
      
      return;
    }
    
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadProfile();
    }
  }, [user?.id, myProfile, dispatch]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const refetch = async () => {
    hasFetchedRef.current = false;
    await loadProfile(true);
  };
  
  const hasProfile = !!myProfile;
  const needsProfile = !!user?.id && !myProfile && !isLoading && !error && hasFetchedRef.current;
  const isProfileValid = myProfile ? validateProfileOnLoad(myProfile) : false;
  
  // Update completion status when profile changes
  useEffect(() => {
    if (myProfile) {
      const status = getProfileCompletionStatus(myProfile);
      setCompletionStatus(status);
    } else {
      setCompletionStatus(null);
    }
  }, [myProfile]);
  
  return {
    myProfile,
    isLoading,
    error,
    hasProfile,
    needsProfile,
    refetch,
    completionStatus,
    isProfileValid,
  };
}

export default useProfileLoader;
