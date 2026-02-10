import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { defaultFormatting, type AdhkarFormatting } from '@/lib/adhkar-formatting'

const SETTINGS_PATH = join(process.cwd(), 'data', 'adhkar-settings.json')

// Ensure data directory exists
async function ensureDataDir() {
  const { mkdir } = await import('fs/promises')
  const dataDir = join(process.cwd(), 'data')
  try {
    await mkdir(dataDir, { recursive: true })
  } catch {
    // Directory might already exist
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    const data = await readFile(SETTINGS_PATH, 'utf-8')
    const settings = JSON.parse(data) as AdhkarFormatting
    return NextResponse.json(settings)
  } catch {
    // Return default if file doesn't exist
    return NextResponse.json(defaultFormatting)
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataDir()
    const settings = await request.json() as AdhkarFormatting
    
    // Validate settings - ensure all required fields exist
    const validated: AdhkarFormatting = {
      ...defaultFormatting,
      ...settings,
    }
    
    await writeFile(SETTINGS_PATH, JSON.stringify(validated, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, settings: validated })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
