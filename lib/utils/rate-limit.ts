/**
 * Simple in-memory rate limiter
 * For production, consider using @upstash/ratelimit with Vercel KV
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetAt) {
          this.requests.delete(key)
        }
      }
    }, 60000)
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (user ID, IP address, etc.)
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  async checkLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{
    success: boolean
    remaining: number
    resetAt: number
  }> {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    // No previous requests or window expired
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs
      this.requests.set(identifier, { count: 1, resetAt })
      return { success: true, remaining: limit - 1, resetAt }
    }

    // Within window, check if limit exceeded
    if (entry.count >= limit) {
      return { success: false, remaining: 0, resetAt: entry.resetAt }
    }

    // Increment count
    entry.count++
    this.requests.set(identifier, entry)
    return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // AI generation endpoints - expensive operations
  AI_GENERATION: {
    limit: 3, // 3 requests
    window: 60 * 60 * 1000, // per hour
  },
  // Food nutrition lookup - moderate cost
  FOOD_NUTRITION: {
    limit: 20, // 20 requests
    window: 60 * 1000, // per minute
  },
  // General API endpoints
  GENERAL: {
    limit: 100, // 100 requests
    window: 60 * 1000, // per minute
  },
}

/**
 * Apply rate limiting to an API route
 * @param identifier - Unique identifier for the user/client
 * @param limitType - Type of rate limit to apply
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS = 'GENERAL'
) {
  const config = RATE_LIMITS[limitType]
  return rateLimiter.checkLimit(identifier, config.limit, config.window)
}

/**
 * Helper to create rate limit error response headers
 */
export function rateLimitHeaders(remaining: number, resetAt: number) {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetAt).toISOString(),
    'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
  }
}
