import { UserDashboardLayout } from '@/components/user/user-dashboard-layout'
import { UserBusinessDetailPage } from '@/components/user/user-business-detail-page'

interface BusinessDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { slug } = await params
  
  return (
    <UserDashboardLayout>
      <UserBusinessDetailPage slug={slug} />
    </UserDashboardLayout>
  )
}
