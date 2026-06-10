/**
 * Production-safe logger utility
 * Wraps console methods to only log in development mode
 */

export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (__DEV__) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (__DEV__) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug(...args);
    }
  },
};

export default logger;
