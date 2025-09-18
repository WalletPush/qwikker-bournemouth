import { FoundingMemberForm } from '@/components/founding-member-form'

interface OnboardingPageProps {
  searchParams: Promise<{ ref?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const referralCode = params.ref || null

  return (
    <div className="min-h-screen bg-slate-950 text-white dark:bg-slate-950 dark:text-white">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <FoundingMemberForm referralCode={referralCode} />
      </div>
    </div>
  )
}
