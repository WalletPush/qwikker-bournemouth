/**
 * 🎯 SMART SLACK CHANNEL CONFIGURATION
 * Organize notifications across multiple channels for better focus
 */

export interface SlackChannel {
  id: string
  name: string
  description: string
  webhookUrl: string
  notificationTypes: string[]
  alertLevel: 'critical' | 'operational' | 'business' | 'reporting'
  quietHours?: { start: string; end: string }
  enabled: boolean
}

export const SLACK_CHANNELS: SlackChannel[] = [
  {
    id: 'critical',
    name: '#qwikker-critical',
    description: 'CRITICAL ALERTS ONLY - Database outages, data loss, security breaches',
    webhookUrl: process.env.SLACK_CRITICAL_WEBHOOK || '',
    notificationTypes: [
      'database_outage',
      'massive_data_loss', 
      'backup_system_dead',
      'security_breach',
      'disaster_recovery_needed'
    ],
    alertLevel: 'critical',
    // No quiet hours for critical alerts
    enabled: true
  },
  
  {
    id: 'operations',
    name: '#qwikker-operations',
    description: 'Daily operations - Backups, performance, security warnings',
    webhookUrl: process.env.SLACK_OPERATIONS_WEBHOOK || '',
    notificationTypes: [
      'backup_success',
      'backup_failed_once',
      'performance_degraded',
      'storage_warning',
      'suspicious_activity',
      'system_maintenance',
      'database_slow_queries'
    ],
    alertLevel: 'operational',
    quietHours: { start: '22:00', end: '08:00' },
    enabled: true
  },
  
  {
    id: 'business',
    name: '#qwikker-business',
    description: 'Business growth - New signups, milestones, user activity',
    webhookUrl: process.env.SLACK_BUSINESS_WEBHOOK || '',
    notificationTypes: [
      'new_business_signup',
      'business_milestones',
      'user_activity_spike',
      'revenue_milestones',
      'feature_usage',
      'customer_feedback'
    ],
    alertLevel: 'business',
    quietHours: { start: '20:00', end: '09:00' },
    enabled: true
  },
  
  {
    id: 'reports',
    name: '#qwikker-reports',
    description: 'Weekly/monthly reports and analytics',
    webhookUrl: process.env.SLACK_REPORTS_WEBHOOK || '',
    notificationTypes: [
      'weekly_report',
      'monthly_summary',
      'uptime_achievements',
      'performance_report',
      'security_audit_report',
      'backup_health_report'
    ],
    alertLevel: 'reporting',
    enabled: true
  }
]

/**
 * Alternative: Single channel setup for smaller teams
 */
export const SINGLE_CHANNEL_CONFIG: SlackChannel = {
  id: 'main',
  name: '#qwikker-admin',
  description: 'All Qwikker system notifications',
  webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  notificationTypes: ['*'], // All notification types
  alertLevel: 'critical',
  quietHours: { start: '23:00', end: '07:00' },
  enabled: true
}

export class SlackChannelManager {
  private useMultiChannel: boolean
  
  constructor(useMultiChannel: boolean = true) {
    this.useMultiChannel = useMultiChannel
  }

  /**
   * Get appropriate channel for notification type
   */
  getChannelForNotification(notificationType: string): SlackChannel | null {
    if (!this.useMultiChannel) {
      return SINGLE_CHANNEL_CONFIG.enabled ? SINGLE_CHANNEL_CONFIG : null
    }

    // Find channel that handles this notification type
    const channel = SLACK_CHANNELS.find(channel => 
      channel.enabled && 
      (channel.notificationTypes.includes(notificationType) || 
       channel.notificationTypes.includes('*'))
    )

    return channel || null
  }

  /**
   * Send notification to appropriate channel
   */
  async sendToChannel(
    notificationType: string, 
    notification: any, 
    severity: string
  ): Promise<void> {
    const channel = this.getChannelForNotification(notificationType)
    if (!channel || !channel.webhookUrl) {
      console.log(`No channel configured for notification: ${notificationType}`)
      return
    }

    // Check quiet hours for non-critical channels
    if (channel.alertLevel !== 'critical' && channel.quietHours) {
      if (this.isQuietHours(channel.quietHours) && severity !== 'critical') {
        console.log(`Skipping notification during quiet hours: ${notificationType}`)
        return
      }
    }

    await this.sendSlackMessage(channel, notification, severity)
  }

  /**
   * Send message to specific Slack channel
   */
  private async sendSlackMessage(
    channel: SlackChannel, 
    notification: any, 
    severity: string
  ): Promise<void> {
    const colors = {
      critical: '#ff0000', // Red
      high: '#ff8c00',     // Orange  
      medium: '#ffd700',   // Yellow
      low: '#00ff00'       // Green
    }

    // Add channel context to message
    const channelPrefix = this.getChannelPrefix(channel.alertLevel)
    
    const payload = {
      text: `${channelPrefix} ${notification.emoji} ${notification.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${notification.emoji} ${notification.title}*\n\n${notification.message}\n\n*Time:* ${new Date().toLocaleString()}\n*Channel:* ${channel.name}`
          }
        }
      ],
      attachments: [
        {
          color: colors[severity as keyof typeof colors] || '#808080',
          footer: `Qwikker ${channel.alertLevel.toUpperCase()} Monitor`,
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    try {
      const response = await fetch(channel.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (response.ok) {
        console.log(`✅ Slack notification sent to ${channel.name}`)
      } else {
        console.error(`❌ Failed to send to ${channel.name}:`, response.status)
      }
    } catch (error) {
      console.error(`❌ Error sending to ${channel.name}:`, error)
    }
  }

  /**
   * Get channel prefix emoji
   */
  private getChannelPrefix(alertLevel: string): string {
    switch (alertLevel) {
      case 'critical': return '🚨'
      case 'operational': return '⚙️'
      case 'business': return '📈'
      case 'reporting': return '📊'
      default: return '🔔'
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
   * Test all configured channels
   */
  async testAllChannels(): Promise<void> {
    const channels = this.useMultiChannel ? SLACK_CHANNELS : [SINGLE_CHANNEL_CONFIG]
    
    for (const channel of channels) {
      if (channel.enabled && channel.webhookUrl) {
        const testNotification = {
          emoji: '🧪',
          title: `TEST - ${channel.name.toUpperCase()}`,
          message: `This is a test notification for ${channel.name}\n\n*Description:* ${channel.description}\n*Alert Level:* ${channel.alertLevel}\n*Notification Types:* ${channel.notificationTypes.join(', ')}`
        }
        
        await this.sendSlackMessage(channel, testNotification, 'low')
      }
    }
  }
}

// Export singleton instance
export const slackChannels = new SlackChannelManager()

