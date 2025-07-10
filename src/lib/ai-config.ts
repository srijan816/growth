/**
 * AI Configuration for performance optimization
 */

export const AI_CONFIG = {
  // Model selection
  models: {
    fast: 'gemini-2.5-flash', // Using 2.5 for all as requested
    standard: 'gemini-2.5-flash', // Better quality
    premium: 'gemini-2.5-pro' // Best quality, slowest
  },
  
  // Optimization thresholds
  optimization: {
    // Use optimized engine when data exceeds this size
    dataSizeThreshold: 30000,
    
    // Max content length per session
    maxContentLength: 500,
    
    // Max key points to extract per session
    maxKeyPoints: 5,
    
    // Session limit for analysis
    defaultSessionLimit: 10,
    maxSessionLimit: 20
  },
  
  // API performance
  api: {
    // Timeout for API calls (ms)
    timeout: 30000,
    
    // Retry configuration
    maxRetries: 3,
    retryDelay: 2000,
    
    // Rate limiting
    requestsPerMinute: 30,
    
    // Batch processing
    enableBatching: true,
    batchSize: 5
  },
  
  // Prompt optimization
  prompts: {
    // Use compressed prompts
    useCompression: true,
    
    // Remove examples from prompts for large datasets
    includeExamples: false,
    
    // Limit instruction verbosity
    verboseInstructions: false
  },
  
  // Caching configuration
  cache: {
    // Cache analysis results
    enabled: true,
    
    // Cache duration (hours)
    duration: 24,
    
    // Force regenerate if feedback count changes by this percentage
    invalidationThreshold: 0.2
  },
  
  // Content extraction priorities
  contentPriorities: {
    // Keywords that indicate important content
    highPriority: [
      'needs to', 'must', 'should', 'critical', 'important',
      'excellent', 'outstanding', 'poor', 'weak'
    ],
    
    // Keywords for positive feedback
    positive: [
      'excellent', 'strong', 'effective', 'confident', 
      'improved', 'well done', 'great', 'impressive'
    ],
    
    // Keywords for areas of improvement
    improvement: [
      'needs', 'work on', 'struggled', 'difficulty', 
      'challenge', 'weak', 'focus on', 'practice'
    ]
  }
}

/**
 * Get optimal model based on data size
 */
export function getOptimalModel(dataSize: number): string {
  if (dataSize > 50000) return AI_CONFIG.models.fast
  if (dataSize > 20000) return AI_CONFIG.models.standard
  return AI_CONFIG.models.premium
}

/**
 * Calculate optimal session limit based on data size
 */
export function getOptimalSessionLimit(
  requestedLimit: number,
  totalSessions: number,
  averageSessionSize: number
): number {
  const maxDataSize = AI_CONFIG.optimization.dataSizeThreshold
  const maxSessions = Math.floor(maxDataSize / averageSessionSize)
  
  return Math.min(
    requestedLimit,
    totalSessions,
    maxSessions,
    AI_CONFIG.optimization.maxSessionLimit
  )
}

/**
 * Retry wrapper for API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    onRetry?: (attempt: number, error: any) => void
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || AI_CONFIG.api.maxRetries
  const delay = options.delay || AI_CONFIG.api.retryDelay
  
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        if (options.onRetry) {
          options.onRetry(attempt, error)
        }
        
        // Exponential backoff
        const waitTime = delay * Math.pow(1.5, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError
}