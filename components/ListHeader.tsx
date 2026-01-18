'use client'

import { useState, useEffect, forwardRef } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  Pencil, 
  X, 
  Save,
  Folder,
  Briefcase,
  User,
  Code,
  Target,
  Star,
  Heart,
  Zap,
  Flame,
  Rocket,
  Coffee,
  Book,
  Music,
  Camera,
  Mail,
  Phone,
  Home,
  Settings,
  Globe,
  Award,
  GripVertical,
  type LucideIcon
} from 'lucide-react'

export type SortOption = 'manual' | 'priority' | 'due_date' | 'name' | 'created'

// Available icons for lists
const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: 'folder', icon: Folder },
  { name: 'briefcase', icon: Briefcase },
  { name: 'user', icon: User },
  { name: 'code', icon: Code },
  { name: 'target', icon: Target },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'zap', icon: Zap },
  { name: 'flame', icon: Flame },
  { name: 'rocket', icon: Rocket },
  { name: 'coffee', icon: Coffee },
  { name: 'book', icon: Book },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'mail', icon: Mail },
  { name: 'phone', icon: Phone },
  { name: 'home', icon: Home },
  { name: 'settings', icon: Settings },
  { name: 'globe', icon: Globe },
  { name: 'award', icon: Award },
]

// Available colors for list headers
const COLOR_OPTIONS = [
  { name: 'slate', bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', accent: 'bg-slate-500' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', accent: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', accent: 'bg-orange-500' },
  { name: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', accent: 'bg-amber-500' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800', accent: 'bg-yellow-500' },
  { name: 'lime', bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800', accent: 'bg-lime-500' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', accent: 'bg-green-500' },
  { name: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', accent: 'bg-emerald-500' },
  { name: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', accent: 'bg-teal-500' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', accent: 'bg-cyan-500' },
  { name: 'sky', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', accent: 'bg-sky-500' },
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', accent: 'bg-blue-500' },
  { name: 'indigo', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', accent: 'bg-indigo-500' },
  { name: 'violet', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800', accent: 'bg-violet-500' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', accent: 'bg-purple-500' },
  { name: 'fuchsia', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800', accent: 'bg-fuchsia-500' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800', accent: 'bg-pink-500' },
  { name: 'rose', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', accent: 'bg-rose-500' },
]

// Default icon assignments for categories
const DEFAULT_ICONS: Record<string, string> = {
  'Sinjab': 'briefcase',
  'Ajdel': 'rocket',
  'Personal': 'user',
  'Haseeb': 'code',
  'Raqeeb': 'target',
}

// Default color assignments for categories  
const DEFAULT_COLORS: Record<string, string> = {
  'Sinjab': 'purple',
  'Ajdel': 'blue',
  'Personal': 'green',
  'Haseeb': 'orange',
  'Raqeeb': 'pink',
}

export interface ListCustomization {
  name: string
  color: string
  icon: string
  sortBy: SortOption
}

interface ListHeaderProps {
  categoryKey: string
  defaultName: string
  remainingCount: number
  isExpanded: boolean
  onToggleExpand: () => void
  // Drag handle props from @dnd-kit
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLElement>
    listeners: React.DOMAttributes<HTMLElement> | undefined
  }
  isDragging?: boolean
}

// Get stored list customizations from localStorage
function getListCustomizations(): Record<string, ListCustomization> {
  if (typeof window === 'undefined') return {}
  const stored = localStorage.getItem('list-customizations')
  return stored ? JSON.parse(stored) : {}
}

// Save list customizations to localStorage
function saveListCustomizations(customizations: Record<string, ListCustomization>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('list-customizations', JSON.stringify(customizations))
}

export function ListHeader({ 
  categoryKey, 
  defaultName, 
  remainingCount, 
  isExpanded, 
  onToggleExpand,
  dragHandleProps,
  isDragging = false,
}: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [customization, setCustomization] = useState<ListCustomization>({
    name: defaultName,
    color: DEFAULT_COLORS[categoryKey] || 'slate',
    icon: DEFAULT_ICONS[categoryKey] || 'folder',
    sortBy: 'manual',
  })
  const [editName, setEditName] = useState(customization.name)
  const [editColor, setEditColor] = useState(customization.color)
  const [editIcon, setEditIcon] = useState(customization.icon)

  // Load customization on mount
  useEffect(() => {
    const stored = getListCustomizations()
    if (stored[categoryKey]) {
      setCustomization(stored[categoryKey])
      setEditName(stored[categoryKey].name)
      setEditColor(stored[categoryKey].color)
      setEditIcon(stored[categoryKey].icon)
    }
  }, [categoryKey])

  const colorConfig = COLOR_OPTIONS.find(c => c.name === customization.color) || COLOR_OPTIONS[0]
  const IconComponent = ICON_OPTIONS.find(i => i.name === customization.icon)?.icon || Folder

  const handleSave = () => {
    const newCustomization: ListCustomization = {
      name: editName.trim() || defaultName,
      color: editColor,
      icon: editIcon,
      sortBy: customization.sortBy,
    }
    setCustomization(newCustomization)
    
    const allCustomizations = getListCustomizations()
    allCustomizations[categoryKey] = newCustomization
    saveListCustomizations(allCustomizations)
    
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditName(customization.name)
    setEditColor(customization.color)
    setEditIcon(customization.icon)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className={`p-4 border-b ${colorConfig.border} ${colorConfig.bg} rounded-t-xl space-y-3`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Edit List</span>
          <button onClick={handleCancel} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Name Input */}
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="List name"
          autoFocus
        />

        {/* Color Selection */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map(color => (
              <button
                key={color.name}
                onClick={() => setEditColor(color.name)}
                className={`w-6 h-6 rounded-full ${color.accent} ${
                  editColor === color.name ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500' : ''
                } transition-all hover:scale-110`}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Icon Selection */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => setEditIcon(name)}
                className={`p-1.5 rounded-lg transition-all ${
                  editIcon === name 
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title={name}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button 
            onClick={handleCancel} 
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`p-4 border-b ${colorConfig.border} ${colorConfig.bg} rounded-t-xl flex justify-between items-center group transition-colors ${isDragging ? 'opacity-50 shadow-2xl' : 'hover:brightness-95 dark:hover:brightness-110'}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        {dragHandleProps && (
          <button
            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-white/50 dark:hover:bg-black/20 transition-all touch-none"
            title="Drag to reorder"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </button>
        )}
        
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={onToggleExpand}
        >
          <IconComponent className={`w-5 h-5 ${colorConfig.text}`} />
          <h3 className={`font-bold text-lg ${colorConfig.text}`}>{customization.name}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/50 dark:hover:bg-black/20 transition-all"
            title="Edit list"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          {remainingCount} remaining
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        )}
      </div>
    </div>
  )
}
