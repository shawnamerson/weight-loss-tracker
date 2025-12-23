import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal, false otherwise
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    // Convert strings to buffers
    const bufferA = Buffer.from(a, 'utf8')
    const bufferB = Buffer.from(b, 'utf8')

    // If lengths don't match, still compare to prevent timing leaks
    // Pad the shorter one with zeros
    const maxLength = Math.max(bufferA.length, bufferB.length)
    const paddedA = Buffer.alloc(maxLength)
    const paddedB = Buffer.alloc(maxLength)

    bufferA.copy(paddedA)
    bufferB.copy(paddedB)

    // Use crypto.timingSafeEqual for constant-time comparison
    return timingSafeEqual(paddedA, paddedB) && bufferA.length === bufferB.length
  } catch {
    return false
  }
}

/**
 * Verify Bearer token with timing-safe comparison
 * @param authHeader - Authorization header value
 * @param expectedToken - Expected token value
 * @returns true if token is valid, false otherwise
 */
export function verifyBearerToken(authHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authHeader || !expectedToken) {
    return false
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false
  }

  const providedToken = parts[1]
  return timingSafeCompare(providedToken, expectedToken)
}

/**
 * Generate HMAC signature for request validation
 * @param data - Data to sign
 * @param secret - Secret key
 * @returns HMAC signature as hex string
 */
export function generateHmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Verify HMAC signature with timing-safe comparison
 * @param data - Original data
 * @param signature - Provided signature
 * @param secret - Secret key
 * @returns true if signature is valid, false otherwise
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmac(data, secret)
  return timingSafeCompare(signature, expectedSignature)
}
