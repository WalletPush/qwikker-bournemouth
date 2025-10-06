'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BackupStatus {
  date: string
  size: string
  status: 'success' | 'failed' | 'running'
  files: number
  types: string[]
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'critical'
  backups: 'healthy' | 'warning' | 'critical'
  performance: 'healthy' | 'warning' | 'critical'
  lastCheck: string
}

export function AdminMonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    backups: 'healthy', 
    performance: 'healthy',
    lastCheck: new Date().toISOString()
  })

  const [recentBackups, setRecentBackups] = useState<BackupStatus[]>([
    {
      date: '2025-01-20',
      size: '45.2 MB',
      status: 'success',
      files: 4,
      types: ['Full', 'Schema', 'Data', 'Critical']
    },
    {
      date: '2025-01-19', 
      size: '44.8 MB',
      status: 'success',
      files: 4,
      types: ['Full', 'Schema', 'Data', 'Critical']
    },
    {
      date: '2025-01-18',
      size: '44.1 MB', 
      status: 'success',
      files: 4,
      types: ['Full', 'Schema', 'Data', 'Critical']
    }
  ])

  const [alerts, setAlerts] = useState([
    {
      id: '1',
      severity: 'info' as const,
      message: 'Daily backup completed successfully',
      timestamp: '2025-01-20 02:15:00',
      resolved: true
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400' 
      case 'critical': return 'text-red-400'
      case 'success': return 'text-green-400'
      case 'failed': return 'text-red-400'
      case 'running': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'critical':
      case 'failed':
        return '❌'
      case 'running':
        return '🔄'
      default:
        return '❓'
    }
  }

  const runBackupNow = async () => {
    // This would trigger the backup script
    console.log('Triggering manual backup...')
    // In reality, this would call an API endpoint that runs the backup script
  }

  const runHealthCheck = async () => {
    console.log('Running health check...')
    setSystemHealth(prev => ({
      ...prev,
      lastCheck: new Date().toISOString()
    }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Database Monitoring</h1>
            <p className="text-slate-400">Real-time database health and backup status</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={runHealthCheck}
              className="bg-blue-600 hover:bg-blue-700"
            >
              🔍 Health Check
            </Button>
            <Button 
              onClick={runBackupNow}
              className="bg-green-600 hover:bg-green-700"
            >
              📦 Backup Now
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className={getStatusColor(systemHealth.database)}>
                  {getStatusIcon(systemHealth.database)}
                </span>
                Database Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth.database)}`}>
                {systemHealth.database.toUpperCase()}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Connection: Active
              </p>
              <p className="text-slate-400 text-sm">
                Response: &lt;100ms
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className={getStatusColor(systemHealth.backups)}>
                  {getStatusIcon(systemHealth.backups)}
                </span>
                Backup Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth.backups)}`}>
                {systemHealth.backups.toUpperCase()}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Last backup: Today 2:15 AM
              </p>
              <p className="text-slate-400 text-sm">
                Next backup: Tomorrow 2:00 AM
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className={getStatusColor(systemHealth.performance)}>
                  {getStatusIcon(systemHealth.performance)}
                </span>
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${getStatusColor(systemHealth.performance)}`}>
                {systemHealth.performance.toUpperCase()}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Avg query: 85ms
              </p>
              <p className="text-slate-400 text-sm">
                Storage: 12% used
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Backups */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl">Recent Backups</CardTitle>
            <p className="text-slate-400">Last 7 days of automated backups</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBackups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl ${getStatusColor(backup.status)}`}>
                      {getStatusIcon(backup.status)}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{backup.date}</p>
                      <p className="text-slate-400 text-sm">
                        {backup.files} files • {backup.types.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-200">{backup.size}</p>
                    <p className={`text-sm capitalize ${getStatusColor(backup.status)}`}>
                      {backup.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl">System Alerts</CardTitle>
            <p className="text-slate-400">Recent monitoring alerts and notifications</p>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent alerts</p>
                <p className="text-slate-500 text-sm">System is running smoothly</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-lg">
                      {alert.severity === 'info' ? 'ℹ️' : 
                       alert.severity === 'warning' ? '⚠️' : 
                       alert.severity === 'error' ? '❌' : '🔔'}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-200">{alert.message}</p>
                      <p className="text-slate-400 text-sm">{alert.timestamp}</p>
                    </div>
                    {alert.resolved && (
                      <span className="text-green-400 text-sm">✅ Resolved</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <p className="text-slate-400">Emergency and maintenance operations</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="bg-green-600 hover:bg-green-700 h-auto py-4"
                onClick={runBackupNow}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">📦</div>
                  <div className="font-semibold">Manual Backup</div>
                  <div className="text-xs opacity-75">Create backup now</div>
                </div>
              </Button>
              
              <Button 
                className="bg-blue-600 hover:bg-blue-700 h-auto py-4"
                onClick={runHealthCheck}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🔍</div>
                  <div className="font-semibold">Health Check</div>
                  <div className="text-xs opacity-75">Run diagnostics</div>
                </div>
              </Button>
              
              <Button 
                className="bg-yellow-600 hover:bg-yellow-700 h-auto py-4"
                onClick={() => window.open('/admin/monitoring/logs', '_blank')}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">📋</div>
                  <div className="font-semibold">View Logs</div>
                  <div className="text-xs opacity-75">System activity</div>
                </div>
              </Button>
              
              <Button 
                className="bg-red-600 hover:bg-red-700 h-auto py-4"
                onClick={() => {
                  if (confirm('Are you sure you want to access disaster recovery? This should only be used in emergencies.')) {
                    alert('In a real emergency, run: ./scripts/disaster-recovery.sh from your terminal')
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🚨</div>
                  <div className="font-semibold">Emergency</div>
                  <div className="text-xs opacity-75">Disaster recovery</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <div className="text-center text-slate-400 text-sm">
          Last updated: {new Date(systemHealth.lastCheck).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

