import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/client'
import { DEFAULT_SECTIONS, type PromptSections, SECTION_KEYS } from '@/lib/hsnyojz/prompt-config'

export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ sections: DEFAULT_SECTIONS })
    }

    const { data, error } = await supabase
      .from('hsnyojz_prompt')
      .select('sections, updated_at')
      .eq('id', 'default')
      .single()

    if (error || !data) {
      return NextResponse.json({ sections: DEFAULT_SECTIONS })
    }

    const merged = { ...DEFAULT_SECTIONS, ...(data.sections as Partial<PromptSections>) }
    return NextResponse.json({ sections: merged, updated_at: data.updated_at })
  } catch {
    return NextResponse.json({ sections: DEFAULT_SECTIONS })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const body = await request.json()
    const incoming = body.sections as Partial<PromptSections>
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Missing sections object' }, { status: 400 })
    }

    const cleaned: Record<string, string> = {}
    for (const key of SECTION_KEYS) {
      if (typeof incoming[key] === 'string') {
        cleaned[key] = incoming[key]
      }
    }

    const { data, error } = await supabase
      .from('hsnyojz_prompt')
      .upsert({
        id: 'default',
        sections: cleaned,
        updated_at: new Date().toISOString(),
      })
      .select('sections, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const merged = { ...DEFAULT_SECTIONS, ...(data.sections as Partial<PromptSections>) }
    return NextResponse.json({ sections: merged, updated_at: data.updated_at })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
