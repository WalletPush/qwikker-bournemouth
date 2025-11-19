'use client'

import { QRAnalyticsDetailed } from './qr-analytics-detailed'

interface QRAnalyticsDashboardProps {
  city: string
  cityDisplayName: string
  businessFilter?: string
}

export function QRAnalyticsDashboard({ city, cityDisplayName, businessFilter }: QRAnalyticsDashboardProps) {
  // Simply render the new detailed analytics component
  return <QRAnalyticsDetailed city={city} />
}
