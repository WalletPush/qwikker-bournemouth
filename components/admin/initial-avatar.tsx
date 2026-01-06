'use client'

interface InitialAvatarProps {
  businessName: string
  className?: string
}

export function InitialAvatar({ businessName, className = "" }: InitialAvatarProps) {
  // Extract initials from business name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '??'
    
    // Filter out words that are only special characters (like &, +, -, etc.)
    // Only keep words that contain at least one letter
    const words = name.trim().split(/\s+/).filter(word => /[a-zA-Z]/.test(word))
    
    if (words.length === 0) {
      // No letter-containing words found, use first character of original name
      return name.charAt(0).toUpperCase()
    }
    
    if (words.length === 1) {
      // Single word - take first 2 letters
      return words[0].substring(0, 2).toUpperCase()
    }
    
    // Multiple words - take first letter of first 2 words that contain letters
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase()
  }

  // Generate consistent color based on business name
  const getAvatarColor = (name: string): string => {
    if (!name) return 'from-slate-600 to-slate-700'
    
    const colors = [
      'from-blue-600 to-blue-700',
      'from-green-600 to-green-700', 
      'from-purple-600 to-purple-700',
      'from-pink-600 to-pink-700',
      'from-indigo-600 to-indigo-700',
      'from-red-600 to-red-700',
      'from-yellow-600 to-yellow-700',
      'from-teal-600 to-teal-700',
      'from-orange-600 to-orange-700',
      'from-cyan-600 to-cyan-700'
    ]
    
    // Use simple hash to get consistent color for same name
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  const initials = getInitials(businessName)
  const colorClass = getAvatarColor(businessName)

  return (
    <div className={`bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold ${className}`}>
      {initials}
    </div>
  )
}
