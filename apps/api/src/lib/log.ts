export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.log(`[INFO] ${message}`, meta || '');
}

export function logError(message: string, meta?: Record<string, unknown>) {
  console.error(`[ERROR] ${message}`, meta || '');
}