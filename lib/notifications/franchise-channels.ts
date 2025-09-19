/**
 * 🏢 FRANCHISE-SCALE SLACK CHANNEL CONFIGURATION
 * Multi-channel notification system designed for 26+ franchises
 */

export interface FranchiseChannel {
  id: string
  name: string
  description: string
  audience: 'technical' | 'business' | 'executive' | 'franchise' | 'city-specific'
  webhookUrl: string
  notificationTypes: string[]
  alertLevel: 'critical' | 'high' | 'medium' | 'low'
  quietHours?: { start: string; end: string }
  enabled: boolean
  cityFilter?: string // For city-specific channels
}

export const FRANCHISE_CHANNELS: FranchiseChannel[] = [
  // 🚨 TECHNICAL CHANNELS (Your Development Team)
  {
    id: 'critical',
    name: '#qwikker-critical',
    description: 'CRITICAL SYSTEM ALERTS - Database outages, data loss, security breaches',
    audience: 'technical',
    webhookUrl: process.env.SLACK_CRITICAL_WEBHOOK || '',
    notificationTypes: [
      'database_outage',
      'massive_data_loss',
      'backup_system_dead',
      'security_breach',
      'system_compromised',
      'data_corruption'
    ],
    alertLevel: 'critical',
    // No quiet hours for critical alerts
    enabled: true
  },

  {
    id: 'operations',
    name: '#qwikker-operations',
    description: 'Daily system operations - Backups, performance, maintenance',
    audience: 'technical',
    webhookUrl: process.env.SLACK_OPERATIONS_WEBHOOK || '',
    notificationTypes: [
      'backup_success',
      'backup_failed_once',
      'performance_degraded',
      'storage_warning',
      'maintenance_scheduled',
      'system_update_complete',
      'database_slow_queries'
    ],
    alertLevel: 'medium',
    quietHours: { start: '22:00', end: '08:00' },
    enabled: true
  },

  {
    id: 'security',
    name: '#qwikker-security',
    description: 'Security monitoring - Suspicious activity, access attempts, compliance',
    audience: 'technical',
    webhookUrl: process.env.SLACK_SECURITY_WEBHOOK || '',
    notificationTypes: [
      'suspicious_activity',
      'failed_login_attempts',
      'unauthorized_access',
      'security_scan_results',
      'compliance_alert',
      'unusual_traffic_pattern'
    ],
    alertLevel: 'high',
    quietHours: { start: '23:00', end: '07:00' },
    enabled: true
  },

  // 📈 BUSINESS CHANNELS (Franchise & Executive Team)
  {
    id: 'growth',
    name: '#qwikker-growth',
    description: 'Business growth tracking - New signups, city performance, metrics',
    audience: 'business',
    webhookUrl: process.env.SLACK_GROWTH_WEBHOOK || '',
    notificationTypes: [
      'new_business_signup',
      'daily_signup_summary',
      'city_performance_update',
      'conversion_rate_change',
      'user_engagement_spike',
      'revenue_milestone'
    ],
    alertLevel: 'low',
    quietHours: { start: '20:00', end: '09:00' },
    enabled: true
  },

  {
    id: 'milestones',
    name: '#qwikker-milestones',
    description: 'Major achievements - Franchise launches, big milestones, celebrations',
    audience: 'executive',
    webhookUrl: process.env.SLACK_MILESTONES_WEBHOOK || '',
    notificationTypes: [
      'business_milestones',
      'franchise_launch',
      'city_milestone',
      'platform_milestone',
      'uptime_achievements',
      'team_achievements'
    ],
    alertLevel: 'low',
    enabled: true
  },

  {
    id: 'reports',
    name: '#qwikker-reports',
    description: 'Executive reporting - Weekly summaries, monthly reports, analytics',
    audience: 'executive',
    webhookUrl: process.env.SLACK_REPORTS_WEBHOOK || '',
    notificationTypes: [
      'weekly_report',
      'monthly_summary',
      'quarterly_review',
      'franchise_performance_report',
      'system_health_report',
      'financial_summary'
    ],
    alertLevel: 'low',
    enabled: true
  },

  // 🏢 FRANCHISE CHANNELS (Future Expansion)
  {
    id: 'franchise-alerts',
    name: '#qwikker-franchise-alerts',
    description: 'Franchise owner notifications - Issues affecting their city',
    audience: 'franchise',
    webhookUrl: process.env.SLACK_FRANCHISE_WEBHOOK || '',
    notificationTypes: [
      'city_system_issue',
      'city_performance_alert',
      'franchise_specific_update',
      'local_compliance_issue'
    ],
    alertLevel: 'medium',
    quietHours: { start: '22:00', end: '08:00' },
    enabled: false // Enable when franchise system is ready
  }
]

/**
 * City-specific channels for individual franchise management
 */
export const CITY_CHANNELS = [
  'bournemouth', 'london', 'manchester', 'birmingham', 'leeds', 'liverpool',
  'bristol', 'sheffield', 'newcastle', 'nottingham', 'cardiff', 'edinburgh',
  'glasgow', 'belfast', 'brighton', 'cambridge', 'oxford', 'bath', 'york',
  'chester', 'canterbury', 'exeter', 'norwich', 'southampton', 'portsmouth', 'reading'
]

