import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import referralService from '../../services/referralService';
import { shareReferral } from '../../utils/referrals';
import { RootState } from '../../redux/store';

interface Props {
  userId?: string;
}

interface ClipboardGlobal {
  setString?: (text: string) => void;
}

declare const global: typeof globalThis & {
  Clipboard?: ClipboardGlobal;
};

const ReferralCodeDisplay: React.FC<Props> = ({ userId }) => {
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id) as string | undefined;
  const uid = userId || currentUserId;
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fetchCode = async (attempt: number = 0) => {
      if (!uid) {
        if (isActive) setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await referralService.getUserReferralCode(uid);
        
        if (!isActive) return;

        // Prefer showing any available code immediately (even if there was an underlying fetch error).
        // This keeps the UI responsive on slow/unreliable networks while still allowing retries.
        if (data) {
          setCode(data);
          setLoading(false);
          setError(null);
          return;
        }
        
        if (fetchError) {
          if (attempt < 2) {
            timeoutId = setTimeout(() => {
              if (isActive) {
                setRetryCount(attempt + 1);
                fetchCode(attempt + 1);
              }
            }, 2000 * (attempt + 1));
          } else {
            setError('Unable to load referral code. Please try again.');
            setLoading(false);
          }
        } else {
          if (attempt < 3) {
            timeoutId = setTimeout(() => {
              if (isActive) {
                setRetryCount(attempt + 1);
                fetchCode(attempt + 1);
              }
            }, 1500 * (attempt + 1));
          } else {
            setError('Referral code not found. Please contact support.');
            setLoading(false);
          }
        }
      } catch (err) {
        if (!isActive) return;
        
        if (attempt < 2) {
          timeoutId = setTimeout(() => {
            if (isActive) {
              setRetryCount(attempt + 1);
              fetchCode(attempt + 1);
            }
          }, 2000 * (attempt + 1));
        } else {
          setError('Failed to load. Tap retry to try again.');
          setLoading(false);
        }
      }
    };

    fetchCode(0);

    return () => { 
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [uid, refreshIndex]);

  const onCopy = async () => {
    if (!code) return;
    global.Clipboard?.setString?.(code);
  };

  const onShare = async () => {
    if (!code) return;
    await shareReferral(code);
  };

  const onRetry = () => {
    setRetryCount(0);
    setError(null);
    setCode(null);
    setRefreshIndex((v) => v + 1);
  };

  if (!uid) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your referral code</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#111827" />
          {retryCount > 0 && (
            <Text style={styles.retryText}>Retrying... (attempt {retryCount + 1})</Text>
          )}
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.code}>{code || '— — — —'}</Text>
          <View style={styles.row}>
            <Pressable 
              onPress={onCopy} 
              disabled={!code}
              style={({ pressed }) => [styles.button, pressed && styles.pressed, !code && styles.disabled]}
            >
              <Text style={styles.buttonText}>Copy</Text>
            </Pressable>
            <Pressable 
              onPress={onShare} 
              disabled={!code}
              style={({ pressed }) => [styles.button, pressed && styles.pressed, !code && styles.disabled]}
            >
              <Text style={styles.buttonText}>Share</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  code: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
    color: '#111827',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  retryText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  errorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  disabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  pressed: { 
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ReferralCodeDisplay;
