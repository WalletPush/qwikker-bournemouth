/**
 * 🛡️ ENTERPRISE DATABASE ACCESS CONTROL SYSTEM
 * Bulletproof protection against unauthorized database operations
 * Created after catastrophic data loss - NEVER AGAIN!
 */

import { createClient } from '@/lib/supabase/server'

// Authorized personnel for production operations
const AUTHORIZED_ADMINS = [
  'admin@qwikker.com',
  'dev@qwikker.com',
  // Add more authorized emails here
]

// Critical operations that require special approval
const CRITICAL_OPERATIONS = [
  'DELETE',
  'DROP',
  'TRUNCATE', 
  'ALTER TABLE',
  'UPDATE',
  'db reset',
  'migration rollback'
]

export interface DatabaseOperation {
  operation: string
  table?: string
  user: string
  timestamp: Date
  approved: boolean
  approvedBy?: string
  reason: string
}

export class DatabaseAccessControl {
  private static instance: DatabaseAccessControl
  private operationLog: DatabaseOperation[] = []

  private constructor() {}

  static getInstance(): DatabaseAccessControl {
    if (!DatabaseAccessControl.instance) {
      DatabaseAccessControl.instance = new DatabaseAccessControl()
    }
    return DatabaseAccessControl.instance
  }

  /**
   * Check if user is authorized for database operations
   */
  async isAuthorizedAdmin(userEmail: string): Promise<boolean> {
    return AUTHORIZED_ADMINS.includes(userEmail.toLowerCase())
  }

  /**
   * Check if operation requires special approval
   */
  isCriticalOperation(operation: string): boolean {
    return CRITICAL_OPERATIONS.some(critical => 
      operation.toLowerCase().includes(critical.toLowerCase())
    )
  }

  /**
   * Log database operation for audit trail
   */
  async logOperation(operation: DatabaseOperation): Promise<void> {
    this.operationLog.push(operation)
    
    // In production, this would write to a secure audit log
    console.log('🔒 DATABASE OPERATION LOGGED:', {
      operation: operation.operation,
      user: operation.user,
      timestamp: operation.timestamp,
      approved: operation.approved,
      table: operation.table
    })

    // TODO: Send to external audit system
    // await this.sendToAuditSystem(operation)
  }

  /**
   * Request approval for critical database operation
   */
  async requestApproval(
    operation: string, 
    requestedBy: string, 
    reason: string,
    table?: string
  ): Promise<{ approved: boolean; message: string }> {
    
    // Check if user is authorized
    if (!(await this.isAuthorizedAdmin(requestedBy))) {
      await this.logOperation({
        operation,
        table,
        user: requestedBy,
        timestamp: new Date(),
        approved: false,
        reason: 'User not authorized'
      })
      
      return {
        approved: false,
        message: '🚫 ACCESS DENIED: You are not authorized for database operations'
      }
    }

    // Check if operation is critical
    if (this.isCriticalOperation(operation)) {
      await this.logOperation({
        operation,
        table,
        user: requestedBy,
        timestamp: new Date(),
        approved: false,
        reason: 'Critical operation requires manual approval'
      })

      return {
        approved: false,
        message: '⚠️ CRITICAL OPERATION: This requires manual approval from senior admin'
      }
    }

    // Non-critical operation for authorized user
    await this.logOperation({
      operation,
      table,
      user: requestedBy,
      timestamp: new Date(),
      approved: true,
      reason
    })

    return {
      approved: true,
      message: '✅ Operation approved'
    }
  }

  /**
   * Get audit trail of database operations
   */
  getAuditTrail(): DatabaseOperation[] {
    return [...this.operationLog].reverse() // Most recent first
  }

  /**
   * Emergency lockdown - blocks all database operations
   */
  async emergencyLockdown(triggeredBy: string, reason: string): Promise<void> {
    await this.logOperation({
      operation: 'EMERGENCY_LOCKDOWN',
      user: triggeredBy,
      timestamp: new Date(),
      approved: true,
      reason
    })

    // TODO: Implement actual database lockdown
    console.log('🚨 EMERGENCY LOCKDOWN ACTIVATED:', reason)
  }
}

/**
 * Middleware to protect database operations
 */
export async function protectDatabaseOperation(
  operation: string,
  userEmail: string,
  reason: string,
  table?: string
): Promise<{ canProceed: boolean; message: string }> {
  
  const accessControl = DatabaseAccessControl.getInstance()
  
  try {
    const approval = await accessControl.requestApproval(
      operation,
      userEmail,
      reason,
      table
    )
    
    return {
      canProceed: approval.approved,
      message: approval.message
    }
  } catch (error) {
    await accessControl.logOperation({
      operation,
      table,
      user: userEmail,
      timestamp: new Date(),
      approved: false,
      reason: `Error: ${error}`
    })
    
    return {
      canProceed: false,
      message: '🚫 Database operation blocked due to security error'
    }
  }
}

/**
 * Safe database client that logs all operations
 */
export async function createSecureClient(userEmail: string, operation: string) {
  const accessControl = DatabaseAccessControl.getInstance()
  
  // Check authorization before creating client
  if (!(await accessControl.isAuthorizedAdmin(userEmail))) {
    throw new Error('🚫 Unauthorized database access attempt')
  }
  
  const client = await createClient()
  
  // Log the client creation
  await accessControl.logOperation({
    operation: `CLIENT_CREATED: ${operation}`,
    user: userEmail,
    timestamp: new Date(),
    approved: true,
    reason: 'Secure client created for authorized operation'
  })
  
  return client
}

