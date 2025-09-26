/**
 * Debug logger utility
 * Logs to console only when DEBUG_LOG environment variable is true
 */

// Check if debug logging is enabled (defaults to true)
const isDebugEnabled = (): boolean => {
  const debugLog = process.env.DEBUG_LOG;
  // Default to true if not set, or if explicitly set to 'true'
  return debugLog === undefined || debugLog === 'true';
};

/**
 * Debug log function that respects the DEBUG_LOG environment variable
 * @param message - The message to log
 * @param data - Optional additional data to log
 */
export const debugLog = (message: string, ...data: any[]): void => {
  if (isDebugEnabled()) {
    console.log(`[DEBUG] ${message}`, ...data);
  }
};

/**
 * Debug error function that respects the DEBUG_LOG environment variable
 * @param message - The error message to log
 * @param error - Optional error object to log
 */
export const debugError = (message: string, error?: any): void => {
  if (isDebugEnabled()) {
    console.error(`[DEBUG ERROR] ${message}`, error);
  }
};

/**
 * Debug warn function that respects the DEBUG_LOG environment variable
 * @param message - The warning message to log
 * @param data - Optional additional data to log
 */
export const debugWarn = (message: string, ...data: any[]): void => {
  if (isDebugEnabled()) {
    console.warn(`[DEBUG WARN] ${message}`, ...data);
  }
};

/**
 * Debug info function that respects the DEBUG_LOG environment variable
 * @param message - The info message to log
 * @param data - Optional additional data to log
 */
export const debugInfo = (message: string, ...data: any[]): void => {
  if (isDebugEnabled()) {
    console.info(`[DEBUG INFO] ${message}`, ...data);
  }
};
