import { FoundingMemberForm } from '@/components/founding-member-form'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white dark:bg-slate-950 dark:text-white">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <FoundingMemberForm />
      </div>
    </div>
  )
}
