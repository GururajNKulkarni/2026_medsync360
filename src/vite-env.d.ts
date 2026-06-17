/// <reference types="vite/client" />

// Global logger interface for error boundaries
declare global {
  interface Window {
    logger?: {
      log: (level: string, category: string, message: string, meta?: Record<string, unknown>) => void;
    };
  }
}
