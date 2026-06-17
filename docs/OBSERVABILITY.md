# Observability (Crashes, Performance, and Audit Logging)

This document explains how we monitor crashes, slow performance, and business/audit events using Sentry and Supabase.

## Stack Overview
- Sentry: industry-standard error + performance + session replay.
- Supabase app_logs: low-cost, queryable audit/perf logs via RPC.

## Sentry Setup
1) Packages
- `@sentry/react` added to devDependencies

2) Initialization
- File: `src/main.tsx`
  - Initializes Sentry with browser tracing + replay
  - Samples traces at 0.15, replays at 0.03 (100% on error)
  - Environment bound to Vite mode

3) Web Vitals
- File: `src/main.tsx`
  - Uses `web-vitals` and `logger.log('perf', ...)` to track CLS, FID, LCP, INP, TTFB

4) Error Boundary and Global Errors
- Error boundary can be added in `src/App.tsx` if desired (Sentry also wraps errors internally)
- Global window error/rejection listeners are provided in `src/lib/logger.ts` via `useGlobalErrorLogging`

5) DSN
- Set `VITE_SENTRY_DSN` in `.env`

## Supabase Logging (app_logs)
1) Database
- Migration: `supabase/migrations/20250808120000_app_logs.sql`
  - Table: `public.app_logs`
  - RPC: `public.log_client_event(...)` (security definer, granted to anon/authenticated)

2) Client Logger
- File: `src/lib/logger.ts`
  - `logger.log(level, category, message, extra)`
  - `logger.time(name, asyncFn, ctx)` → measures duration, auto logs slow ops and errors
  - Sampling applied for perf logs to reduce noise in production

3) Example Usage
```ts
const { data } = await logger.time(
  'rpc:get_complete_medication_trail',
  () => (supabase as any).rpc('get_complete_medication_trail', { p_referral_id: referralId }),
  { referralId }
);
```

## Privacy / PHI Guidance
- Never send patient names or free-text PHI in logs or Sentry.
- Prefer referral UUIDs and numeric durations.
- Sentry DSN can be disabled per-environment; app logs sampling can be tuned.

## Dashboards / Queries
- Sentry: configure alerts for error rate > X/min, LCP > 2.5s.
- Supabase SQL examples:
```sql
-- Error count by route
select route, count(*)
from app_logs
where level = 'error' and created_at > now() - interval '24 hours'
group by 1
order by 2 desc;

-- Slow operations (> 800ms)
select created_at, category, duration_ms, meta
from app_logs
where level = 'perf' and duration_ms >= 800
order by created_at desc
limit 100;
```

## Rollout Steps
1) Add `VITE_SENTRY_DSN` in `.env`.
2) Apply migration: `supabase db push` (or run SQL in dashboard).
3) Deploy. Verify logs in Sentry and `app_logs` table.

## Ownership
- Sentry project owner: You
- app_logs data stewardship: You (retention, PII policy)