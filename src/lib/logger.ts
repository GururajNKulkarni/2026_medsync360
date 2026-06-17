import { supabase } from './supabase';

type LogLevel = 'error' | 'warn' | 'info' | 'perf';
const SLOW_MS = 800;
const isProd = import.meta.env.MODE === 'production';

export const logger = {
  async log(level: LogLevel, category: string, message: string, extra?: Partial<{
    errorName: string; stack: string; route: string; userId: string; sessionId: string; durationMs: number; meta: unknown;
  }>) {
    const sample = level === 'perf' ? 0.2 : 1.0;
    if (isProd && Math.random() > sample) return;

    const payload = {
      p_level: level,
      p_category: category,
      p_message: (message || '').slice(0, 1000),
      p_error_name: extra?.errorName ?? null,
      p_stack: extra?.stack ? String(extra.stack).slice(0, 8000) : null,
      p_route: extra?.route ?? (typeof location !== 'undefined' ? location.pathname : null),
      p_user_id: extra?.userId ?? null,
      p_session_id: extra?.sessionId ?? null,
      p_duration_ms: extra?.durationMs ?? null,
      p_meta: extra?.meta ? JSON.parse(JSON.stringify(extra.meta)) : null
    } as const;

    try {
      await (supabase as any).rpc('log_client_event', payload);
    } catch (e: any) {
      // Never throw from logger
      console.warn('log_client_event failed', e?.message);
    }
  },

  async time<T>(name: string, fn: () => Promise<T>, ctx?: Record<string, unknown>): Promise<T> {
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      const result = await fn();
      const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const ms = Math.round(end - start);
      if (ms >= SLOW_MS) {
        await this.log('perf', name, 'Slow operation', { durationMs: ms, meta: ctx });
      }
      return result;
    } catch (err: any) {
      const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const ms = Math.round(end - start);
      await this.log('error', name, err?.message || 'Error', {
        durationMs: ms,
        errorName: err?.name,
        stack: err?.stack,
        meta: ctx
      });
      throw err;
    }
  }
};

export function setupGlobalErrorLogging(userId?: string) {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event: ErrorEvent) => {
    logger.log('error', 'window.onerror', event.message, {
      errorName: event.error?.name, stack: event.error?.stack, route: location.pathname, userId
    });
  });
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason: any = event.reason || {};
    logger.log('error', 'unhandledrejection', reason?.message || 'Unhandled rejection', {
      errorName: reason?.name, stack: reason?.stack, route: location.pathname, userId
    });
  });
}

