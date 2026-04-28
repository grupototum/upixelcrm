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
  const lastPollTimeRef = useRef<number>(0);
  const failedPollsRef = useRef(0);

  const startPolling = useCallback(() => {
    // Don't start polling if it's already running
    if (pollTimerRef.current) return;

    logger.info('Starting polling fallback');
    const poll = async () => {
      try {
        const startTime = Date.now();
        await fetchFallback();
        lastPollTimeRef.current = startTime;
        failedPollsRef.current = 0;
      } catch (err) {
        failedPollsRef.current += 1;
        logger.error('Polling error (attempt ' + failedPollsRef.current + '):', err);
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

    // Try to establish realtime subscription
    const trySubscribe = () => {
      try {
        const subscription = setupSubscription();
        unsubscribeRef.current = subscription.unsubscribe;
        hasErrorRef.current = false;
        stopPolling();
        logger.info('✓ Realtime subscription active');
      } catch (err) {
        logger.warn('Realtime unavailable, using polling:', err);
        hasErrorRef.current = true;
        startPolling();
      }
    };

    trySubscribe();

    // Health check: every 30s, if in polling mode, try to reconnect to realtime
    const healthCheckInterval = setInterval(() => {
      if (hasErrorRef.current && pollTimerRef.current) {
        logger.info('Health check: attempting realtime reconnect...');
        trySubscribe();
      }
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(healthCheckInterval);
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
