/**
 * 🚨 SMART NOTIFICATION SYSTEM
 * Intelligent alerts that inform without overwhelming
 */

export interface NotificationRule {
  id: string
  name: string
  condition: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  channels: ('slack' | 'email' | 'sms')[]
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  quietHours?: { start: string; end: string } // e.g., "23:00" to "07:00"
  enabled: boolean
}

export const NOTIFICATION_RULES: NotificationRule[] = [
  // 🚨 CRITICAL ALERTS (Wake you up!)
  {
    id: 'database_outage',
    name: 'Database Connection Failed',
    condition: 'Cannot connect to database for >5 minutes',
    severity: 'critical',
    channels: ['slack', 'email', 'sms'],
    frequency: 'immediate',
    enabled: true
  },
  {
    id: 'massive_data_loss',
    name: 'Massive Data Loss Detected',
    condition: 'Profile count drops >50% in 1 hour',
    severity: 'critical',
    channels: ['slack', 'email', 'sms'],
    frequency: 'immediate',
    enabled: true
  },
  {
    id: 'backup_system_dead',
    name: 'Backup System Completely Failed',
    condition: 'No successful backup for >48 hours',
    severity: 'critical',
    channels: ['slack', 'email'],
    frequency: 'immediate',
    enabled: true
  },
  {
    id: 'security_breach',
    name: 'Potential Security Breach',
    condition: 'Unauthorized database access detected',
    severity: 'critical',
    channels: ['slack', 'email'],
    frequency: 'immediate',
    enabled: true
  },

  // ⚠️ HIGH PRIORITY (Check soon)
  {
    id: 'backup_failed_once',
    name: 'Daily Backup Failed',
    condition: 'Backup failed (will retry)',
    severity: 'high',
    channels: ['slack'],
    frequency: 'immediate',
    quietHours: { start: '23:00', end: '07:00' },
    enabled: true
  },
  {
    id: 'performance_degraded',
    name: 'Database Performance Issues',
    condition: 'Response time >2 seconds for >10 minutes',
    severity: 'high',
    channels: ['slack'],
    frequency: 'hourly',
    enabled: true
  },
  {
    id: 'storage_warning',
    name: 'Storage Space Low',
    condition: 'Database storage >85% full',
    severity: 'high',
    channels: ['slack'],
    frequency: 'daily',
    enabled: true
  },
  {
    id: 'suspicious_activity',
    name: 'Suspicious Database Activity',
    condition: '>10 failed login attempts in 1 hour',
    severity: 'high',
    channels: ['slack'],
    frequency: 'immediate',
    enabled: true
  },

  // ℹ️ INFORMATIONAL (Daily updates)
  {
    id: 'backup_success',
    name: 'Daily Backup Successful',
    condition: 'Backup completed successfully',
    severity: 'low',
    channels: ['slack'],
    frequency: 'daily',
    quietHours: { start: '22:00', end: '08:00' },
    enabled: true
  },
  {
    id: 'new_business_signup',
    name: 'New Business Profile Created',
    condition: 'New profile with business_name created',
    severity: 'low',
    channels: ['slack'],
    frequency: 'immediate',
    quietHours: { start: '22:00', end: '08:00' },
    enabled: true
  },
  {
    id: 'weekly_report',
    name: 'Weekly System Health Report',
    condition: 'Every Sunday at 9 AM',
    severity: 'low',
    channels: ['slack'],
    frequency: 'weekly',
    enabled: true
  },

  // 🎉 MILESTONES (Celebrate!)
  {
    id: 'business_milestones',
    name: 'Business Count Milestones',
    condition: 'Every 25 businesses (25, 50, 75, 100, etc.)',
    severity: 'low',
    channels: ['slack'],
    frequency: 'immediate',
    enabled: true
  },
  {
    id: 'uptime_achievements',
    name: 'Uptime Achievements',
    condition: '7, 30, 90 days of 99%+ uptime',
    severity: 'low',
    channels: ['slack'],
    frequency: 'immediate',
    enabled: true
  }
]

export class SmartNotificationSystem {
  private lastNotificationTime: Map<string, Date> = new Map()
  private notificationCounts: Map<string, number> = new Map()