export class FranchiseNotificationManager {
  /**
   * Get appropriate channels for notification type and audience
   */
  getChannelsForNotification(
    notificationType: string, 
    targetAudience?: string[],
    cityFilter?: string
  ): FranchiseChannel[] {
    let channels = FRANCHISE_CHANNELS.filter(channel => 
      channel.enabled && 
      channel.notificationTypes.includes(notificationType)
    )

    // Filter by audience if specified
    if (targetAudience && targetAudience.length > 0) {
      channels = channels.filter(channel => 
        targetAudience.includes(channel.audience)
      )
    }

    // Filter by city if specified
    if (cityFilter) {
      channels = channels.filter(channel => 
        !channel.cityFilter || channel.cityFilter === cityFilter
      )
    }

    return channels
  }

  /**
   * Send notification to multiple appropriate channels
   */
  async sendFranchiseNotification(
    notificationType: string,
    notification: any,
    severity: string,
    options: {
      targetAudience?: string[]
      cityFilter?: string
      urgentOverride?: boolean
    } = {}
  ): Promise<void> {
    const channels = this.getChannelsForNotification(
      notificationType,
      options.targetAudience,
      options.cityFilter
    )

    if (channels.length === 0) {
      console.log(`No channels configured for notification: ${notificationType}`)
      return
    }

    // Send to all appropriate channels
    const sendPromises = channels.map(channel => 
      this.sendToChannel(channel, notification, severity, options.urgentOverride)
    )

    await Promise.allSettled(sendPromises)
  }

  /**
   * Send to specific channel with franchise context
   */
  private async sendToChannel(
    channel: FranchiseChannel,
    notification: any,
    severity: string,
    urgentOverride: boolean = false
  ): Promise<void> {
    if (!channel.webhookUrl) {
      console.log(`No webhook configured for channel: ${channel.name}`)
      return
    }

    // Check quiet hours (unless urgent override or critical)
    if (!urgentOverride && 
        severity !== 'critical' && 
        channel.quietHours && 
        this.isQuietHours(channel.quietHours)) {
      console.log(`Skipping notification during quiet hours: ${channel.name}`)
      return
    }

    const colors = {
      critical: '#ff0000', // Red
      high: '#ff8c00',     // Orange  
      medium: '#ffd700',   // Yellow
      low: '#00ff00'       // Green
    }

    // Add franchise context to message
    const franchiseContext = this.getFranchiseContext(channel)
    
    const payload = {
      text: `${franchiseContext.emoji} ${notification.emoji} ${notification.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${notification.emoji} ${notification.title}*\n\n${notification.message}\n\n*Audience:* ${franchiseContext.audience}\n*Time:* ${new Date().toLocaleString()}`
          }
        }
      ],
      attachments: [
        {
          color: colors[severity as keyof typeof colors] || '#808080',
          footer: `Qwikker ${franchiseContext.type} Monitor`,
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
        console.log(`✅ Franchise notification sent to ${channel.name}`)
      } else {
        console.error(`❌ Failed to send to ${channel.name}:`, response.status)
      }
    } catch (error) {
      console.error(`❌ Error sending to ${channel.name}:`, error)
    }
  }

  /**
   * Get franchise context for channel
   */
  private getFranchiseContext(channel: FranchiseChannel): any {
    const contexts = {
      technical: { emoji: '⚙️', audience: 'Technical Team', type: 'SYSTEM' },
      business: { emoji: '📈', audience: 'Business Team', type: 'GROWTH' },
      executive: { emoji: '📊', audience: 'Executive Team', type: 'EXECUTIVE' },
      franchise: { emoji: '🏢', audience: 'Franchise Owners', type: 'FRANCHISE' },
      'city-specific': { emoji: '🏙️', audience: 'City Team', type: 'CITY' }
    }

    return contexts[channel.audience] || { emoji: '🔔', audience: 'General', type: 'SYSTEM' }
  }

  /**
   * Check quiet hours
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
   * Send franchise-wide announcement
   */
  async sendFranchiseAnnouncement(
    title: string,
    message: string,
    targetChannels: string[] = ['growth', 'milestones', 'reports']
  ): Promise<void> {
    const announcement = {
      emoji: '📢',
      title: `FRANCHISE ANNOUNCEMENT: ${title}`,
      message: `${message}\n\n*Sent to all franchise stakeholders*`
    }

    const channels = FRANCHISE_CHANNELS.filter(channel => 
      targetChannels.includes(channel.id) && channel.enabled
    )

    for (const channel of channels) {
      await this.sendToChannel(channel, announcement, 'medium', true)
    }
  }

  /**
   * Test all franchise channels
   */
  async testFranchiseChannels(): Promise<void> {
    console.log('🧪 Testing franchise notification system...')
    
    for (const channel of FRANCHISE_CHANNELS) {
      if (channel.enabled && channel.webhookUrl) {
        const testNotification = {
          emoji: '🧪',
          title: `FRANCHISE TEST - ${channel.name.toUpperCase()}`,
          message: `Testing ${channel.name}\n\n*Audience:* ${channel.audience}\n*Description:* ${channel.description}\n*Alert Level:* ${channel.alertLevel}\n\n*This channel will receive:*\n${channel.notificationTypes.map(type => `• ${type}`).join('\n')}`
        }
        
        await this.sendToChannel(channel, testNotification, 'low', true)
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log('✅ Franchise channel testing complete!')
  }
}

// Export singleton instance
export const franchiseNotifications = new FranchiseNotificationManager()

