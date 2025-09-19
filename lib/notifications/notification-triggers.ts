/**
 * 🔔 NOTIFICATION TRIGGERS
 * Functions to trigger smart notifications from various system events
 */

import { smartNotifications } from './smart-alerts'

// Database event triggers
export class NotificationTriggers {
  
  /**
   * Trigger when daily backup completes successfully
   */
  static async backupSuccess(data: {
    size: string
    duration: string
    profileCount: number
    files: number
  }): Promise<void> {
    await smartNotifications.sendNotification('backup_success', {
      size: data.size,
      duration: data.duration,
      profileCount: data.profileCount,
      files: data.files
    })
  }

  /**
   * Trigger when backup fails
   */
  static async backupFailed(data: {
    error: string
    attempt: number
    nextRetry: string
  }): Promise<void> {
    if (data.attempt === 1) {
      // First failure - high priority
      await smartNotifications.sendNotification('backup_failed_once', {
        error: data.error,
        nextRetry: data.nextRetry
      })
    } else {
      // Multiple failures - critical
      await smartNotifications.sendNotification('backup_system_dead', {
        error: data.error,
        attempts: data.attempt
      })
    }
  }

  /**
   * Trigger when new business profile is created
   */
  static async newBusinessSignup(data: {
    businessName: string
    location: string
    totalCount: number
    userEmail: string
  }): Promise<void> {
    // Regular new business notification
    await smartNotifications.sendNotification('new_business_signup', {
      businessName: data.businessName,
      location: data.location,
      totalCount: data.totalCount,
      userEmail: data.userEmail
    })

    // Check for milestones
    const milestones = [25, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000]
    if (milestones.includes(data.totalCount)) {
      await smartNotifications.sendNotification('business_milestones', {
        milestone: data.totalCount,
        latestBusiness: data.businessName,
        growthRate: await this.calculateGrowthRate()
      })
    }
  }

  /**
   * Trigger when database connection fails
   */
  static async databaseOutage(data: {
    error: string
    duration: number // minutes
    lastSuccessfulConnection: Date
  }): Promise<void> {
    await smartNotifications.sendNotification('database_outage', {
      error: data.error,
      duration: data.duration,
      lastConnection: data.lastSuccessfulConnection.toLocaleString()
    })
  }

  /**
   * Trigger when massive data loss is detected
   */
  static async massiveDataLoss(data: {
    previousCount: number
    currentCount: number
    percentageLoss: number
    affectedTables: string[]
  }): Promise<void> {
    await smartNotifications.sendNotification('massive_data_loss', {
      previousCount: data.previousCount,
      currentCount: data.currentCount,
      percentageLoss: data.percentageLoss,
      affectedTables: data.affectedTables.join(', ')
    })
  }

  /**
   * Trigger when suspicious activity is detected
   */
  static async suspiciousActivity(data: {
    activityType: string
    ipAddress: string
    attempts: number
    timeWindow: string
  }): Promise<void> {
    await smartNotifications.sendNotification('suspicious_activity', {
      activityType: data.activityType,
      ipAddress: data.ipAddress,
      attempts: data.attempts,
      timeWindow: data.timeWindow
    })
  }

  /**
   * Trigger weekly system health report
   */
  static async weeklyReport(data: {
    health: string
    successfulBackups: number
    totalBackups: number
    newBusinesses: number
    avgResponseTime: string
    storageUsed: string
    uptime: number
  }): Promise<void> {
    await smartNotifications.sendNotification('weekly_report', {
      health: data.health,
      successfulBackups: `${data.successfulBackups}/${data.totalBackups}`,
      newBusinesses: data.newBusinesses,
      avgResponse: data.avgResponseTime,
      storageUsed: data.storageUsed,
      uptime: `${data.uptime}%`
    })
  }

  /**
   * Trigger performance degradation alert
   */
  static async performanceDegraded(data: {
    responseTime: number
    normalResponseTime: number
    activeConnections: number
    duration: number // minutes
  }): Promise<void> {
    await smartNotifications.sendNotification('performance_degraded', {
      responseTime: `${data.responseTime}ms`,
      normalTime: `${data.normalResponseTime}ms`,
      connections: data.activeConnections,
      duration: `${data.duration} minutes`
    })
  }

  /**
   * Trigger storage warning
   */
  static async storageWarning(data: {
    usedPercentage: number
    totalSize: string
    usedSize: string
    estimatedDaysLeft: number
  }): Promise<void> {
    await smartNotifications.sendNotification('storage_warning', {
      percentage: data.usedPercentage,
      totalSize: data.totalSize,
      usedSize: data.usedSize,
      daysLeft: data.estimatedDaysLeft
    })
  }

  /**
   * Calculate business growth rate
   */
  private static async calculateGrowthRate(): Promise<number> {
    // This would calculate actual growth rate from database
    // For now, return a placeholder
    return Math.floor(Math.random() * 50) + 10 // 10-60% growth
  }
}

/**
 * Easy-to-use notification functions for backup scripts
 */
export const notify = {
  backupSuccess: NotificationTriggers.backupSuccess,
  backupFailed: NotificationTriggers.backupFailed,
  newBusiness: NotificationTriggers.newBusinessSignup,
  databaseDown: NotificationTriggers.databaseOutage,
  dataLoss: NotificationTriggers.massiveDataLoss,
  suspicious: NotificationTriggers.suspiciousActivity,
  weeklyReport: NotificationTriggers.weeklyReport,
  slowDatabase: NotificationTriggers.performanceDegraded,
  storageHigh: NotificationTriggers.storageWarning
}