  /**
   * Check if notification should be sent based on rules
   */
  shouldSendNotification(ruleId: string, data: any): boolean {
    const rule = NOTIFICATION_RULES.find(r => r.id === ruleId)
    if (!rule || !rule.enabled) return false

    // Check quiet hours
    if (rule.quietHours && this.isQuietHours(rule.quietHours)) {
      // Only send critical alerts during quiet hours
      if (rule.severity !== 'critical') return false
    }

    // Check frequency limits
    const lastSent = this.lastNotificationTime.get(ruleId)
    const now = new Date()

    switch (rule.frequency) {
      case 'immediate':
        return true // Always send immediately
      
      case 'hourly':
        if (!lastSent) return true
        return (now.getTime() - lastSent.getTime()) > (60 * 60 * 1000) // 1 hour
      
      case 'daily':
        if (!lastSent) return true
        return (now.getTime() - lastSent.getTime()) > (24 * 60 * 60 * 1000) // 24 hours
      
      case 'weekly':
        if (!lastSent) return true
        return (now.getTime() - lastSent.getTime()) > (7 * 24 * 60 * 60 * 1000) // 7 days
      
      default:
        return true
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    const startTime = this.parseTime(quietHours.start)
    const endTime = this.parseTime(quietHours.end)
    
    // Handle overnight quiet hours (e.g., 23:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    } else {
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 100 + minutes
  }

  /**
   * Send notification through appropriate channels
   */
  async sendNotification(ruleId: string, data: any): Promise<void> {
    const rule = NOTIFICATION_RULES.find(r => r.id === ruleId)
    if (!rule || !this.shouldSendNotification(ruleId, data)) return

    // Mark notification as sent
    this.lastNotificationTime.set(ruleId, new Date())
    
    // Increment count for rate limiting
    const currentCount = this.notificationCounts.get(ruleId) || 0
    this.notificationCounts.set(ruleId, currentCount + 1)

    // Generate notification content
    const notification = this.generateNotificationContent(ruleId, data)

    // Send through enabled channels
    for (const channel of rule.channels) {
      switch (channel) {
        case 'slack':
          await this.sendSlackNotification(notification, rule.severity)
          break
        case 'email':
          await this.sendEmailNotification(notification, rule.severity)
          break
        case 'sms':
          await this.sendSMSNotification(notification, rule.severity)
          break
      }
    }
  }

  /**
   * Generate notification content based on rule and data
   */
  private generateNotificationContent(ruleId: string, data: any): any {
    const templates = {
      database_outage: {
        emoji: '🚨',
        title: 'DATABASE OUTAGE DETECTED',
        message: `❌ Cannot connect to production database\n⏱️ Detected: ${new Date().toLocaleTimeString()}\n🔧 Action: Check Supabase status immediately\n📞 Escalate if not resolved in 15 minutes`
      },
      
      backup_failed_once: {
        emoji: '⚠️',
        title: 'BACKUP FAILED - FIRST ATTEMPT', 
        message: `❌ Daily backup failed (will retry in 1 hour)\n📋 Error: ${data.error || 'Unknown error'}\n🔧 Action: Check system resources\n⏰ Next retry: ${data.nextRetry || '1 hour'}`
      },
      
      backup_success: {
        emoji: '✅',
        title: 'DAILY BACKUP SUCCESSFUL',
        message: `📦 Database backed up: ${data.size || 'Unknown size'}\n⏱️ Completed: ${new Date().toLocaleTimeString()}\n📊 Profiles: ${data.profileCount || 'Unknown'}\n🗓️ Next backup: Tomorrow 2:00 AM`
      },
      
      new_business_signup: {
        emoji: '🎉',
        title: 'NEW BUSINESS JOINED QWIKKER!',
        message: `👥 Business: "${data.businessName || 'Unknown'}"\n📍 Location: ${data.location || 'Unknown'}\n📊 Total businesses: ${data.totalCount || 'Unknown'}\n🚀 Platform growing strong!`
      },
      
      business_milestones: {
        emoji: '🎉',
        title: 'BUSINESS MILESTONE REACHED!',
        message: `🎯 Milestone: ${data.milestone || 'Unknown'} businesses!\n📈 Latest: "${data.latestBusiness || 'Unknown'}"\n📊 Growth: ${data.growthRate || 'Unknown'}% this month\n🚀 Qwikker is scaling fast!`
      },
      
      weekly_report: {
        emoji: '📈',
        title: 'WEEKLY SYSTEM REPORT',
        message: `📊 Database health: ${data.health || 'Good'}\n📦 Backups: ${data.successfulBackups || '7'}/7 successful\n👥 New businesses: ${data.newBusinesses || '0'} this week\n🚀 Avg response: ${data.avgResponse || '<100'}ms\n💾 Storage: ${data.storageUsed || 'Unknown'}`
      }
    }

    return templates[ruleId as keyof typeof templates] || {
      emoji: '🔔',
      title: 'SYSTEM NOTIFICATION',
      message: `Notification: ${ruleId}\nData: ${JSON.stringify(data)}`
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: any, severity: string): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      console.log('Slack webhook not configured')
      return
    }

    const colors = {
      critical: '#ff0000', // Red
      high: '#ff8c00',     // Orange  
      medium: '#ffd700',   // Yellow
      low: '#00ff00'       // Green
    }

    const payload = {
      text: `${notification.emoji} ${notification.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${notification.emoji} ${notification.title}*\n\n${notification.message}\n\n*Time:* ${new Date().toLocaleString()}`
          }
        }
      ],
      attachments: [
        {
          color: colors[severity as keyof typeof colors] || '#808080',
          footer: 'Qwikker Database Monitor',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        console.log('✅ Slack notification sent successfully')
      } else {
        console.error('❌ Failed to send Slack notification:', response.status)
      }
    } catch (error) {
      console.error('❌ Error sending Slack notification:', error)
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(notification: any, severity: string): Promise<void> {
    console.log('📧 Email notification (not implemented):', notification.title)
    // TODO: Implement email notifications using Resend/SendGrid
  }

  /**
   * Send SMS notification (placeholder)
   */
  private async sendSMSNotification(notification: any, severity: string): Promise<void> {
    console.log('📱 SMS notification (not implemented):', notification.title)
    // TODO: Implement SMS notifications using Twilio
  }
}

// Export singleton instance
export const smartNotifications = new SmartNotificationSystem()

