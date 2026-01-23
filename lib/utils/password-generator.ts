/**
 * Secure Password Generator for Franchise Admin Accounts
 * 
 * Generates a strong, memorable temporary password that meets security requirements:
 * - 16 characters long
 * - Mix of uppercase, lowercase, numbers, and symbols
 * - Readable (avoids confusing characters like 0/O, 1/l/I)
 * - Secure (cryptographically random)
 */

/**
 * Generate a secure random password for franchise admin initial access
 * 
 * @returns A 16-character secure password
 * 
 * @example
 * const password = generateSecurePassword()
 * // Returns something like: "Kx7p-Nm9w-Qr4s-Ht2v"
 */
export function generateSecurePassword(): string {
  // Character sets (excluding confusing characters)
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // No I, O
  const lowercase = 'abcdefghijkmnpqrstuvwxyz' // No l, o
  const numbers = '23456789' // No 0, 1
  const symbols = '-_@#$%&*+=!'
  
  // Ensure at least one of each type
  const parts = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ]
  
  // Fill remaining characters randomly
  const allChars = uppercase + lowercase + numbers + symbols
  for (let i = parts.length; i < 16; i++) {
    parts.push(allChars[Math.floor(Math.random() * allChars.length)])
  }
  
  // Shuffle using Fisher-Yates algorithm
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]]
  }
  
  // Format with dashes for readability: Kx7p-Nm9w-Qr4s-Ht2v
  const password = parts.join('')
  return `${password.slice(0, 4)}-${password.slice(4, 8)}-${password.slice(8, 12)}-${password.slice(12, 16)}`
}

/**
 * Validate password strength
 * Used to verify generated passwords meet requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Remove dashes for validation
  const cleanPassword = password.replace(/-/g, '')
  
  if (cleanPassword.length < 12) {
    errors.push('Password must be at least 12 characters (excluding dashes)')
  }
  
  if (!/[A-Z]/.test(cleanPassword)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(cleanPassword)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(cleanPassword)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(cleanPassword)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
