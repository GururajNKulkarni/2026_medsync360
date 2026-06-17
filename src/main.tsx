import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as Sentry from '@sentry/react';
import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';
import { logger } from './lib/logger';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
  ],
  tracesSampleRate: 0.15,
  replaysSessionSampleRate: 0.03,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});

const logVital = (name: string) => (metric: any) => {
  logger.log('perf', `web-vital:${name}`, `${name}=${Math.round(metric.value)}` , {
    meta: { id: metric.id, value: metric.value, rating: metric.rating }
  });
};

onCLS(logVital('CLS'));
onFID(logVital('FID'));
onLCP(logVital('LCP'));
onINP(logVital('INP'));
onTTFB(logVital('TTFB'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
