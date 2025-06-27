import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet, CacheTTL } from './cache-manager';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: NextRequest) => string;
  condition?: (req: NextRequest) => boolean;
}

// Default cache options for different endpoint patterns
const cachePatterns: Record<string, CacheOptions> = {
  '/api/dashboard/stats': { ttl: CacheTTL.MEDIUM },
  '/api/dashboard/schedule': { ttl: CacheTTL.SHORT },
  '/api/classes/current': { ttl: CacheTTL.SHORT },
  '/api/feedback/students': { ttl: CacheTTL.LONG },
  '/api/growth/analytics': { ttl: CacheTTL.LONG },
};

export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: CacheOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return handler(req);
    }

    // Check if caching should be applied
    if (options?.condition && !options.condition(req)) {
      return handler(req);
    }

    // Generate cache key
    const keyGen = options?.keyGenerator || defaultKeyGenerator;
    const cacheKey = keyGen(req);

    // Try to get from cache
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-TTL': String(options?.ttl || CacheTTL.MEDIUM),
        },
      });
    }

    // Execute handler
    const response = await handler(req);
    
    // Cache successful responses only
    if (response.status === 200) {
      try {
        const data = await response.json();
        await cacheSet(cacheKey, data, options?.ttl || CacheTTL.MEDIUM);
        
        // Return new response with cache headers
        return NextResponse.json(data, {
          headers: {
            'X-Cache': 'MISS',
            'X-Cache-TTL': String(options?.ttl || CacheTTL.MEDIUM),
          },
        });
      } catch (error) {
        // If response is not JSON, return as-is
        return response;
      }
    }

    return response;
  };
}

// Default key generator
function defaultKeyGenerator(req: NextRequest): string {
  const url = new URL(req.url);
  const userId = req.headers.get('x-user-id') || 'anonymous';
  return `api:${userId}:${url.pathname}${url.search}`;
}

// Automatic cache detection based on URL patterns
export function withAutoCache(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const url = new URL(req.url);
    
    // Find matching cache pattern
    const pattern = Object.keys(cachePatterns).find(p => 
      url.pathname.startsWith(p)
    );
    
    if (pattern) {
      return withCache(handler, cachePatterns[pattern])(req);
    }
    
    return handler(req);
  };
}