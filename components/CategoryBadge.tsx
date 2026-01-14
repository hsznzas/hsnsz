'use client'

import type { Category } from '@/lib/supabase/types'
import { CATEGORY_COLORS } from '@/lib/supabase/types'

interface CategoryBadgeProps {
  category: Category
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {category}
    </span>
  )
}
