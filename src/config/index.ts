interface AppConfig {
  api: {
    baseUrl: string;
  };
  storage: {
    feedbackPath: string;
    uploadTempPath: string;
    maxFileSize: number; // in MB
  };
  external: {
    redisUrl?: string;
    geminiApiKey?: string;
    whisperApiKey?: string;
  };
  features: {
    enableAiFeedback: boolean;
    enableBulkUpload: boolean;
    enableRealTimeTranscription: boolean;
  };
  ui: {
    itemsPerPage: number;
    maxUploadSize: number;
    supportedFileTypes: string[];
  };
}

// Helper function to get environment variable with fallback
function getEnvVar(key: string, fallback: string = ''): string {
  return process.env[key] || fallback;
}

// Helper function to get boolean environment variable
function getBooleanEnv(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

// Helper function to get number environment variable
function getNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('NEXT_PUBLIC_API_URL', '/api'),
  },
  storage: {
    feedbackPath: getEnvVar('FEEDBACK_STORAGE_PATH', '/tmp/feedback'),
    uploadTempPath: getEnvVar('UPLOAD_TEMP_PATH', '/tmp/uploads'),
    maxFileSize: getNumberEnv('MAX_FILE_SIZE_MB', 10),
  },
  external: {
    redisUrl: getEnvVar('REDIS_URL'),
    geminiApiKey: getEnvVar('GEMINI_API_KEY'),
    whisperApiKey: getEnvVar('WHISPER_API_KEY'),
  },
  features: {
    enableAiFeedback: getBooleanEnv('ENABLE_AI_FEEDBACK', false),
    enableBulkUpload: getBooleanEnv('ENABLE_BULK_UPLOAD', true),
    enableRealTimeTranscription: getBooleanEnv('ENABLE_REALTIME_TRANSCRIPTION', false),
  },
  ui: {
    itemsPerPage: getNumberEnv('UI_ITEMS_PER_PAGE', 20),
    maxUploadSize: getNumberEnv('UI_MAX_UPLOAD_SIZE_MB', 10),
    supportedFileTypes: getEnvVar('UI_SUPPORTED_FILE_TYPES', '.xlsx,.xls,.csv,.docx,.doc').split(','),
  },
};

// Validation function to check required configuration
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check database URL (should be available from lib/db)
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    errors.push('DATABASE_URL or POSTGRES_URL is required');
  }

  // Check NextAuth configuration
  if (!process.env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }

  // Check storage paths exist in production
  if (process.env.NODE_ENV === 'production') {
    if (config.features.enableBulkUpload && !config.storage.uploadTempPath) {
      errors.push('UPLOAD_TEMP_PATH is required when bulk upload is enabled');
    }
  }

  // Check feature-specific requirements
  if (config.features.enableAiFeedback && !config.external.geminiApiKey) {
    errors.push('GEMINI_API_KEY is required when AI feedback is enabled');
  }

  if (config.features.enableRealTimeTranscription && !config.external.whisperApiKey) {
    errors.push('WHISPER_API_KEY is required when real-time transcription is enabled');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Development mode helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Export individual config sections for convenience
export const apiConfig = config.api;
export const storageConfig = config.storage;
export const externalConfig = config.external;
export const featureConfig = config.features;
export const uiConfig = config.ui;