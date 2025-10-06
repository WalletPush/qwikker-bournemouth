import { SimplifiedOnboardingForm } from '@/components/simplified-onboarding-form'

interface OnboardingPageProps {
  searchParams: Promise<{ ref?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const referralCode = params.ref || null

  return <SimplifiedOnboardingForm referralCode={referralCode} />
}
