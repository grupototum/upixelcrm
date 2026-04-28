import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface RealtimeConfig {
  onError?: (error: any) => void;
  pollInterval?: number; // milliseconds, default 5000
  enabled?: boolean;
}

/**
 * Higher-order hook that wraps Supabase realtime subscriptions with polling fallback.
 * If realtime fails or isn't available, automatically falls back to periodic polling.
 */
export function useRealtimeWithFallback(
  setupSubscription: () => { unsubscribe: () => void },
  fetchFallback: () => Promise<void>,
  config: RealtimeConfig = {}
) {
  const {
    pollInterval = 5000,
    enabled = true,
    onError
  } = config;

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasErrorRef = useRef(false);

  const startPolling = useCallback(() => {
    // Don't start polling if it's already running
    if (pollTimerRef.current) return;

    logger.info('Starting polling fallback');
    const poll = async () => {
      try {
        await fetchFallback();
      } catch (err) {
        logger.error('Polling fallback error:', err);
        onError?.(err);
      }
    };

    // Initial poll immediately
    poll().catch(err => logger.error('Initial polling failed:', err));

    // Set up interval for subsequent polls
    pollTimerRef.current = setInterval(poll, pollInterval);
  }, [fetchFallback, pollInterval, onError]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      logger.info('Stopped polling fallback');
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    try {
      const subscription = setupSubscription();
      unsubscribeRef.current = subscription.unsubscribe;
      hasErrorRef.current = false;

      // If subscription succeeds, stop polling
      stopPolling();
    } catch (err) {
      logger.warn('Realtime subscription setup failed, starting polling:', err);
      hasErrorRef.current = true;
      startPolling();
    }

    // Cleanup
    return () => {
      stopPolling();
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (err) {
          logger.error('Error during unsubscribe:', err);
        }
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, setupSubscription, startPolling, stopPolling]);

  return {
    stopPolling,
    startPolling,
    realtimeFailed: hasErrorRef.current
  };
}
