'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Save, 
  Bold, 
  Italic, 
  Palette, 
  SplitSquareVertical,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useAdhkarContent, type AdhkarContent } from '@/lib/hooks/useAdhkarContent'
import { FormattedText, formatHelpers } from '@/lib/adhkar-formatter'
import type { Dhikr } from '@/lib/adhkar-data'

const PRESET_COLORS = [
  { name: 'أخضر', value: '#059669' },
  { name: 'أزرق', value: '#2563eb' },
  { name: 'أحمر', value: '#dc2626' },
  { name: 'برتقالي', value: '#ea580c' },
  { name: 'بنفسجي', value: '#7c3aed' },
  { name: 'ذهبي', value: '#ca8a04' },
]

type TabType = 'exit' | 'morningEvening'

export default function AdhkarEditPage() {
  const { content, isLoading, saveContent, setContent } = useAdhkarContent()
  const [activeTab, setActiveTab] = useState<TabType>('exit')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentList = activeTab === 'exit' ? content.exit : content.morningEvening

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    const success = await saveContent(content)
    
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
    setIsSaving(false)
  }

  const updateDhikr = (id: number, updates: Partial<Dhikr>) => {
    setContent((prev: AdhkarContent) => {
      const key = activeTab === 'exit' ? 'exit' : 'morningEvening'
      return {
        ...prev,
        [key]: prev[key].map((d: Dhikr) => 
          d.id === id ? { ...d, ...updates } : d
        )
      }
    })
  }

  const addDhikr = () => {
    const key = activeTab === 'exit' ? 'exit' : 'morningEvening'
    const maxId = Math.max(...content[key].map((d: Dhikr) => d.id), 0)
    const newDhikr: Dhikr = {
      id: maxId + 1,
      text: 'نص جديد',
      note: '',
      repetitions: undefined,
      category: 'both'
    }
    setContent((prev: AdhkarContent) => ({
      ...prev,
      [key]: [...prev[key], newDhikr]
    }))
    setEditingId(newDhikr.id)
  }

  const deleteDhikr = (id: number) => {
    if (!confirm('هل تريد حذف هذا الذكر؟')) return
    const key = activeTab === 'exit' ? 'exit' : 'morningEvening'
    setContent((prev: AdhkarContent) => ({
      ...prev,
      [key]: prev[key].filter((d: Dhikr) => d.id !== id)
    }))
    setEditingId(null)
  }

  const moveDhikr = (id: number, direction: 'up' | 'down') => {
    const key = activeTab === 'exit' ? 'exit' : 'morningEvening'
    const list = [...content[key]]
    const index = list.findIndex((d: Dhikr) => d.id === id)
    
    if (direction === 'up' && index > 0) {
      [list[index], list[index - 1]] = [list[index - 1], list[index]]
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index], list[index + 1]] = [list[index + 1], list[index]]
    }
    
    setContent((prev: AdhkarContent) => ({
      ...prev,
      [key]: list
    }))
  }

  const applyFormat = (type: 'bold' | 'italic' | 'lineBreak' | 'color', color?: string) => {
    const textarea = textareaRef.current
    if (!textarea || editingId === null) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentDhikr = currentList.find((d: Dhikr) => d.id === editingId)
    if (!currentDhikr) return

    let result: { text: string; cursor: number }

    switch (type) {
      case 'bold':
        result = formatHelpers.bold(currentDhikr.text, start, end)
        break
      case 'italic':
        result = formatHelpers.italic(currentDhikr.text, start, end)
        break
      case 'color':
        result = formatHelpers.color(currentDhikr.text, start, end, color || '#059669')
        setShowColorPicker(false)
        break
      case 'lineBreak':
        result = formatHelpers.lineBreak(currentDhikr.text, start)
        break
      default:
        return
    }

    updateDhikr(editingId, { text: result.text })
    
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(result.cursor, result.cursor)
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  const editingDhikr = editingId !== null ? currentList.find((d: Dhikr) => d.id === editingId) : null

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/car"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              aria-label="Back"
            >
              <ArrowRight size={20} className="rotate-180" />
            </Link>
            <h1 className="text-xl font-bold">تعديل محتوى الأذكار</h1>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check size={16} />
                تم الحفظ!
              </>
            ) : (
              <>
                <Save size={16} />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 pb-4 flex gap-2">
          <button
            onClick={() => { setActiveTab('exit'); setEditingId(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'exit'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            أذكار الخروج
          </button>
          <button
            onClick={() => { setActiveTab('morningEvening'); setEditingId(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'morningEvening'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            أذكار الصباح والمساء
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* List Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">قائمة الأذكار</h2>
              <button
                onClick={addDhikr}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors text-sm"
              >
                <Plus size={16} />
                إضافة ذكر
              </button>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {currentList.map((dhikr: Dhikr, index: number) => (
                <div
                  key={dhikr.id}
                  onClick={() => setEditingId(dhikr.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-colors ${
                    editingId === dhikr.id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-emerald-500'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveDhikr(dhikr.id, 'up') }}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveDhikr(dhikr.id, 'down') }}
                          disabled={index === currentList.length - 1}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                    <p 
                      dir="rtl" 
                      className="flex-1 text-sm line-clamp-2"
                      style={{ fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui' }}
                    >
                      {dhikr.text.slice(0, 100)}...
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteDhikr(dhikr.id) }}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor Panel */}
          <div className="space-y-4">
            {editingDhikr ? (
              <>
                <h2 className="font-semibold">تعديل الذكر</h2>
                
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900">
                  <button
                    onClick={() => applyFormat('bold')}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="عريض **نص**"
                  >
                    <Bold size={18} />
                  </button>
                  <button
                    onClick={() => applyFormat('italic')}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="مائل *نص*"
                  >
                    <Italic size={18} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="لون النص"
                    >
                      <Palette size={18} />
                    </button>
                    {showColorPicker && (
                      <div className="absolute top-full left-0 mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => applyFormat('color', c.value)}
                              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <span
                                className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-700"
                                style={{ backgroundColor: c.value }}
                              />
                              <span className="text-xs">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => applyFormat('lineBreak')}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="سطر جديد"
                  >
                    <SplitSquareVertical size={18} />
                  </button>
                </div>

                {/* Text Editor */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    نص الذكر
                  </label>
                  <textarea
                    ref={textareaRef}
                    dir="rtl"
                    value={editingDhikr.text}
                    onChange={(e) => updateDhikr(editingDhikr.id, { text: e.target.value })}
                    className="w-full h-48 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    style={{ 
                      fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui',
                      fontSize: '18px',
                      lineHeight: 1.8
                    }}
                  />
                </div>

                {/* Note Editor */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    ملاحظة (اختياري)
                  </label>
                  <textarea
                    dir="rtl"
                    value={editingDhikr.note || ''}
                    onChange={(e) => updateDhikr(editingDhikr.id, { note: e.target.value })}
                    className="w-full h-24 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    style={{ 
                      fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui',
                      fontSize: '16px',
                      lineHeight: 1.6
                    }}
                  />
                </div>

                {/* Repetitions */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    عدد التكرار
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingDhikr.repetitions || ''}
                    onChange={(e) => updateDhikr(editingDhikr.id, { 
                      repetitions: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    placeholder="اتركه فارغاً إذا لم يكن هناك تكرار محدد"
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-600 dark:text-slate-400">
                    معاينة
                  </label>
                  <div 
                    dir="rtl"
                    className="p-6 rounded-xl bg-[#faf8f5] dark:bg-[#1a1a1a]"
                    style={{ fontFamily: '"Geeza Pro", "Noto Sans Arabic", system-ui' }}
                  >
                    <FormattedText 
                      text={editingDhikr.text}
                      baseStyle={{
                        fontSize: '22px',
                        lineHeight: 2,
                        color: 'inherit'
                      }}
                    />
                    {editingDhikr.note && (
                      <p className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-base">
                        {editingDhikr.note}
                      </p>
                    )}
                    {editingDhikr.repetitions && (
                      <span className="inline-block mt-4 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        {editingDhikr.repetitions} مرة
                      </span>
                    )}
                  </div>
                </div>

                {/* Format Guide */}
                <div className="p-4 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 text-sm">
                  <p className="font-medium mb-2">دليل التنسيق:</p>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    <li><code className="px-1 bg-slate-300 dark:bg-slate-700 rounded">**نص**</code> = <strong>عريض</strong></li>
                    <li><code className="px-1 bg-slate-300 dark:bg-slate-700 rounded">*نص*</code> = <em>مائل</em></li>
                    <li><code className="px-1 bg-slate-300 dark:bg-slate-700 rounded">{'{#ff0000}'}نص{'{/}'}</code> = <span style={{color: '#ff0000'}}>ملون</span></li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                اختر ذكراً من القائمة للتعديل
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
